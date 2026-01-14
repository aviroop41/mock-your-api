# Mock your APIs Chrome Extension

A Chrome DevTools extension for mocking API responses. Parse cURL commands, configure mock responses, and intercept browser requests to test how your frontend handles different API responses.

## DevTools
<img width="1854" height="819" alt="image" src="https://github.com/user-attachments/assets/de747799-9c0f-425a-8cc7-5f93fc839e42" />

## Edit Rules
<img width="1853" height="1094" alt="image" src="https://github.com/user-attachments/assets/ceb8f769-c696-44bc-9496-c39b5fdc08a7" />



## Get Started

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in the top right)
3. Click **Load unpacked**
4. Select the `api-mocker-extension` folder
5. The extension is now installed!

## Usage

### Opening the DevTools Panel

1. Open Chrome DevTools (`F12` or `Ctrl+Shift+I` / `⌘+⌥+I` on Mac)
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

## How It Works

The extension uses a content script injection strategy to intercept requests:

1. A content script injects JavaScript into each page
2. The injected script wraps `window.fetch` and `XMLHttpRequest`
3. Before each request, it checks if a matching mock rule exists
4. If a rule matches (by URL + HTTP method), the mock response is returned
5. If no rule matches, the original request proceeds normally


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
