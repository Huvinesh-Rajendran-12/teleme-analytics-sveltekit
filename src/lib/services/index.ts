// Export the n8nService object from the file
import { n8nService, createN8nService } from './n8nService';

// Export the service object for use in components
export { n8nService, createN8nService };

// For backwards compatibility, export individual functions
export const callWithParams = n8nService.callWithParams.bind(n8nService);
export const sendMessage = n8nService.sendMessage.bind(n8nService);
export const callDefaultWebhook = n8nService.callDefaultWebhook.bind(n8nService);
export const cleanup = n8nService.cleanup.bind(n8nService);