/**
 * cURL Parser - Parses cURL commands into structured request objects
 */

class CurlParser {
  /**
   * Parse a cURL command string into a request object
   * @param {string} curlCommand - The cURL command to parse
   * @returns {Object} Parsed request object with url, method, headers, body
   */
  static parse(curlCommand) {
    if (!curlCommand || typeof curlCommand !== 'string') {
      throw new Error('Invalid cURL command');
    }

    // Normalize the command - handle line continuations and clean up
    const normalized = this.normalizeCommand(curlCommand);
    
    // Extract components
    const url = this.extractUrl(normalized);
    const method = this.extractMethod(normalized);
    const headers = this.extractHeaders(normalized);
    const body = this.extractBody(normalized);

    // Auto-detect content-type if not specified but body exists
    if (body && !headers['Content-Type'] && !headers['content-type']) {
      if (this.isJson(body)) {
        headers['Content-Type'] = 'application/json';
      } else if (body.includes('=') && !body.includes('{')) {
        headers['Content-Type'] = 'application/x-www-form-urlencoded';
      }
    }

    return {
      url,
      method: method || (body ? 'POST' : 'GET'),
      headers,
      body
    };
  }

  /**
   * Normalize the cURL command by removing line breaks and extra spaces
   */
  static normalizeCommand(command) {
    return command
      // Remove line continuation backslashes
      .replace(/\\\s*\n/g, ' ')
      // Remove newlines
      .replace(/\n/g, ' ')
      // Normalize multiple spaces
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Extract the URL from the cURL command
   */
  static extractUrl(command) {
    // Remove 'curl' prefix if present
    let cmd = command.replace(/^curl\s+/i, '');
    
    // Try to find URL with --url flag first
    const urlFlagMatch = cmd.match(/(?:--url|-L)\s+['"]?([^'">\s]+)['"]?/);
    if (urlFlagMatch) {
      return urlFlagMatch[1];
    }

    // Try to find quoted URL
    const quotedMatch = cmd.match(/['"]?(https?:\/\/[^'">\s]+)['"]?/);
    if (quotedMatch) {
      return quotedMatch[1];
    }

    // Find URL as standalone argument (not preceded by a flag)
    const tokens = this.tokenize(cmd);
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      // Skip if previous token was a flag that takes an argument
      if (i > 0 && this.isArgFlag(tokens[i - 1])) {
        continue;
      }
      // Check if token looks like a URL
      if (token.match(/^https?:\/\//)) {
        return token;
      }
    }

    throw new Error('Could not extract URL from cURL command');
  }

  /**
   * Extract HTTP method from the cURL command
   */
  static extractMethod(command) {
    // Look for -X or --request flag
    const match = command.match(/(?:-X|--request)\s+['"]?(\w+)['"]?/i);
    if (match) {
      return match[1].toUpperCase();
    }
    return null; // Will be determined based on body presence
  }

  /**
   * Extract headers from the cURL command
   */
  static extractHeaders(command) {
    const headers = {};
    
    // Match -H or --header flags with their values
    const headerRegex = /(?:-H|--header)\s+['"]([^'"]+)['"]/g;
    let match;
    
    while ((match = headerRegex.exec(command)) !== null) {
      const headerStr = match[1];
      const colonIndex = headerStr.indexOf(':');
      if (colonIndex !== -1) {
        const key = headerStr.substring(0, colonIndex).trim();
        const value = headerStr.substring(colonIndex + 1).trim();
        headers[key] = value;
      }
    }

    // Also try matching without quotes
    const headerRegexNoQuote = /(?:-H|--header)\s+([^\s'"]+:[^\s]+)/g;
    while ((match = headerRegexNoQuote.exec(command)) !== null) {
      const headerStr = match[1];
      const colonIndex = headerStr.indexOf(':');
      if (colonIndex !== -1) {
        const key = headerStr.substring(0, colonIndex).trim();
        const value = headerStr.substring(colonIndex + 1).trim();
        if (!headers[key]) {
          headers[key] = value;
        }
      }
    }

    return headers;
  }

  /**
   * Extract request body from the cURL command
   */
  static extractBody(command) {
    // Try different data flags in order of precedence
    const dataFlags = [
      /--data-raw\s+['"](.+?)['"]/s,
      /--data-raw\s+\$'([^']+)'/s,
      /-d\s+['"](.+?)['"]/s,
      /--data\s+['"](.+?)['"]/s,
      /--data-binary\s+['"](.+?)['"]/s,
      /--data-urlencode\s+['"](.+?)['"]/s,
    ];

    for (const regex of dataFlags) {
      const match = command.match(regex);
      if (match) {
        // Unescape common escape sequences
        return match[1]
          .replace(/\\n/g, '\n')
          .replace(/\\r/g, '\r')
          .replace(/\\t/g, '\t')
          .replace(/\\"/g, '"')
          .replace(/\\\\/g, '\\');
      }
    }

    // Try to match unquoted data (simple cases)
    const simpleMatch = command.match(/(?:-d|--data)\s+([^\s-][^\s]*)/);
    if (simpleMatch && !simpleMatch[1].startsWith('-')) {
      return simpleMatch[1];
    }

    return null;
  }

  /**
   * Tokenize a command string respecting quotes
   */
  static tokenize(command) {
    const tokens = [];
    let current = '';
    let inQuote = null;
    
    for (let i = 0; i < command.length; i++) {
      const char = command[i];
      
      if (inQuote) {
        if (char === inQuote && command[i - 1] !== '\\') {
          inQuote = null;
        } else {
          current += char;
        }
      } else if (char === '"' || char === "'") {
        inQuote = char;
      } else if (char === ' ') {
        if (current) {
          tokens.push(current);
          current = '';
        }
      } else {
        current += char;
      }
    }
    
    if (current) {
      tokens.push(current);
    }
    
    return tokens;
  }

  /**
   * Check if a flag takes an argument
   */
  static isArgFlag(flag) {
    const argFlags = [
      '-X', '--request',
      '-H', '--header',
      '-d', '--data', '--data-raw', '--data-binary', '--data-urlencode',
      '-u', '--user',
      '-A', '--user-agent',
      '-e', '--referer',
      '-o', '--output',
      '--url',
      '-L', '--location',
      '-b', '--cookie',
      '-c', '--cookie-jar',
      '--connect-timeout',
      '-m', '--max-time',
    ];
    return argFlags.includes(flag);
  }

  /**
   * Check if a string looks like JSON
   */
  static isJson(str) {
    if (!str) return false;
    const trimmed = str.trim();
    return (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
           (trimmed.startsWith('[') && trimmed.endsWith(']'));
  }

  /**
   * Format a request object back to a cURL command
   * @param {Object} request - Request object with url, method, headers, body
   * @returns {string} cURL command string
   */
  static toCurl(request) {
    const parts = ['curl'];
    
    if (request.method && request.method !== 'GET') {
      parts.push(`-X ${request.method}`);
    }
    
    parts.push(`'${request.url}'`);
    
    if (request.headers) {
      for (const [key, value] of Object.entries(request.headers)) {
        parts.push(`-H '${key}: ${value}'`);
      }
    }
    
    if (request.body) {
      const escaped = request.body.replace(/'/g, "'\\''");
      parts.push(`-d '${escaped}'`);
    }
    
    return parts.join(' \\\n  ');
  }
}

// Make available globally for browser context
if (typeof window !== 'undefined') {
  window.CurlParser = CurlParser;
}

// Export for module context
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CurlParser;
}
