import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

/**
 * Standard context information extracted from MCP request headers
 */
export interface ToolContext {
  matrixUserId: string;
  homeserverUrl: string;
  accessToken: string;
}

/**
 * MCP Tool handler function signature
 */
export type ToolHandler<T = any> = (
  input: T,
  context: { requestInfo?: any; authInfo?: any }
) => Promise<CallToolResult>;

/**
 * Tool definition for registration
 */
export interface ToolDefinition {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, z.ZodType>;
  handler: ToolHandler;
}

/**
 * Tool registration function signature
 */
export type ToolRegistrationFunction = (server: any) => void;