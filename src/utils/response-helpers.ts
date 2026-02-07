/**
 * Helper functions for creating MCP response objects
 */

export interface MCPResponse {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}

/**
 * Create a success response
 */
export function success(text: string) {
  return {
    content: [{ type: 'text', text }],
  };
}

/**
 * Create an error response
 */
export function error(message: string) {
  return {
    content: [{ type: 'text', text: `Error: ${message}` }],
    isError: true,
  };
}

/**
 * Create a response with formatted data
 */
export function data(obj: any) {
  return {
    content: [{ type: 'text', text: JSON.stringify(obj, null, 2) }],
  };
}
