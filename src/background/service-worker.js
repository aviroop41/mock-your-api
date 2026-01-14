/**
 * Service Worker - Background script for Mock your APIs extension
 * Handles storage, message passing, and rule management
 */

// Storage keys
const STORAGE_KEYS = {
  RULES: 'mockRules',
  ENABLED: 'globalEnabled',
};

// Initialize default state on install
chrome.runtime.onInstalled.addListener(async () => {
  const existing = await chrome.storage.local.get([STORAGE_KEYS.RULES, STORAGE_KEYS.ENABLED]);
  
  if (!existing[STORAGE_KEYS.RULES]) {
    await chrome.storage.local.set({ [STORAGE_KEYS.RULES]: [] });
  }
  
  if (existing[STORAGE_KEYS.ENABLED] === undefined) {
    await chrome.storage.local.set({ [STORAGE_KEYS.ENABLED]: true });
  }
  
  console.log('Mock your APIs extension installed');
});

// Message handler for communication with DevTools and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender)
    .then(sendResponse)
    .catch(error => {
      console.error('Message handler error:', error);
      sendResponse({ error: error.message });
    });
  
  // Return true to indicate async response
  return true;
});

/**
 * Handle incoming messages
 */
async function handleMessage(message, sender) {
  const { type, payload } = message;
  
  switch (type) {
    case 'GET_RULES':
      return await getRules();
    
    case 'ADD_RULE':
      return await addRule(payload);
    
    case 'UPDATE_RULE':
      return await updateRule(payload);
    
    case 'DELETE_RULE':
      return await deleteRule(payload.id);
    
    case 'TOGGLE_RULE':
      return await toggleRule(payload.id);
    
    case 'GET_GLOBAL_ENABLED':
      return await getGlobalEnabled();
    
    case 'SET_GLOBAL_ENABLED':
      return await setGlobalEnabled(payload.enabled);
    
    case 'CHECK_MOCK':
      return await checkMock(payload);
    
    case 'CLEAR_ALL_RULES':
      return await clearAllRules();
    
    default:
      throw new Error(`Unknown message type: ${type}`);
  }
}

/**
 * Get all mock rules
 */
async function getRules() {
  const result = await chrome.storage.local.get(STORAGE_KEYS.RULES);
  return { rules: result[STORAGE_KEYS.RULES] || [] };
}

/**
 * Add a new mock rule
 */
async function addRule(ruleData) {
  const result = await chrome.storage.local.get(STORAGE_KEYS.RULES);
  const rules = result[STORAGE_KEYS.RULES] || [];
  
  const newRule = {
    id: generateId(),
    enabled: true,
    name: ruleData.name || null,
    request: {
      url: ruleData.request.url,
      method: ruleData.request.method || 'GET',
      headers: ruleData.request.headers || {},
      body: ruleData.request.body || null,
    },
    response: {
      status: ruleData.response.status || 200,
      statusText: ruleData.response.statusText || 'OK',
      headers: ruleData.response.headers || { 'Content-Type': 'application/json' },
      body: ruleData.response.body || '',
    },
    createdAt: Date.now(),
  };
  
  rules.push(newRule);
  await chrome.storage.local.set({ [STORAGE_KEYS.RULES]: rules });
  
  // Notify all tabs about the rule change
  notifyTabs({ type: 'RULES_UPDATED' });
  
  return { success: true, rule: newRule };
}

/**
 * Update an existing mock rule
 */
async function updateRule(ruleData) {
  const result = await chrome.storage.local.get(STORAGE_KEYS.RULES);
  const rules = result[STORAGE_KEYS.RULES] || [];
  
  const index = rules.findIndex(r => r.id === ruleData.id);
  if (index === -1) {
    throw new Error(`Rule not found: ${ruleData.id}`);
  }
  
  rules[index] = {
    ...rules[index],
    ...ruleData,
    updatedAt: Date.now(),
  };
  
  await chrome.storage.local.set({ [STORAGE_KEYS.RULES]: rules });
  
  // Notify all tabs about the rule change
  notifyTabs({ type: 'RULES_UPDATED' });
  
  return { success: true, rule: rules[index] };
}

/**
 * Delete a mock rule
 */
async function deleteRule(ruleId) {
  const result = await chrome.storage.local.get(STORAGE_KEYS.RULES);
  const rules = result[STORAGE_KEYS.RULES] || [];
  
  const filteredRules = rules.filter(r => r.id !== ruleId);
  
  if (filteredRules.length === rules.length) {
    throw new Error(`Rule not found: ${ruleId}`);
  }
  
  await chrome.storage.local.set({ [STORAGE_KEYS.RULES]: filteredRules });
  
  // Notify all tabs about the rule change
  notifyTabs({ type: 'RULES_UPDATED' });
  
  return { success: true };
}

/**
 * Toggle a rule's enabled state
 */
async function toggleRule(ruleId) {
  const result = await chrome.storage.local.get(STORAGE_KEYS.RULES);
  const rules = result[STORAGE_KEYS.RULES] || [];
  
  const rule = rules.find(r => r.id === ruleId);
  if (!rule) {
    throw new Error(`Rule not found: ${ruleId}`);
  }
  
  rule.enabled = !rule.enabled;
  await chrome.storage.local.set({ [STORAGE_KEYS.RULES]: rules });
  
  // Notify all tabs about the rule change
  notifyTabs({ type: 'RULES_UPDATED' });
  
  return { success: true, enabled: rule.enabled };
}

/**
 * Get global enabled state
 */
async function getGlobalEnabled() {
  const result = await chrome.storage.local.get(STORAGE_KEYS.ENABLED);
  return { enabled: result[STORAGE_KEYS.ENABLED] !== false };
}

/**
 * Set global enabled state
 */
async function setGlobalEnabled(enabled) {
  await chrome.storage.local.set({ [STORAGE_KEYS.ENABLED]: enabled });
  
  // Notify all tabs about the state change
  notifyTabs({ type: 'GLOBAL_STATE_CHANGED', enabled });
  
  return { success: true, enabled };
}

/**
 * Check if a request should be mocked
 * Matches on both URL and HTTP method
 */
async function checkMock(requestInfo) {
  const globalResult = await chrome.storage.local.get(STORAGE_KEYS.ENABLED);
  if (globalResult[STORAGE_KEYS.ENABLED] === false) {
    return { shouldMock: false };
  }
  
  const rulesResult = await chrome.storage.local.get(STORAGE_KEYS.RULES);
  const rules = rulesResult[STORAGE_KEYS.RULES] || [];
  
  // Find matching rule by URL and method
  const matchingRule = rules.find(rule => {
    if (!rule.enabled) return false;
    
    // Match URL exactly
    const urlMatch = rule.request.url === requestInfo.url;
    
    // Match HTTP method (case-insensitive)
    const methodMatch = rule.request.method.toUpperCase() === requestInfo.method.toUpperCase();
    
    return urlMatch && methodMatch;
  });
  
  if (matchingRule) {
    return {
      shouldMock: true,
      response: matchingRule.response,
      ruleId: matchingRule.id,
    };
  }
  
  return { shouldMock: false };
}

/**
 * Clear all mock rules
 */
async function clearAllRules() {
  await chrome.storage.local.set({ [STORAGE_KEYS.RULES]: [] });
  
  // Notify all tabs about the rule change
  notifyTabs({ type: 'RULES_UPDATED' });
  
  return { success: true };
}

/**
 * Generate a unique ID for rules
 */
function generateId() {
  return `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Notify all tabs about changes
 */
async function notifyTabs(message) {
  try {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      try {
        await chrome.tabs.sendMessage(tab.id, message);
      } catch (e) {
        // Tab might not have content script loaded, ignore
      }
    }
  } catch (e) {
    console.error('Error notifying tabs:', e);
  }
}

console.log('Mock your APIs service worker loaded');
