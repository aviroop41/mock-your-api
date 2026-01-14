# Mock your APIs Chrome Extension

A Chrome DevTools extension for mocking API responses. Parse cURL commands, configure mock responses, and intercept browser requests to test how your frontend handles different API responses.

## Features

- **cURL Parser**: Paste cURL commands to automatically extract URL, method, headers, and body
- **Request Interception**: Intercepts `fetch()` and `XMLHttpRequest` calls
- **Flexible Mocking**: Configure custom status codes, headers, and response bodies
- **URL + Method Matching**: Rules match requests based on exact URL and HTTP method
- **DevTools Integration**: Dedicated panel in Chrome DevTools for easy access
- **Enable/Disable Toggle**: Quickly enable or disable all mocking globally
- **Per-Rule Toggles**: Enable or disable individual mock rules
- **Dark Theme**: Matches Chrome DevTools aesthetic

## Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in the top right)
3. Click **Load unpacked**
4. Select the `api-mocker-extension` folder
5. The extension is now installed!

## Usage

### Opening the Panel

1. Open Chrome DevTools (F12 or Right-click > Inspect)
2. Look for the **Mock your APIs** tab in DevTools
3. Click on it to open the mocking panel

### Creating a Mock Rule

1. **Option A - From cURL**:
   - Paste a cURL command in the text area
   - Click **Parse** to extract request details
   - The URL, method, headers, and body will be auto-filled

2. **Option B - Manual Entry**:
   - Select the HTTP method (GET, POST, PUT, etc.)
   - Enter the full URL to mock
   - Optionally add request headers

3. **Configure the Mock Response**:
   - Set the status code (e.g., 200, 404, 500)
   - Add response headers (Content-Type is added by default)
   - Enter the response body (supports JSON, text, etc.)

4. Click **Save Rule**

### Managing Rules

- **Toggle Rule**: Use the switch on each rule card to enable/disable
- **Edit Rule**: Click the **Edit** button to modify a rule
- **Delete Rule**: Click the **Delete** button to remove a rule
- **Search**: Use the search box to filter rules by URL or method
- **Clear All**: Remove all rules at once

### Global Toggle

Use the **Mocking Enabled** switch in the header to quickly enable or disable all mocking without deleting your rules.

## How It Works

The extension uses a content script injection strategy to intercept requests:

1. A content script injects JavaScript into each page
2. The injected script wraps `window.fetch` and `XMLHttpRequest`
3. Before each request, it checks if a matching mock rule exists
4. If a rule matches (by URL + HTTP method), the mock response is returned
5. If no rule matches, the original request proceeds normally

## Example cURL Commands

```bash
# GET request
curl 'https://api.example.com/users' -H 'Authorization: Bearer token123'

# POST request with JSON body
curl 'https://api.example.com/users' \
  -X POST \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer token123' \
  -d '{"name": "John", "email": "john@example.com"}'

# PUT request
curl 'https://api.example.com/users/1' \
  -X PUT \
  -H 'Content-Type: application/json' \
  -d '{"name": "Jane"}'
```

## Limitations

- Only intercepts requests from the page context (not service workers or other extensions)
- Requires the DevTools to be open for the panel to function
- Rules are stored locally in the browser

## Troubleshooting

**Mocking not working?**
1. Ensure mocking is enabled (global toggle in header)
2. Check that the specific rule is enabled
3. Verify the URL and method match exactly
4. Refresh the page after adding new rules
5. Check the browser console for `[Mock your APIs]` logs

**Extension not appearing in DevTools?**
1. Close and reopen DevTools
2. Check that the extension is enabled in `chrome://extensions/`
3. Try reloading the extension

## License

MIT
