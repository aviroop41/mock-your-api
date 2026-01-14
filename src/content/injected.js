/**
 * Injected Script - Overrides fetch and XMLHttpRequest to intercept requests
 * 
 * This script runs in the page context and intercepts network requests,
 * communicating with the content script to check for mock rules.
 */

(function() {
  'use strict';

  // Keep track of pending mock checks
  const pendingRequests = new Map();
  let requestCounter = 0;

  /**
   * Generate unique request ID
   */
  function generateRequestId() {
    return `req_${Date.now()}_${++requestCounter}`;
  }

  /**
   * Check if a request should be mocked
   * Returns a promise that resolves with the mock check result
   */
  function checkMock(url, method) {
    return new Promise((resolve) => {
      const requestId = generateRequestId();
      
      // Set up timeout for mock check
      const timeout = setTimeout(() => {
        pendingRequests.delete(requestId);
        resolve({ shouldMock: false });
      }, 1000); // 1 second timeout

      pendingRequests.set(requestId, { resolve, timeout });

      // Send message to content script
      window.postMessage({
        source: 'api-mocker-injected',
        type: 'CHECK_MOCK',
        requestId: requestId,
        payload: { url, method }
      }, '*');
    });
  }

  /**
   * Listen for mock responses from content script
   */
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    if (!event.data || event.data.source !== 'api-mocker-content') return;

    const { type, requestId, payload } = event.data;

    if (type === 'MOCK_RESPONSE' && requestId) {
      const pending = pendingRequests.get(requestId);
      if (pending) {
        clearTimeout(pending.timeout);
        pendingRequests.delete(requestId);
        pending.resolve(payload);
      }
    }
  });

  // Store original implementations
  const originalFetch = window.fetch;
  const originalXHR = window.XMLHttpRequest;

  /**
   * Override fetch
   */
  window.fetch = async function(input, init = {}) {
    // Extract URL and method
    let url, method;
    
    if (input instanceof Request) {
      url = input.url;
      method = input.method || 'GET';
    } else {
      url = String(input);
      method = init.method || 'GET';
    }

    // Normalize URL (handle relative URLs)
    try {
      url = new URL(url, window.location.origin).href;
    } catch (e) {
      // Keep original if URL parsing fails
    }

    // Check if this request should be mocked
    const mockCheck = await checkMock(url, method.toUpperCase());

    if (mockCheck.shouldMock && mockCheck.response) {
      console.log(`[Mock your APIs] Mocking ${method} ${url}`);
      
      const { status, statusText, headers, body } = mockCheck.response;
      
      // Create mock response
      const responseHeaders = new Headers(headers || {});
      const responseInit = {
        status: status || 200,
        statusText: statusText || 'OK',
        headers: responseHeaders
      };

      // Return mock response
      return new Response(body || '', responseInit);
    }

    // Not mocked, proceed with original fetch
    return originalFetch.apply(this, arguments);
  };

  /**
   * Override XMLHttpRequest
   */
  window.XMLHttpRequest = function() {
    const xhr = new originalXHR();
    const xhrInfo = {
      method: 'GET',
      url: '',
      async: true,
      mocked: false,
      mockResponse: null
    };

    // Store original methods
    const originalOpen = xhr.open.bind(xhr);
    const originalSend = xhr.send.bind(xhr);
    const originalSetRequestHeader = xhr.setRequestHeader.bind(xhr);

    // Override open
    xhr.open = function(method, url, async = true, user, password) {
      xhrInfo.method = method.toUpperCase();
      xhrInfo.url = url;
      xhrInfo.async = async;

      // Normalize URL
      try {
        xhrInfo.url = new URL(url, window.location.origin).href;
      } catch (e) {
        // Keep original if URL parsing fails
      }

      return originalOpen(method, url, async, user, password);
    };

    // Override send
    xhr.send = async function(body) {
      // Check if this request should be mocked
      const mockCheck = await checkMock(xhrInfo.url, xhrInfo.method);

      if (mockCheck.shouldMock && mockCheck.response) {
        console.log(`[Mock your APIs] Mocking XHR ${xhrInfo.method} ${xhrInfo.url}`);
        
        xhrInfo.mocked = true;
        xhrInfo.mockResponse = mockCheck.response;

        // Simulate XHR lifecycle for mocked request
        simulateMockedXHR(xhr, xhrInfo.mockResponse);
        return;
      }

      // Not mocked, proceed with original send
      return originalSend(body);
    };

    return xhr;
  };

  // Copy static properties and prototype
  window.XMLHttpRequest.prototype = originalXHR.prototype;
  Object.keys(originalXHR).forEach(key => {
    try {
      window.XMLHttpRequest[key] = originalXHR[key];
    } catch (e) {
      // Some properties might not be writable
    }
  });

  // Copy constants
  window.XMLHttpRequest.UNSENT = 0;
  window.XMLHttpRequest.OPENED = 1;
  window.XMLHttpRequest.HEADERS_RECEIVED = 2;
  window.XMLHttpRequest.LOADING = 3;
  window.XMLHttpRequest.DONE = 4;

  /**
   * Simulate XHR lifecycle for mocked requests
   */
  function simulateMockedXHR(xhr, mockResponse) {
    const { status, statusText, headers, body } = mockResponse;

    // Create property descriptors for read-only properties
    const defineReadOnly = (obj, prop, value) => {
      Object.defineProperty(obj, prop, {
        get: () => value,
        configurable: true
      });
    };

    // Set up response properties
    defineReadOnly(xhr, 'status', status || 200);
    defineReadOnly(xhr, 'statusText', statusText || 'OK');
    defineReadOnly(xhr, 'response', body || '');
    defineReadOnly(xhr, 'responseText', body || '');
    defineReadOnly(xhr, 'responseURL', '');

    // Build headers string
    let headersStr = '';
    if (headers) {
      for (const [key, value] of Object.entries(headers)) {
        headersStr += `${key}: ${value}\r\n`;
      }
    }

    // Override getAllResponseHeaders
    xhr.getAllResponseHeaders = () => headersStr;

    // Override getResponseHeader
    xhr.getResponseHeader = (name) => {
      if (headers && headers[name]) {
        return headers[name];
      }
      // Case-insensitive lookup
      if (headers) {
        const lowerName = name.toLowerCase();
        for (const [key, value] of Object.entries(headers)) {
          if (key.toLowerCase() === lowerName) {
            return value;
          }
        }
      }
      return null;
    };

    // Simulate state changes asynchronously
    setTimeout(() => {
      // OPENED
      defineReadOnly(xhr, 'readyState', 1);
      if (xhr.onreadystatechange) xhr.onreadystatechange();

      setTimeout(() => {
        // HEADERS_RECEIVED
        defineReadOnly(xhr, 'readyState', 2);
        if (xhr.onreadystatechange) xhr.onreadystatechange();

        setTimeout(() => {
          // LOADING
          defineReadOnly(xhr, 'readyState', 3);
          if (xhr.onreadystatechange) xhr.onreadystatechange();

          setTimeout(() => {
            // DONE
            defineReadOnly(xhr, 'readyState', 4);
            if (xhr.onreadystatechange) xhr.onreadystatechange();
            
            // Fire load event
            if (xhr.onload) {
              xhr.onload(new ProgressEvent('load'));
            }
            
            // Fire loadend event
            if (xhr.onloadend) {
              xhr.onloadend(new ProgressEvent('loadend'));
            }

            // Dispatch events
            try {
              xhr.dispatchEvent(new ProgressEvent('load'));
              xhr.dispatchEvent(new ProgressEvent('loadend'));
            } catch (e) {
              // Ignore if dispatchEvent fails
            }
          }, 5);
        }, 5);
      }, 5);
    }, 5);
  }

  console.log('[Mock your APIs] Request interceptor loaded');
})();
