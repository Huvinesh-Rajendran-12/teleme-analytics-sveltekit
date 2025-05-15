/**
 * Utility function for parsing messages from different applications
 */

export interface ParsedMessage {
  role: string;
  content: string;
  rawContent: string;
}

/**
 * Message interface for type safety
 */
export interface Message {
  type?: string;
  role?: string;
  content?: string | Record<string, unknown>;
  timestamp?: Date;
  id?: string | number;
}

/**
 * Parses a message by its role/type
 * @param message The message to parse
 * @returns Parsed message
 */
export function parseMessage(message: Message): ParsedMessage {
  // Check if message is null or undefined
  if (!message) {
    return {
      role: 'unknown',
      content: '',
      rawContent: ''
    };
  }
  
  // Determine if it's an AI message
  const isAI = message.type === 'ai' || message.role === 'assistant';
  
  // Get the role
  const role = message.type || message.role || (isAI ? 'ai' : 'human');
  
  // Get the content, with special handling for AI messages
  let content = '';
  if (message.content !== undefined && message.content !== null) {
    try {
      content = typeof message.content === 'string' 
        ? message.content 
        : JSON.stringify(message.content);
    } catch (error) {
      console.error('Error converting message content to string:', error);
      content = String(message.content || '');
    }
  }
  
  const rawContent = content;
  
  // For AI messages, try to parse JSON content
  if (isAI && typeof content === 'string' && content.trim() !== '') {
    try {
      const parsed = JSON.parse(content);
      
      // Handle health tracker summary format
      if (parsed.output && parsed.output.answer) {
        content = parsed.output.answer;
      }
      
      // Handle other message format patterns as needed
    } catch {
      // Not JSON or not in the expected format, use as is
    }
  }
  
  return {
    role,
    content,
    rawContent
  };
}
