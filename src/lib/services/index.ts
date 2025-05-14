// Export the n8nService functions for easy access
import { callWithParams, sendMessage, cleanup } from './n8nService';

// Export as a single object for use in components
export const n8nService = {
  callWithParams,
  sendMessage,
  cleanup
};

// Also export individual functions for direct imports
export { callWithParams, sendMessage, cleanup };