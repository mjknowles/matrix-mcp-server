/**
 * Matrix MCP Server
 * 
 * A Model Context Protocol (MCP) server that provides tools for interacting with Matrix homeservers.
 * Supports both OAuth-based authentication with token exchange and direct Matrix access token authentication.
 */

// Export main server
export { default } from "./server.js";

// Export core modules for extensibility
export * from "./auth/tokenExchange.js";
export * from "./matrix/client.js";
export * from "./matrix/messageProcessor.js";
export * from "./schemas/toolSchemas.js";