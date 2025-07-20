# Source Code Structure

This directory contains the modular implementation of the Matrix MCP Server.

## Directory Structure

```
src/
├── auth/                  # Authentication and token exchange logic
│   └── tokenExchange.ts   # OAuth 2.0 token exchange implementation
├── matrix/                # Matrix-specific functionality
│   ├── client.ts          # Matrix client creation and management
│   └── messageProcessor.ts # Message processing and filtering utilities
├── schemas/               # Zod schemas for tool parameters
│   └── toolSchemas.ts     # Shared parameter schemas for all tools
├── http-server.ts         # HTTP server with optional OAuth middleware
├── routes.ts              # Express routing configuration
├── route-handlers.ts      # HTTP request handlers for MCP protocol
├── verifyAccessToken.ts   # OAuth token verification
├── server.ts              # Main MCP server with Matrix tools
└── index.ts               # Main entry point and exports

```

## Key Modules

### `auth/tokenExchange.ts`
- OAuth 2.0 token exchange implementation
- Exchanges IDP tokens for Matrix-specific tokens
- Configurable for any OAuth 2.0 provider

### `matrix/client.ts`
- Matrix client creation and lifecycle management
- Handles both OAuth and direct token authentication
- Includes proper client cleanup utilities

### `matrix/messageProcessor.ts`
- Message processing utilities
- Supports text and image message types
- Date-based filtering and user activity analysis

### `schemas/toolSchemas.ts`
- Shared Zod schemas for tool parameters
- Consistent parameter validation across all tools
- Reusable schema components

### `server.ts`
- Main MCP server implementation
- Defines all Matrix-related tools
- Clean separation of concerns using imported modules

## Design Principles

1. **Modularity**: Each module has a single responsibility
2. **Reusability**: Shared utilities are extracted into separate modules
3. **Type Safety**: Full TypeScript typing throughout
4. **Clean Architecture**: Clear separation between authentication, Matrix operations, and MCP protocol handling
5. **Open Source Ready**: Well-documented, organized codebase suitable for public release