/**
 * Utility functions for parsing markdown in messages
 */

import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { logError } from './secureLogger';

/**
 * Default marked options for consistent markdown rendering
 */
const markedOptions = {
  gfm: true, // GitHub Flavored Markdown
  breaks: true, // Convert line breaks to <br>
  headerIds: false, // Don't add IDs to headers
  mangle: false, // Don't mangle email links
  sanitize: false, // We'll sanitize with DOMPurify later
};

/**
 * DOMPurify options for preventing XSS attacks
 */
const purifyOptions = {
  ALLOWED_TAGS: [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'hr',
    'ul', 'ol', 'li', 'b', 'i', 'strong', 'em', 'a', 'code',
    'pre', 'blockquote', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'span', 'div', 'mark'
  ],
  ALLOWED_ATTR: ['href', 'target', 'class', 'id', 'style'],
  FORBID_TAGS: ['script', 'style', 'iframe', 'form', 'input', 'button'],
  ADD_ATTR: ['target'], // For links to open in new tabs
};

/**
 * Parses markdown to HTML and sanitizes it
 */
export function parseMarkdown(markdownText: string): string {
  try {
    if (!markdownText) return '';
    
    // Parse markdown to HTML
    const html = marked.parse(markdownText, markedOptions);
    
    // Sanitize the HTML to prevent XSS
    const sanitizedHtml = DOMPurify.sanitize(html, purifyOptions);
    
    return sanitizedHtml;
  } catch (error) {
    logError('Error parsing markdown:', error);
    return markdownText; // Return original text if parsing fails
  }
}

/**
 * Detect if content is likely markdown by checking for common markdown patterns
 */
export function isLikelyMarkdown(content: string): boolean {
  if (!content || typeof content !== 'string') return false;
  
  // Common markdown indicators
  const markdownPatterns = [
    /\*\*[^*]+\*\*/,  // Bold: **text**
    /\*[^*]+\*/,      // Italic: *text*
    /\_\_[^_]+\_\_/,  // Bold: __text__
    /\_[^_]+\_/,      // Italic: _text_
    /\n?#+\s/,        // Headers: # Heading
    /\n?\-\s/,        // Unordered list: - item
    /\n?\*\s/,        // Unordered list: * item
    /\n?\d+\.\s/,     // Ordered list: 1. item
    /\[.+\]\(.+\)/,   // Links: [text](url)
    /\n?```[\s\S]*?```/,  // Code blocks: ```code```
    /\n?>\s/,         // Blockquotes: > text
    /\!\[.+\]\(.+\)/, // Images: ![alt](url)
  ];
  
  // Check for any markdown pattern in the content
  return markdownPatterns.some(pattern => pattern.test(content));
}

/**
 * Safely parses markdown if detected, otherwise returns the original text
 */
export function safeParseMarkdown(content: string): string {
  if (!content) return '';
  
  try {
    // Only parse as markdown if likely markdown patterns are detected
    if (isLikelyMarkdown(content)) {
      return parseMarkdown(content);
    }
    
    // Otherwise return the content as-is
    return content;
  } catch (error) {
    logError('Error in safeParseMarkdown:', error);
    return content; // Return original content if anything fails
  }
}

/**
 * Parses content from an AI message that might be JSON or markdown
 */
export function parseAIMessageContent(message: string | Record<string, unknown> | null): string {
  if (!message) return '';
  
  try {
    let content = '';
    
    // If message is an object with content property, use that
    if (typeof message === 'object' && message !== null) {
      content = message.content || '';
      
      // Try to parse if it might be JSON
      if (typeof content === 'string' && (content.startsWith('{') || content.startsWith('['))) {
        try {
          const parsedJson = JSON.parse(content);
          if (parsedJson && parsedJson.output && parsedJson.output.response) {
            content = parsedJson.output.response;
          }
        } catch {
          // If JSON parsing fails, use the original content
        }
      }
    } else if (typeof message === 'string') {
      content = message;
    }
    
    // Finally, parse any markdown in the content
    return safeParseMarkdown(content);
  } catch (error) {
    logError('Error parsing AI message content:', error);
    
    // Fall back to string coercion of the message as last resort
    if (message) {
      return String(message);
    }
    
    return '';
  }
}
