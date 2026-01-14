/**
 * Rules Editor - Full Page Editor for Mock Rules
 */

// State
let allRules = [];
let filteredRules = [];
let editingRuleId = null;

// DOM Elements
const elements = {
  // Header
  globalToggle: document.getElementById('globalToggle'),
  toggleLabel: document.getElementById('toggleLabel'),
  totalRulesBadge: document.getElementById('totalRulesBadge'),
  activeRulesBadge: document.getElementById('activeRulesBadge'),
  refreshBtn: document.getElementById('refreshBtn'),
  addRuleBtn: document.getElementById('addRuleBtn'),
  
  // Toolbar
  searchInput: document.getElementById('searchInput'),
  methodFilter: document.getElementById('methodFilter'),
  statusFilter: document.getElementById('statusFilter'),
  enabledFilter: document.getElementById('enabledFilter'),
  
  // Container
  rulesContainer: document.getElementById('rulesContainer'),
  
  // Modal
  editModal: document.getElementById('editModal'),
  modalTitle: document.getElementById('modalTitle'),
  closeModal: document.getElementById('closeModal'),
  cancelEditBtn: document.getElementById('cancelEditBtn'),
  saveEditBtn: document.getElementById('saveEditBtn'),
  ruleForm: document.getElementById('ruleForm'),
  
  // Form fields
  editRuleName: document.getElementById('editRuleName'),
  editMethod: document.getElementById('editMethod'),
  editUrl: document.getElementById('editUrl'),
  editRequestHeaders: document.getElementById('editRequestHeaders'),
  editRequestBody: document.getElementById('editRequestBody'),
  editStatusCode: document.getElementById('editStatusCode'),
  editStatusText: document.getElementById('editStatusText'),
  editResponseHeaders: document.getElementById('editResponseHeaders'),
  editResponseBody: document.getElementById('editResponseBody'),
  
  // Buttons
  addRequestHeaderBtn: document.getElementById('addRequestHeaderBtn'),
  addResponseHeaderBtn: document.getElementById('addResponseHeaderBtn'),
  formatJsonBtn: document.getElementById('formatJsonBtn'),
  
  // Notification
  notification: document.getElementById('notification'),
};

// Initialize
document.addEventListener('DOMContentLoaded', init);

async function init() {
  await loadGlobalState();
  await loadRules();
  setupEventListeners();
}

/**
 * Load global enabled state
 */
async function loadGlobalState() {
  try {
    const response = await sendMessage({ type: 'GET_GLOBAL_ENABLED' });
    elements.globalToggle.checked = response.enabled;
    updateToggleLabel();
  } catch (error) {
    console.error('Error loading global state:', error);
  }
}

/**
 * Load all rules from storage
 */
async function loadRules() {
  try {
    const response = await sendMessage({ type: 'GET_RULES' });
    allRules = response.rules || [];
    applyFilters();
    updateStats();
  } catch (error) {
    console.error('Error loading rules:', error);
    showNotification('Error loading rules', 'error');
  }
}

/**
 * Update statistics badges
 */
function updateStats() {
  const total = allRules.length;
  const active = allRules.filter(r => r.enabled).length;
  elements.totalRulesBadge.textContent = `${total} Total`;
  elements.activeRulesBadge.textContent = `${active} Active`;
}

/**
 * Apply filters and search
 */
function applyFilters() {
  const searchTerm = elements.searchInput.value.toLowerCase();
  const methodFilter = elements.methodFilter.value;
  const statusFilter = elements.statusFilter.value;
  const enabledOnly = elements.enabledFilter.checked;
  
  filteredRules = allRules.filter(rule => {
    // Search filter
    if (searchTerm) {
      const matchesSearch = 
        rule.name?.toLowerCase().includes(searchTerm) ||
        rule.request.url.toLowerCase().includes(searchTerm) ||
        rule.request.method.toLowerCase().includes(searchTerm);
      if (!matchesSearch) return false;
    }
    
    // Method filter
    if (methodFilter && rule.request.method !== methodFilter) {
      return false;
    }
    
    // Status filter
    if (statusFilter) {
      const status = rule.response.status;
      if (statusFilter === '2xx' && (status < 200 || status >= 300)) return false;
      if (statusFilter === '4xx' && (status < 400 || status >= 500)) return false;
      if (statusFilter === '5xx' && status < 500) return false;
    }
    
    // Enabled filter
    if (enabledOnly && !rule.enabled) {
      return false;
    }
    
    return true;
  });
  
  renderRules();
}

/**
 * Render rules grid
 */
function renderRules() {
  if (filteredRules.length === 0) {
    elements.rulesContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📋</div>
        <p>No rules match your filters</p>
        <p class="empty-hint">Try adjusting your search or filters</p>
      </div>
    `;
    return;
  }
  
  elements.rulesContainer.innerHTML = filteredRules.map(rule => createRuleCard(rule)).join('');
  
  // Attach event listeners to rule cards
  filteredRules.forEach(rule => {
    const card = document.getElementById(`rule-${rule.id}`);
    if (card) {
      // Toggle switch
      const toggle = card.querySelector('.rule-toggle input');
      if (toggle) {
        toggle.addEventListener('change', () => toggleRule(rule.id));
      }
      
      // Edit button
      const editBtn = card.querySelector('.edit-btn');
      if (editBtn) {
        editBtn.addEventListener('click', () => openEditModal(rule));
      }
      
      // Delete button
      const deleteBtn = card.querySelector('.delete-btn');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', () => deleteRule(rule.id));
      }
    }
  });
}

/**
 * Create a rule card HTML
 */
function createRuleCard(rule) {
  const methodClass = `method-${rule.request.method.toLowerCase()}`;
  const statusClass = getStatusClass(rule.response.status);
  const createdAt = rule.createdAt ? new Date(rule.createdAt).toLocaleDateString() : 'Unknown';
  
  return `
    <div class="rule-card ${!rule.enabled ? 'disabled' : ''}" id="rule-${rule.id}">
      <div class="rule-card-header">
        <div class="rule-card-title">
          <span class="rule-method ${methodClass}">${rule.request.method}</span>
          <h3 class="rule-name">${escapeHtml(rule.name || 'Unnamed Rule')}</h3>
        </div>
        <label class="toggle-switch toggle-sm">
          <input type="checkbox" ${rule.enabled ? 'checked' : ''}>
          <span class="toggle-slider"></span>
        </label>
      </div>
      
      <div class="rule-card-body">
        <div class="rule-url">
          <span class="label">URL:</span>
          <span class="value">${escapeHtml(rule.request.url)}</span>
        </div>
        
        <div class="rule-details">
          <span class="rule-status ${statusClass}">
            ${rule.response.status} ${rule.response.statusText || 'OK'}
          </span>
          <span class="rule-date">Created: ${createdAt}</span>
        </div>
      </div>
      
      <div class="rule-card-actions">
        <button class="btn btn-secondary btn-sm edit-btn">Edit</button>
        <button class="btn btn-ghost btn-sm delete-btn">Delete</button>
      </div>
    </div>
  `;
}

/**
 * Get status class for styling
 */
function getStatusClass(status) {
  if (status >= 200 && status < 300) return 'status-success';
  if (status >= 300 && status < 400) return 'status-redirect';
  if (status >= 400 && status < 500) return 'status-client-error';
  if (status >= 500) return 'status-server-error';
  return '';
}

/**
 * Truncate text
 */
function truncateText(text, maxLength) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

/**
 * Toggle rule enabled state
 */
async function toggleRule(ruleId) {
  try {
    await sendMessage({ type: 'TOGGLE_RULE', payload: { id: ruleId } });
    await loadRules();
    showNotification('Rule toggled', 'success');
  } catch (error) {
    console.error('Error toggling rule:', error);
    showNotification('Error toggling rule', 'error');
    await loadRules(); // Reload to revert UI
  }
}

/**
 * Delete a rule
 */
async function deleteRule(ruleId) {
  if (!confirm('Are you sure you want to delete this rule?')) {
    return;
  }
  
  try {
    await sendMessage({ type: 'DELETE_RULE', payload: { id: ruleId } });
    await loadRules();
    showNotification('Rule deleted', 'success');
  } catch (error) {
    console.error('Error deleting rule:', error);
    showNotification('Error deleting rule', 'error');
  }
}

/**
 * Open edit modal
 */
function openEditModal(rule = null) {
  editingRuleId = rule ? rule.id : null;
  elements.modalTitle.textContent = rule ? 'Edit Rule' : 'Add New Rule';
  
  if (rule) {
    // Populate form with rule data
    elements.editRuleName.value = rule.name || '';
    elements.editMethod.value = rule.request.method;
    elements.editUrl.value = rule.request.url;
    elements.editRequestBody.value = rule.request.body || '';
    elements.editStatusCode.value = rule.response.status;
    elements.editStatusText.value = rule.response.statusText || 'OK';
    elements.editResponseBody.value = rule.response.body || '';
    
    // Populate headers
    populateHeaders(elements.editRequestHeaders, rule.request.headers || {});
    populateHeaders(elements.editResponseHeaders, rule.response.headers || {});
  } else {
    // Clear form for new rule
    elements.ruleForm.reset();
    elements.editStatusCode.value = '200';
    elements.editStatusText.value = 'OK';
    elements.editRequestHeaders.innerHTML = '';
    elements.editResponseHeaders.innerHTML = '';
    addDefaultResponseHeader();
  }
  
  elements.editModal.classList.add('show');
}

/**
 * Populate headers list
 */
function populateHeaders(container, headers) {
  container.innerHTML = '';
  Object.entries(headers).forEach(([key, value]) => {
    addHeaderRow(container, key, value);
  });
  if (container === elements.editResponseHeaders && Object.keys(headers).length === 0) {
    addDefaultResponseHeader();
  }
}

/**
 * Add default response header
 */
function addDefaultResponseHeader() {
  addHeaderRow(elements.editResponseHeaders, 'Content-Type', 'application/json');
}

/**
 * Add header row
 */
function addHeaderRow(container, key = '', value = '') {
  const row = document.createElement('div');
  row.className = 'key-value-row';
  row.innerHTML = `
    <input type="text" class="form-input header-key" placeholder="Header name" value="${escapeHtml(key)}">
    <input type="text" class="form-input header-value" placeholder="Value" value="${escapeHtml(value)}">
    <button type="button" class="btn btn-ghost btn-icon remove-header">×</button>
  `;
  row.querySelector('.remove-header').addEventListener('click', () => row.remove());
  container.appendChild(row);
}

/**
 * Close edit modal
 */
function closeEditModal() {
  elements.editModal.classList.remove('show');
  editingRuleId = null;
  elements.ruleForm.reset();
}

/**
 * Save rule
 */
async function saveRule() {
  const url = elements.editUrl.value.trim();
  const method = elements.editMethod.value;
  const name = elements.editRuleName.value.trim();
  
  if (!url) {
    showNotification('URL is required', 'error');
    return;
  }
  
  // Collect headers
  const requestHeaders = collectHeaders(elements.editRequestHeaders);
  const responseHeaders = collectHeaders(elements.editResponseHeaders);
  
  const ruleData = {
    name: name || null,
    request: {
      url,
      method,
      headers: requestHeaders,
      body: elements.editRequestBody.value || null,
    },
    response: {
      status: parseInt(elements.editStatusCode.value) || 200,
      statusText: elements.editStatusText.value || 'OK',
      headers: responseHeaders,
      body: elements.editResponseBody.value || '',
    },
  };
  
  try {
    if (editingRuleId) {
      ruleData.id = editingRuleId;
      await sendMessage({ type: 'UPDATE_RULE', payload: ruleData });
      showNotification('Rule updated!', 'success');
    } else {
      await sendMessage({ type: 'ADD_RULE', payload: ruleData });
      showNotification('Rule saved!', 'success');
    }
    
    await loadRules();
    closeEditModal();
  } catch (error) {
    console.error('Error saving rule:', error);
    showNotification(`Error: ${error.message}`, 'error');
  }
}

/**
 * Collect headers from key-value list
 */
function collectHeaders(container) {
  const headers = {};
  container.querySelectorAll('.key-value-row').forEach(row => {
    const key = row.querySelector('.header-key').value.trim();
    const value = row.querySelector('.header-value').value.trim();
    if (key) {
      headers[key] = value;
    }
  });
  return headers;
}

/**
 * Format JSON
 */
function formatJson() {
  try {
    const json = JSON.parse(elements.editResponseBody.value);
    elements.editResponseBody.value = JSON.stringify(json, null, 2);
    showNotification('JSON formatted', 'success');
  } catch (error) {
    showNotification('Invalid JSON', 'error');
  }
}

/**
 * Update toggle label
 */
function updateToggleLabel() {
  const enabled = elements.globalToggle.checked;
  elements.toggleLabel.textContent = enabled ? 'Mocking Enabled' : 'Mocking Disabled';
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Global toggle
  elements.globalToggle.addEventListener('change', async () => {
    try {
      await sendMessage({ 
        type: 'SET_GLOBAL_ENABLED', 
        payload: { enabled: elements.globalToggle.checked } 
      });
      updateToggleLabel();
      showNotification('Mocking ' + (elements.globalToggle.checked ? 'enabled' : 'disabled'), 'success');
    } catch (error) {
      console.error('Error toggling global state:', error);
      elements.globalToggle.checked = !elements.globalToggle.checked;
    }
  });
  
  // Refresh button
  elements.refreshBtn.addEventListener('click', loadRules);
  
  // Add rule button
  elements.addRuleBtn.addEventListener('click', () => openEditModal());
  
  // Search and filters
  elements.searchInput.addEventListener('input', debounce(applyFilters, 300));
  elements.methodFilter.addEventListener('change', applyFilters);
  elements.statusFilter.addEventListener('change', applyFilters);
  elements.enabledFilter.addEventListener('change', applyFilters);
  
  // Modal
  elements.closeModal.addEventListener('click', closeEditModal);
  elements.cancelEditBtn.addEventListener('click', closeEditModal);
  elements.saveEditBtn.addEventListener('click', saveRule);
  
  // Close modal on background click
  elements.editModal.addEventListener('click', (e) => {
    if (e.target === elements.editModal) {
      closeEditModal();
    }
  });
  
  // Header buttons
  elements.addRequestHeaderBtn.addEventListener('click', () => {
    addHeaderRow(elements.editRequestHeaders);
  });
  
  elements.addResponseHeaderBtn.addEventListener('click', () => {
    addHeaderRow(elements.editResponseHeaders);
  });
  
  elements.formatJsonBtn.addEventListener('click', formatJson);
  
  // Collapsible sections
  document.querySelectorAll('.collapsible-header').forEach(header => {
    header.addEventListener('click', () => {
      const targetId = header.getAttribute('data-target');
      const content = document.getElementById(targetId);
      const icon = header.querySelector('.collapse-icon');
      
      if (content) {
        const isExpanded = content.classList.toggle('expanded');
        icon.textContent = isExpanded ? '▼' : '▶';
      }
    });
  });
}

/**
 * Send message to background script
 */
function sendMessage(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
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
  elements.notification.textContent = message;
  elements.notification.className = `notification ${type}`;
  elements.notification.classList.add('show');
  
  setTimeout(() => {
    elements.notification.classList.remove('show');
  }, 3000);
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
 * Escape HTML
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
