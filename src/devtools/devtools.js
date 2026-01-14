// Create the Mock your APIs panel in DevTools
chrome.devtools.panels.create(
  "Mocking on API's door",
  null, // No icon for now
  'src/devtools/panel.html',
  (panel) => {
    console.log('Mock your APIs panel created');
  }
);
