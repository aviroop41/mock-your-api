/**
 * HTTP Status Codes - Comprehensive list of standard HTTP status codes
 */

const HTTP_STATUS_CODES = {
  // 1xx - Informational
  100: 'Continue',
  101: 'Switching Protocols',
  102: 'Processing',
  103: 'Early Hints',
  
  // 2xx - Success
  200: 'OK',
  201: 'Created',
  202: 'Accepted',
  203: 'Non-Authoritative Information',
  204: 'No Content',
  205: 'Reset Content',
  206: 'Partial Content',
  207: 'Multi-Status',
  208: 'Already Reported',
  226: 'IM Used',
  
  // 3xx - Redirection
  300: 'Multiple Choices',
  301: 'Moved Permanently',
  302: 'Found',
  303: 'See Other',
  304: 'Not Modified',
  305: 'Use Proxy',
  307: 'Temporary Redirect',
  308: 'Permanent Redirect',
  
  // 4xx - Client Error
  400: 'Bad Request',
  401: 'Unauthorized',
  402: 'Payment Required',
  403: 'Forbidden',
  404: 'Not Found',
  405: 'Method Not Allowed',
  406: 'Not Acceptable',
  407: 'Proxy Authentication Required',
  408: 'Request Timeout',
  409: 'Conflict',
  410: 'Gone',
  411: 'Length Required',
  412: 'Precondition Failed',
  413: 'Payload Too Large',
  414: 'URI Too Long',
  415: 'Unsupported Media Type',
  416: 'Range Not Satisfiable',
  417: 'Expectation Failed',
  418: "I'm a Teapot",
  421: 'Misdirected Request',
  422: 'Unprocessable Entity',
  423: 'Locked',
  424: 'Failed Dependency',
  425: 'Too Early',
  426: 'Upgrade Required',
  428: 'Precondition Required',
  429: 'Too Many Requests',
  431: 'Request Header Fields Too Large',
  451: 'Unavailable For Legal Reasons',
  
  // 5xx - Server Error
  500: 'Internal Server Error',
  501: 'Not Implemented',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
  504: 'Gateway Timeout',
  505: 'HTTP Version Not Supported',
  506: 'Variant Also Negotiates',
  507: 'Insufficient Storage',
  508: 'Loop Detected',
  510: 'Not Extended',
  511: 'Network Authentication Required'
};

/**
 * Get all status codes as an array of objects
 */
function getStatusCodesList() {
  return Object.entries(HTTP_STATUS_CODES).map(([code, text]) => ({
    code: parseInt(code),
    text: text,
    display: `${code} ${text}`
  }));
}

/**
 * Get status text for a given code
 */
function getStatusText(code) {
  return HTTP_STATUS_CODES[code] || 'Unknown';
}

/**
 * Check if a status code is valid
 */
function isValidStatusCode(code) {
  const num = parseInt(code);
  return !isNaN(num) && num >= 100 && num <= 599 && Number.isInteger(num);
}

/**
 * Get status codes by category
 */
function getStatusCodesByCategory() {
  return {
    '1xx - Informational': getStatusCodesList().filter(s => s.code >= 100 && s.code < 200),
    '2xx - Success': getStatusCodesList().filter(s => s.code >= 200 && s.code < 300),
    '3xx - Redirection': getStatusCodesList().filter(s => s.code >= 300 && s.code < 400),
    '4xx - Client Error': getStatusCodesList().filter(s => s.code >= 400 && s.code < 500),
    '5xx - Server Error': getStatusCodesList().filter(s => s.code >= 500 && s.code < 600)
  };
}

/**
 * Create a searchable status code dropdown
 * @param {HTMLElement} container - Container element to render the dropdown in
 * @param {Function} onSelect - Callback when a status is selected
 * @param {number} initialCode - Initial selected code
 * @returns {Object} Methods to control the dropdown
 */
function createStatusDropdown(container, onSelect, initialCode = 200) {
  const statusList = getStatusCodesList();
  const initialStatus = statusList.find(s => s.code === initialCode) || statusList.find(s => s.code === 200);
  
  container.innerHTML = `
    <div class="status-dropdown">
      <div class="status-dropdown-input">
        <input type="text" class="form-input status-search" placeholder="Search status code..." value="${initialStatus.display}">
        <span class="status-dropdown-arrow">▼</span>
      </div>
      <div class="status-dropdown-list">
        ${Object.entries(getStatusCodesByCategory()).map(([category, codes]) => `
          <div class="status-category">
            <div class="status-category-label">${category}</div>
            ${codes.map(s => `
              <div class="status-option ${s.code === initialCode ? 'selected' : ''}" data-code="${s.code}" data-text="${s.text}">
                <span class="status-code">${s.code}</span>
                <span class="status-text">${s.text}</span>
              </div>
            `).join('')}
          </div>
        `).join('')}
      </div>
    </div>
  `;
  
  const dropdown = container.querySelector('.status-dropdown');
  const input = container.querySelector('.status-search');
  const list = container.querySelector('.status-dropdown-list');
  const options = container.querySelectorAll('.status-option');
  
  let isOpen = false;
  let selectedCode = initialCode;
  let selectedText = initialStatus.text;
  
  // Toggle dropdown
  function toggleDropdown(show) {
    isOpen = show !== undefined ? show : !isOpen;
    list.style.display = isOpen ? 'block' : 'none';
    if (isOpen) {
      input.select();
    }
  }
  
  // Filter options
  function filterOptions(query) {
    const q = query.toLowerCase();
    options.forEach(option => {
      const code = option.dataset.code;
      const text = option.dataset.text.toLowerCase();
      const matches = code.includes(q) || text.includes(q);
      option.style.display = matches ? 'flex' : 'none';
    });
    
    // Show/hide categories based on visible options
    container.querySelectorAll('.status-category').forEach(cat => {
      const hasVisible = Array.from(cat.querySelectorAll('.status-option')).some(o => o.style.display !== 'none');
      cat.style.display = hasVisible ? 'block' : 'none';
    });
  }
  
  // Select an option
  function selectOption(code, text) {
    selectedCode = parseInt(code);
    selectedText = text;
    input.value = `${code} ${text}`;
    
    options.forEach(o => o.classList.remove('selected'));
    const selected = container.querySelector(`.status-option[data-code="${code}"]`);
    if (selected) selected.classList.add('selected');
    
    toggleDropdown(false);
    
    if (onSelect) {
      onSelect(selectedCode, selectedText);
    }
  }
  
  // Event listeners
  input.addEventListener('focus', () => {
    toggleDropdown(true);
  });
  
  input.addEventListener('input', () => {
    filterOptions(input.value);
    if (!isOpen) toggleDropdown(true);
  });
  
  input.addEventListener('blur', (e) => {
    // Delay to allow click on option
    setTimeout(() => {
      // Validate and restore if invalid
      const match = input.value.match(/^(\d+)/);
      if (match) {
        const code = parseInt(match[1]);
        if (HTTP_STATUS_CODES[code]) {
          selectOption(code, HTTP_STATUS_CODES[code]);
        } else if (isValidStatusCode(code)) {
          selectOption(code, 'Unknown');
        } else {
          input.value = `${selectedCode} ${selectedText}`;
        }
      } else {
        input.value = `${selectedCode} ${selectedText}`;
      }
      toggleDropdown(false);
    }, 200);
  });
  
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      toggleDropdown(false);
      input.blur();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const match = input.value.match(/^(\d+)/);
      if (match) {
        const code = parseInt(match[1]);
        if (HTTP_STATUS_CODES[code]) {
          selectOption(code, HTTP_STATUS_CODES[code]);
        } else if (isValidStatusCode(code)) {
          selectOption(code, 'Unknown');
        }
      }
    }
  });
  
  options.forEach(option => {
    option.addEventListener('click', () => {
      selectOption(option.dataset.code, option.dataset.text);
    });
  });
  
  // Click outside to close
  document.addEventListener('click', (e) => {
    if (!dropdown.contains(e.target)) {
      toggleDropdown(false);
    }
  });
  
  return {
    getValue: () => ({ code: selectedCode, text: selectedText }),
    setValue: (code) => {
      const text = HTTP_STATUS_CODES[code] || 'Unknown';
      selectOption(code, text);
    },
    reset: () => {
      selectOption(200, 'OK');
      filterOptions('');
    }
  };
}

// Make available globally
if (typeof window !== 'undefined') {
  window.HTTP_STATUS_CODES = HTTP_STATUS_CODES;
  window.getStatusCodesList = getStatusCodesList;
  window.getStatusText = getStatusText;
  window.isValidStatusCode = isValidStatusCode;
  window.getStatusCodesByCategory = getStatusCodesByCategory;
  window.createStatusDropdown = createStatusDropdown;
}
