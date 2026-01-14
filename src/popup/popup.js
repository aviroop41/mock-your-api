/**
 * Popup Script - Mock your APIs extension
 * Handles popup UI interactions and state display
 */

// DOM Elements
const globalToggle = document.getElementById('globalToggle');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const toggleLabel = document.getElementById('toggleLabel');
const totalRulesEl = document.getElementById('totalRules');
const activeRulesEl = document.getElementById('activeRules');
const shortcutKey = document.getElementById('shortcutKey');
const shortcutKeyAlt = document.getElementById('shortcutKeyAlt');
const openRulesEditorBtn = document.getElementById('openRulesEditorBtn');

// Detect OS for keyboard shortcuts
const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

// Set correct keyboard shortcuts based on OS
function setKeyboardShortcuts() {
  if (isMac) {
    shortcutKey.textContent = 'F12';
    shortcutKeyAlt.textContent = '⌘+⌥+I';
  } else {
    shortcutKey.textContent = 'F12';
    shortcutKeyAlt.textContent = 'Ctrl+Shift+I';
  }
}

// Initialize popup
async function init() {
  setKeyboardShortcuts();
  await loadState();
  setupEventListeners();
}

// Load current state from storage
async function loadState() {
  try {
    // Get global enabled state
    const enabledResponse = await chrome.runtime.sendMessage({ type: 'GET_GLOBAL_ENABLED' });
    updateStatusUI(enabledResponse.enabled);
    
    // Get rules count
    const rulesResponse = await chrome.runtime.sendMessage({ type: 'GET_RULES' });
    const rules = rulesResponse.rules || [];
    const activeCount = rules.filter(r => r.enabled).length;
    
    totalRulesEl.textContent = rules.length;
    activeRulesEl.textContent = activeCount;
  } catch (error) {
    console.error('Error loading state:', error);
    statusText.textContent = 'Error';
    statusDot.className = 'status-dot error';
  }
}

// Update the status UI based on enabled state
function updateStatusUI(enabled) {
  globalToggle.checked = enabled;
  
  if (enabled) {
    statusDot.className = 'status-dot enabled';
    statusText.textContent = 'Enabled';
    statusText.className = 'status-text enabled';
    toggleLabel.textContent = 'Mocking enabled';
  } else {
    statusDot.className = 'status-dot disabled';
    statusText.textContent = 'Disabled';
    statusText.className = 'status-text disabled';
    toggleLabel.textContent = 'Mocking disabled';
  }
}

// Setup event listeners
function setupEventListeners() {
  // Global toggle
  globalToggle.addEventListener('change', async (e) => {
    const enabled = e.target.checked;
    
    try {
      await chrome.runtime.sendMessage({ 
        type: 'SET_GLOBAL_ENABLED', 
        payload: { enabled } 
      });
      updateStatusUI(enabled);
    } catch (error) {
      console.error('Error toggling state:', error);
      // Revert the toggle
      globalToggle.checked = !enabled;
    }
  });
  
  // Collapsible help section
  const helpHeader = document.getElementById('helpHeader');
  const helpContent = document.getElementById('helpContent');
  const collapseIcon = helpHeader.querySelector('.collapse-icon');
  
  helpHeader.addEventListener('click', () => {
    const isExpanded = helpContent.classList.toggle('expanded');
    collapseIcon.textContent = isExpanded ? '▼' : '▶';
  });
  
  // Open Rules Editor button
  openRulesEditorBtn.addEventListener('click', () => {
    chrome.tabs.create({
      url: chrome.runtime.getURL('src/rules-editor/rules-editor.html')
    });
  });
}

// Listen for storage changes to update UI in real-time
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local') {
    if (changes.globalEnabled) {
      updateStatusUI(changes.globalEnabled.newValue);
    }
    if (changes.mockRules) {
      const rules = changes.mockRules.newValue || [];
      const activeCount = rules.filter(r => r.enabled).length;
      totalRulesEl.textContent = rules.length;
      activeRulesEl.textContent = activeCount;
    }
  }
});

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);
