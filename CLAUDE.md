# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is a Matrix MCP (Model Context Protocol) server implemented in TypeScript that provides secure access to Matrix homeserver functionality. The server acts as a bridge between MCP clients and Matrix homeservers, implementing OAuth 2.0 token exchange with Keycloak for authentication.

## Core Architecture

### HTTP Server Layer (`src/http-server.ts`)

- Express-based HTTP server exposing MCP endpoints
- OAuth 2.0 integration with Keycloak authentication provider
- Proxy OAuth provider for token verification and client management
- Serves on port 3000 with `/mcp` endpoint for MCP communication

### MCP Server Implementation (`src/server.ts`)

- Core MCP server with Matrix-specific tools
- Implements token exchange flow with Keycloak for Matrix authentication
- Provides tools for Matrix operations: room listing, message retrieval, member management
- Each tool creates ephemeral Matrix clients that authenticate via token exchange

### Authentication Flow (`src/verifyAccessToken.ts`)

- JWT token verification using Keycloak's JWKS endpoint
- Fetches user information from Keycloak userinfo endpoint
- Handles self-signed certificates for local development

### Request Routing (`src/routes.ts`, `src/route-handlers.ts`)

- Simple Express router handling POST requests for MCP communication
- Uses StreamableHTTPServerTransport for MCP protocol handling
- Returns 405 for non-POST methods

## Development Commands

```bash
# Install dependencies
npm install

# Build TypeScript to dist/
npm run build

# Development server with hot reload (no OAuth)
npm run dev

# Development server with OAuth enabled
ENABLE_OAUTH=true npm run dev

# Production server
npm start

# Production server with OAuth
ENABLE_OAUTH=true npm start

# Linting
npm run lint

# Testing
npm test
```

## Matrix Tools Available

The server provides these MCP tools (all require `matrixUserId` parameter):

- `list-joined-rooms`: Get all rooms the authenticated user has joined
- `get-room-messages`: Fetch recent messages from a specific room
- `get-room-members`: List members of a specific room
- `get-messages-by-date`: Filter messages by date range
- `identify-active-users`: Find most active users in a room by message count
- `get-all-users`: List all users known to the Matrix client

**Required Parameters for All Tools:**

- `matrixUserId`: Full Matrix user ID (e.g., `@username:domain.com`)
- `matrixAccessToken` (when OAuth disabled): Direct Matrix access token

**Authentication Modes:**

- **OAuth enabled**: Uses OAuth token exchange, `matrixAccessToken` parameter ignored
- **OAuth disabled**: Requires `matrixAccessToken` parameter with valid Matrix access token

## Configuration Notes

- The server is IDP-agnostic and can work with any OAuth 2.0 provider (Keycloak, Auth0, Okta, etc.)
- Default configuration is set up for Keycloak but can be customized via environment variables
- Matrix client credentials are now configurable via environment variables
- All HTTPS requests use `rejectUnauthorized: false` for local development

## API Changes

**Breaking Change**: All Matrix tools now require explicit `matrixUserId` parameter instead of extracting username from OAuth token. This provides better control and works in both OAuth and non-OAuth modes.

**Usage Examples:**

```json
// OAuth mode (matrixAccessToken ignored)
{
  "matrixUserId": "@alice:example.com",
  "roomId": "!abc123:example.com"
}

// Non-OAuth mode (requires matrixAccessToken)
{
  "matrixUserId": "@alice:example.com",
  "matrixAccessToken": "syt_YWxpY2U_abc123...",
  "roomId": "!abc123:example.com"
}
```

## Environment Variables

### Core Configuration

- `PORT`: Server port (default: 3000)
- `ENABLE_OAUTH`: Set to "true" to enable OAuth authentication flow. When disabled, the MCP endpoint is accessible without authentication
- `ENABLE_TOKEN_EXCHANGE`: Set to "true" to exchange the access token used to access this MCP server for one from the Matrix client in your IdP (assuming both this mcp server and your homeserver share the same IDP)
- `CORS_ALLOWED_ORIGINS`: Comma-separated list of allowed origins for CORS. Leave empty for development (allows all origins). For production, specify allowed domains (e.g., "https://yourdomain.com,https://app.yourdomain.com")

### HTTPS Configuration

- `ENABLE_HTTPS`: Set to "true" to enable HTTPS, "false" for HTTP (default: false for development)
- `SSL_KEY_PATH`: Path to SSL private key file (required when ENABLE_HTTPS=true)
- `SSL_CERT_PATH`: Path to SSL certificate file (required when ENABLE_HTTPS=true)

### Identity Provider Configuration (OAuth mode only)

- `IDP_ISSUER_URL`: OAuth issuer URL (default: Keycloak localhost)
- `IDP_AUTHORIZATION_URL`: OAuth authorization endpoint
- `IDP_TOKEN_URL`: OAuth token endpoint
- `IDP_REGISTRATION_URL`: OAuth client registration endpoint
- `IDP_REVOCATION_URL`: OAuth token revocation endpoint
- `OAUTH_CALLBACK_URL`: OAuth callback URL (default: http://localhost:3000/callback)
- `MCP_SERVER_URL`: MCP server base URL (default: http://localhost:3000/mcp)

### Matrix Configuration

- `MATRIX_HOMESERVER_URL`: Matrix homeserver URL (default: https://localhost:8008/)
- `MATRIX_DOMAIN`: Matrix domain (default: matrix.example.com)
- `MATRIX_CLIENT_ID`: Matrix client ID for token exchange
- `MATRIX_CLIENT_SECRET`: Matrix client secret for token exchange

A `.env` file is provided with sensible defaults. Copy and modify as needed for your environment.

## Token Exchange Flow (OAuth Mode Only)

When `ENABLE_OAUTH=true` and `ENABLE_TOKEN_EXCHANGE=true`:

1. MCP client provides initial OAuth token
2. Server exchanges token with Keycloak using client credentials
3. Exchanged token used for Matrix homeserver authentication
4. Matrix client created with exchanged access token
5. Matrix operations performed, then client cleaned up

When OAuth is disabled, the server bypasses authentication entirely - this is experimental and intended for development/testing only.

## Testing with MCP Inspector

```bash
# Start development server without OAuth (simpler for testing)
npm run dev

# OR start with OAuth enabled
ENABLE_OAUTH=true npm run dev

# In separate terminal, run MCP inspector
npx @modelcontextprotocol/inspector
```

Connect to `http://localhost:3000/mcp`. With OAuth disabled, no authentication is required. With OAuth enabled, you'll need to authenticate through the OAuth flow.

## Security Considerations

- All Matrix client instances are ephemeral and cleaned up after operations
- OAuth token exchange prevents direct Matrix token exposure
- User identification derived from email in JWT token
- Local development uses self-signed certificates (not for production)
