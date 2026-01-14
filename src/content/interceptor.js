/**
 * Content Script - Injects the request interceptor into the page context
 * 
 * This script runs in the content script context and injects another script
 * into the page context to override fetch and XMLHttpRequest.
 */

(function() {
  'use strict';

  // Inject the interceptor script into the page context
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('src/content/injected.js');
  script.onload = function() {
    this.remove();
  };
  (document.head || document.documentElement).appendChild(script);

  // Listen for messages from the injected script
  window.addEventListener('message', async (event) => {
    if (event.source !== window) return;
    if (!event.data || event.data.source !== 'api-mocker-injected') return;

    const { type, payload, requestId } = event.data;

    if (type === 'CHECK_MOCK') {
      try {
        // Forward the request to the service worker
        const response = await chrome.runtime.sendMessage({
          type: 'CHECK_MOCK',
          payload: payload
        });

        // Send response back to the injected script
        window.postMessage({
          source: 'api-mocker-content',
          type: 'MOCK_RESPONSE',
          requestId: requestId,
          payload: response
        }, '*');
      } catch (error) {
        window.postMessage({
          source: 'api-mocker-content',
          type: 'MOCK_RESPONSE',
          requestId: requestId,
          payload: { shouldMock: false, error: error.message }
        }, '*');
      }
    }
  });

  // Listen for rule updates from service worker
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'RULES_UPDATED' || message.type === 'GLOBAL_STATE_CHANGED') {
      // Notify the injected script about the change
      window.postMessage({
        source: 'api-mocker-content',
        type: message.type,
        payload: message
      }, '*');
    }
  });

  console.log('[Mock your APIs] Content script loaded');
})();
