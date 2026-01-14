/**
 * DevTools Panel Logic for Mock your APIs
 */

// State
let currentRules = [];
let editingRuleId = null;

// DOM Elements
const elements = {
  // Header
  header: document.querySelector('.header'),
  globalToggle: document.getElementById('globalToggle'),
  ruleCount: document.getElementById('ruleCount'),
  toggleLabel: document.querySelector('.toggle-label'),
  
  // Rule Name
  ruleName: document.getElementById('ruleName'),
  
  // cURL Input
  curlInput: document.getElementById('curlInput'),
  clearForm: document.getElementById('clearForm'),
  
  // Request
  methodSelect: document.getElementById('methodSelect'),
  urlInput: document.getElementById('urlInput'),
  requestHeadersList: document.getElementById('requestHeadersList'),
  addRequestHeader: document.getElementById('addRequestHeader'),
  requestBody: document.getElementById('requestBody'),
  
  // Response
  statusCode: document.getElementById('statusCode'),
  statusText: document.getElementById('statusText'),
  responseHeadersList: document.getElementById('responseHeadersList'),
  addResponseHeader: document.getElementById('addResponseHeader'),
  responseBody: document.getElementById('responseBody'),
  formatJson: document.getElementById('formatJson'),
  
  // Actions
  saveRule: document.getElementById('saveRule'),
  saveRuleText: document.getElementById('saveRuleText'),
  cancelEdit: document.getElementById('cancelEdit'),
  clearAllRules: document.getElementById('clearAllRules'),
  
  // Rules List
  rulesList: document.getElementById('rulesList'),
  searchRules: document.getElementById('searchRules'),
};

// Initialize
document.addEventListener('DOMContentLoaded', init);

async function init() {
  await loadGlobalState();
  await loadRules();
  setupEventListeners();
  addDefaultResponseHeader();
}

/**
 * Load global enabled state
 */
async function loadGlobalState() {
  const response = await sendMessage({ type: 'GET_GLOBAL_ENABLED' });
  elements.globalToggle.checked = response.enabled;
  updateToggleLabel();
}

/**
 * Load all rules from storage
 */
async function loadRules() {
  const response = await sendMessage({ type: 'GET_RULES' });
  currentRules = response.rules || [];
  renderRulesList();
  updateRuleCount();
}

/**
 * Debounce helper
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Global toggle
  elements.globalToggle.addEventListener('change', async () => {
    await sendMessage({ 
      type: 'SET_GLOBAL_ENABLED', 
      payload: { enabled: elements.globalToggle.checked } 
    });
    updateToggleLabel();
  });
  
  // Auto-parse cURL with debounce (300ms)
  const debouncedParse = debounce(() => {
    if (elements.curlInput.value.trim()) {
      parseCurl();
    }
  }, 300);
  elements.curlInput.addEventListener('input', debouncedParse);
  
  // Clear form
  elements.clearForm.addEventListener('click', clearForm);
  
  // Add headers
  elements.addRequestHeader.addEventListener('click', () => addHeaderRow('requestHeadersList'));
  elements.addResponseHeader.addEventListener('click', () => addHeaderRow('responseHeadersList'));
  
  // Format JSON
  elements.formatJson.addEventListener('click', formatResponseJson);
  
  // Save rule
  elements.saveRule.addEventListener('click', saveRule);
  
  // Cancel edit
  elements.cancelEdit.addEventListener('click', cancelEdit);
  
  // Clear all rules
  elements.clearAllRules.addEventListener('click', clearAllRules);
  
  // Search rules
  elements.searchRules.addEventListener('input', filterRules);
  
  // Collapsible sections
  document.querySelectorAll('.collapsible-header').forEach(header => {
    header.addEventListener('click', () => {
      const targetId = header.dataset.target;
      const content = document.getElementById(targetId);
      const icon = header.querySelector('.collapse-icon');
      
      content.classList.toggle('expanded');
      icon.textContent = content.classList.contains('expanded') ? '▼' : '▶';
    });
  });
  
  // Status code change - auto-update status text
  elements.statusCode.addEventListener('change', () => {
    const code = parseInt(elements.statusCode.value);
    elements.statusText.value = getStatusText(code);
  });
}

/**
 * Parse cURL command
 */
function parseCurl() {
  const curlCommand = elements.curlInput.value.trim();
  
  if (!curlCommand) {
    showNotification('Please enter a cURL command', 'error');
    return;
  }
  
  try {
    const parsed = CurlParser.parse(curlCommand);
    
    // Fill in the form
    elements.methodSelect.value = parsed.method;
    elements.urlInput.value = parsed.url;
    
    // Clear and set request headers
    elements.requestHeadersList.innerHTML = '';
    if (parsed.headers && Object.keys(parsed.headers).length > 0) {
      for (const [key, value] of Object.entries(parsed.headers)) {
        addHeaderRow('requestHeadersList', key, value);
      }
    }
    
    // Set request body
    elements.requestBody.value = parsed.body || '';
    
    // Auto-format if JSON
    if (parsed.body && CurlParser.isJson(parsed.body)) {
      try {
        const formatted = JSON.stringify(JSON.parse(parsed.body), null, 2);
        elements.requestBody.value = formatted;
      } catch (e) {
        // Keep original if parsing fails
      }
    }
    
    showNotification('cURL parsed successfully!', 'success');
  } catch (error) {
    showNotification(`Parse error: ${error.message}`, 'error');
  }
}

/**
 * Clear the form
 */
function clearForm() {
  elements.ruleName.value = '';
  elements.curlInput.value = '';
  elements.methodSelect.value = 'GET';
  elements.urlInput.value = '';
  elements.requestHeadersList.innerHTML = '';
  elements.requestBody.value = '';
  elements.statusCode.value = '200';
  elements.statusText.value = 'OK';
  elements.responseHeadersList.innerHTML = '';
  addDefaultResponseHeader();
  elements.responseBody.value = '';
  
  // Reset edit state
  editingRuleId = null;
  elements.saveRuleText.textContent = 'Save Rule';
  elements.cancelEdit.style.display = 'none';
}

/**
 * Add a header row to the specified list
 */
function addHeaderRow(listId, key = '', value = '') {
  const list = document.getElementById(listId);
  const row = document.createElement('div');
  row.className = 'key-value-row';
  row.innerHTML = `
    <input type="text" class="form-input header-key" placeholder="Header name" value="${escapeHtml(key)}">
    <input type="text" class="form-input header-value" placeholder="Value" value="${escapeHtml(value)}">
    <button class="btn btn-ghost btn-icon remove-header" title="Remove">×</button>
  `;
  
  row.querySelector('.remove-header').addEventListener('click', () => row.remove());
  list.appendChild(row);
}

/**
 * Add default Content-Type header for response
 */
function addDefaultResponseHeader() {
  addHeaderRow('responseHeadersList', 'Content-Type', 'application/json');
}

/**
 * Format response body as JSON
 */
function formatResponseJson() {
  try {
    const json = JSON.parse(elements.responseBody.value);
    elements.responseBody.value = JSON.stringify(json, null, 2);
    showNotification('JSON formatted', 'success');
  } catch (error) {
    showNotification('Invalid JSON', 'error');
  }
}

/**
 * Save or update a rule
 */
async function saveRule() {
  const url = elements.urlInput.value.trim();
  const method = elements.methodSelect.value;
  const name = elements.ruleName.value.trim();
  
  if (!url) {
    showNotification('URL is required', 'error');
    return;
  }
  
  // Collect request headers
  const requestHeaders = {};
  elements.requestHeadersList.querySelectorAll('.key-value-row').forEach(row => {
    const key = row.querySelector('.header-key').value.trim();
    const value = row.querySelector('.header-value').value.trim();
    if (key) {
      requestHeaders[key] = value;
    }
  });
  
  // Collect response headers
  const responseHeaders = {};
  elements.responseHeadersList.querySelectorAll('.key-value-row').forEach(row => {
    const key = row.querySelector('.header-key').value.trim();
    const value = row.querySelector('.header-value').value.trim();
    if (key) {
      responseHeaders[key] = value;
    }
  });
  
  const ruleData = {
    name: name || null,
    request: {
      url,
      method,
      headers: requestHeaders,
      body: elements.requestBody.value || null,
    },
    response: {
      status: parseInt(elements.statusCode.value) || 200,
      statusText: elements.statusText.value || 'OK',
      headers: responseHeaders,
      body: elements.responseBody.value || '',
    },
  };
  
  try {
    if (editingRuleId) {
      // Update existing rule
      ruleData.id = editingRuleId;
      await sendMessage({ type: 'UPDATE_RULE', payload: ruleData });
      showNotification('Rule updated!', 'success');
    } else {
      // Add new rule
      await sendMessage({ type: 'ADD_RULE', payload: ruleData });
      showNotification('Rule saved!', 'success');
    }
    
    await loadRules();
    clearForm();
  } catch (error) {
    showNotification(`Error: ${error.message}`, 'error');
  }
}

/**
 * Cancel editing a rule
 */
function cancelEdit() {
  clearForm();
}

/**
 * Clear all rules
 */
async function clearAllRules() {
  if (!confirm('Are you sure you want to delete all mock rules?')) {
    return;
  }
  
  try {
    await sendMessage({ type: 'CLEAR_ALL_RULES' });
    await loadRules();
    showNotification('All rules cleared', 'success');
  } catch (error) {
    showNotification(`Error: ${error.message}`, 'error');
  }
}

/**
 * Render the rules list
 */
function renderRulesList(rules = currentRules) {
  if (rules.length === 0) {
    elements.rulesList.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📋</div>
        <p>No mock rules yet</p>
        <p class="empty-hint">Paste a cURL command and configure a mock response to get started</p>
      </div>
    `;
    return;
  }
  
  elements.rulesList.innerHTML = rules.map(rule => `
    <div class="rule-card ${rule.enabled ? '' : 'disabled'}" data-rule-id="${rule.id}">
      ${rule.name ? `<div class="rule-name">${escapeHtml(rule.name)}</div>` : ''}
      <div class="rule-header">
        <div class="rule-method method-${rule.request.method.toLowerCase()}">${rule.request.method}</div>
        <div class="rule-url" title="${escapeHtml(rule.request.url)}">${truncateUrl(rule.request.url)}</div>
        <label class="toggle-switch toggle-sm">
          <input type="checkbox" class="rule-toggle" ${rule.enabled ? 'checked' : ''}>
          <span class="toggle-slider"></span>
        </label>
      </div>
      <div class="rule-details">
        <span class="rule-status status-${getStatusClass(rule.response.status)}">
          ${rule.response.status} ${rule.response.statusText}
        </span>
        <span class="rule-date">${formatDate(rule.createdAt)}</span>
      </div>
      <div class="rule-actions">
        <button class="btn btn-ghost btn-sm edit-rule">Edit</button>
        <button class="btn btn-ghost btn-sm delete-rule">Delete</button>
      </div>
    </div>
  `).join('');
  
  // Add event listeners to rule cards
  elements.rulesList.querySelectorAll('.rule-card').forEach(card => {
    const ruleId = card.dataset.ruleId;
    
    card.querySelector('.rule-toggle').addEventListener('change', async (e) => {
      e.stopPropagation();
      await sendMessage({ type: 'TOGGLE_RULE', payload: { id: ruleId } });
      await loadRules();
    });
    
    card.querySelector('.edit-rule').addEventListener('click', () => editRule(ruleId));
    card.querySelector('.delete-rule').addEventListener('click', () => deleteRule(ruleId));
  });
}

/**
 * Filter rules based on search
 */
function filterRules() {
  const query = elements.searchRules.value.toLowerCase();
  
  if (!query) {
    renderRulesList();
    return;
  }
  
  const filtered = currentRules.filter(rule => 
    rule.request.url.toLowerCase().includes(query) ||
    rule.request.method.toLowerCase().includes(query) ||
    (rule.name && rule.name.toLowerCase().includes(query))
  );
  
  renderRulesList(filtered);
}

/**
 * Edit a rule
 */
function editRule(ruleId) {
  const rule = currentRules.find(r => r.id === ruleId);
  if (!rule) return;
  
  editingRuleId = ruleId;
  
  // Fill form with rule data
  elements.ruleName.value = rule.name || '';
  elements.methodSelect.value = rule.request.method;
  elements.urlInput.value = rule.request.url;
  
  // Request headers
  elements.requestHeadersList.innerHTML = '';
  if (rule.request.headers) {
    for (const [key, value] of Object.entries(rule.request.headers)) {
      addHeaderRow('requestHeadersList', key, value);
    }
  }
  
  elements.requestBody.value = rule.request.body || '';
  elements.statusCode.value = rule.response.status;
  elements.statusText.value = rule.response.statusText;
  
  // Response headers
  elements.responseHeadersList.innerHTML = '';
  if (rule.response.headers) {
    for (const [key, value] of Object.entries(rule.response.headers)) {
      addHeaderRow('responseHeadersList', key, value);
    }
  }
  
  elements.responseBody.value = rule.response.body || '';
  
  // Update UI
  elements.saveRuleText.textContent = 'Update Rule';
  elements.cancelEdit.style.display = 'inline-block';
  
  // Scroll to top
  document.querySelector('.editor-panel').scrollTop = 0;
}

/**
 * Delete a rule
 */
async function deleteRule(ruleId) {
  if (!confirm('Delete this mock rule?')) {
    return;
  }
  
  try {
    await sendMessage({ type: 'DELETE_RULE', payload: { id: ruleId } });
    await loadRules();
    showNotification('Rule deleted', 'success');
    
    // Clear form if editing this rule
    if (editingRuleId === ruleId) {
      clearForm();
    }
  } catch (error) {
    showNotification(`Error: ${error.message}`, 'error');
  }
}

/**
 * Update rule count display
 */
function updateRuleCount() {
  const count = currentRules.length;
  const enabled = currentRules.filter(r => r.enabled).length;
  elements.ruleCount.textContent = `${enabled}/${count} active`;
  
  // Update badge styling based on active rules
  if (enabled > 0) {
    elements.ruleCount.classList.add('badge-active');
    elements.ruleCount.classList.remove('badge-inactive');
  } else {
    elements.ruleCount.classList.add('badge-inactive');
    elements.ruleCount.classList.remove('badge-active');
  }
}

/**
 * Update toggle label styling based on global enabled state
 */
function updateToggleLabel() {
  if (elements.globalToggle.checked) {
    elements.toggleLabel.textContent = 'Mocking Enabled';
    elements.toggleLabel.classList.add('toggle-label-active');
    elements.toggleLabel.classList.remove('toggle-label-inactive');
    elements.header.classList.add('header-enabled');
    elements.header.classList.remove('header-disabled');
  } else {
    elements.toggleLabel.textContent = 'Mocking Disabled';
    elements.toggleLabel.classList.add('toggle-label-inactive');
    elements.toggleLabel.classList.remove('toggle-label-active');
    elements.header.classList.add('header-disabled');
    elements.header.classList.remove('header-enabled');
  }
}

/**
 * Send message to service worker
 */
function sendMessage(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, response => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else if (response && response.error) {
        reject(new Error(response.error));
      } else {
        resolve(response);
      }
    });
  });
}

/**
 * Show notification
 */
function showNotification(message, type = 'info') {
  // Remove existing notification
  const existing = document.querySelector('.notification');
  if (existing) existing.remove();
  
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  document.body.appendChild(notification);
  
  // Trigger animation
  setTimeout(() => notification.classList.add('show'), 10);
  
  // Auto-remove
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

/**
 * Helper: Get status text from code
 */
function getStatusText(code) {
  const statusTexts = {
    200: 'OK',
    201: 'Created',
    204: 'No Content',
    301: 'Moved Permanently',
    302: 'Found',
    304: 'Not Modified',
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    405: 'Method Not Allowed',
    409: 'Conflict',
    422: 'Unprocessable Entity',
    429: 'Too Many Requests',
    500: 'Internal Server Error',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
  };
  return statusTexts[code] || 'Unknown';
}

/**
 * Helper: Get status class for styling
 */
function getStatusClass(code) {
  if (code >= 200 && code < 300) return 'success';
  if (code >= 300 && code < 400) return 'redirect';
  if (code >= 400 && code < 500) return 'client-error';
  if (code >= 500) return 'server-error';
  return 'unknown';
}

/**
 * Helper: Truncate URL for display
 */
function truncateUrl(url, maxLength = 50) {
  if (url.length <= maxLength) return url;
  return url.substring(0, maxLength - 3) + '...';
}

/**
 * Helper: Format date
 */
function formatDate(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Helper: Escape HTML
 */
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
