# Matrix MCP Server

A comprehensive **Model Context Protocol (MCP) server** that provides secure access to Matrix homeserver functionality. Built with TypeScript, this server enables MCP clients to interact with Matrix rooms, messages, users, and more through a standardized interface.

## Features

- 🔐 **OAuth 2.0 Authentication** with token exchange support
- 📱 **15 Matrix Tools** organized by functionality tiers
- 🏠 **Multi-homeserver Support** with configurable endpoints
- 🔄 **Real-time Operations** with ephemeral client management
- 🚀 **Production Ready** with comprehensive error handling
- 📊 **Rich Responses** with detailed Matrix data

## Quick Start

### Prerequisites

- **Node.js 20+** and npm
- **Matrix homeserver** access (Synapse, Dendrite, etc.)
- **MCP client** (Claude Desktop, VS Code with MCP extension, etc.)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd matrix-mcp-server

# Install dependencies
npm install

# Build the project
npm run build

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Start the server
npm start
```

### Development Mode

```bash
# Start with hot reload (OAuth disabled for easier testing)
npm run dev

# Or start with OAuth enabled
ENABLE_OAUTH=true npm run dev
```

## Available Tools

### 📖 Tier 0: Read-Only Tools

#### **Room Tools**

- **`list-joined-rooms`** - Get all rooms the user has joined

  - _No parameters required_
  - Returns room names, IDs, and member counts

- **`get-room-info`** - Get detailed room information

  - `roomId` (string): Matrix room ID (e.g., `!roomid:domain.com`)
  - Returns name, topic, settings, creator, and member count

- **`get-room-members`** - List all members in a room
  - `roomId` (string): Matrix room ID
  - Returns display names and user IDs of joined members

#### **Message Tools**

- **`get-room-messages`** - Retrieve recent messages from a room

  - `roomId` (string): Matrix room ID
  - `limit` (number, default: 20): Maximum messages to retrieve
  - Returns formatted message content including text and images

- **`get-messages-by-date`** - Filter messages by date range

  - `roomId` (string): Matrix room ID
  - `startDate` (string): ISO 8601 format (e.g., `2024-01-01T00:00:00Z`)
  - `endDate` (string): ISO 8601 format
  - Returns messages within the specified timeframe

- **`identify-active-users`** - Find most active users by message count
  - `roomId` (string): Matrix room ID
  - `limit` (number, default: 10): Maximum users to return
  - Returns users ranked by message activity

#### **User Tools**

- **`get-user-profile`** - Get profile information for any user

  - `targetUserId` (string): Target user's Matrix ID (e.g., `@user:domain.com`)
  - Returns display name, avatar, presence, and shared rooms

- **`get-my-profile`** - Get your own profile information

  - _No parameters required_
  - Returns your profile, device info, and room statistics

- **`get-all-users`** - List all users known to your client
  - _No parameters required_
  - Returns display names and user IDs from client cache

#### **Search Tools**

- **`search-public-rooms`** - Discover public rooms to join
  - `searchTerm` (string, optional): Filter by name or topic
  - `server` (string, optional): Specific server to search
  - `limit` (number, default: 20): Maximum rooms to return
  - Returns room details, topics, and member counts

#### **Notification Tools**

- **`get-notification-counts`** - Check unread messages and mentions

  - `roomFilter` (string, optional): Specific room ID to check
  - Returns unread counts, mentions, and recent activity

- **`get-direct-messages`** - List all DM conversations
  - `includeEmpty` (boolean, default: false): Include DMs with no recent messages
  - Returns DM partners, last messages, and unread status

### ✏️ Tier 1: Action Tools

#### **Messaging Tools**

- **`send-message`** - Send messages to rooms

  - `roomId` (string): Matrix room ID
  - `message` (string): Message content
  - `messageType` (enum: "text" | "html" | "emote", default: "text"): Message formatting
  - `replyToEventId` (string, optional): Event ID to reply to
  - Supports plain text, HTML formatting, and emote actions

- **`send-direct-message`** - Send private messages to users
  - `targetUserId` (string): Target user's Matrix ID
  - `message` (string): Message content
  - Automatically creates DM rooms if needed

#### **Room Management Tools**

- **`create-room`** - Create new Matrix rooms

  - `roomName` (string): Name for the new room
  - `isPrivate` (boolean, default: false): Room privacy setting
  - `topic` (string, optional): Room topic/description
  - `inviteUsers` (array, optional): User IDs to invite initially
  - `roomAlias` (string, optional): Human-readable room alias
  - Creates rooms with appropriate security settings

- **`join-room`** - Join rooms by ID or alias

  - `roomIdOrAlias` (string): Room ID or alias to join
  - Works with invitations and public rooms

- **`leave-room`** - Leave Matrix rooms

  - `roomId` (string): Room ID to leave
  - `reason` (string, optional): Reason for leaving
  - Cleanly exits rooms with optional reason

- **`invite-user`** - Invite users to rooms
  - `roomId` (string): Room to invite user to
  - `targetUserId` (string): User ID to invite
  - Respects room permissions and power levels

#### **Room Administration Tools**

- **`set-room-name`** - Update room display names

  - `roomId` (string): Room to modify
  - `roomName` (string): New room name
  - Requires appropriate room permissions

- **`set-room-topic`** - Update room topics/descriptions
  - `roomId` (string): Room to modify
  - `topic` (string): New room topic
  - Requires appropriate room permissions

## Authentication & Configuration

### Authentication Modes

The server supports two authentication modes:

#### OAuth Mode (`ENABLE_OAUTH=true`)

- Full OAuth 2.0 integration with your identity provider
- Supports token exchange for Matrix homeserver authentication
- Secure multi-user access with proper token management
- Recommended for production deployments

#### Development Mode (`ENABLE_OAUTH=false`)

- Direct access without OAuth authentication
- Requires Matrix access tokens as headers
- Simplified setup for testing and development
- **Not recommended for production**

### Environment Variables

Create a `.env` file with your configuration:

```bash
# Core Configuration
PORT=3000
ENABLE_OAUTH=true                    # Enable OAuth authentication
ENABLE_TOKEN_EXCHANGE=true           # Exchange OAuth tokens for Matrix tokens
CORS_ALLOWED_ORIGINS=""              # Comma-separated allowed origins (empty = allow all)

# HTTPS Configuration (optional)
ENABLE_HTTPS=false
SSL_KEY_PATH="/path/to/private.key"
SSL_CERT_PATH="/path/to/certificate.crt"

# Identity Provider (OAuth mode)
IDP_ISSUER_URL="https://keycloak.example.com/realms/matrix"
IDP_AUTHORIZATION_URL="https://keycloak.example.com/realms/matrix/protocol/openid-connect/auth"
IDP_TOKEN_URL="https://keycloak.example.com/realms/matrix/protocol/openid-connect/token"
OAUTH_CALLBACK_URL="http://localhost:3000/callback"

# Matrix Configuration
MATRIX_HOMESERVER_URL="https://matrix.example.com"
MATRIX_DOMAIN="matrix.example.com"
MATRIX_CLIENT_ID="your-matrix-client-id"
MATRIX_CLIENT_SECRET="your-matrix-client-secret"
```

## Client Integration

### Claude Code

Remember, the `MATRIX_ACCESS_TOKEN` header is an optional header. You should delete it if you have token exchange working. Obtain `MATRIX_MCP_TOKEN` from MCP Inspector.

```bash
claude mcp add --transport http matrix-server http://localhost:3000/mcp -H "matrix_user_id:  @user1:matrix.example.com" -H "matrix_homeserver_url: https://localhost:8008" -H "matrix_access_token: ${MATRIX_ACCESS_TOKEN}" -H "Authorization: Bearer ${MATRIX_MCP_TOKEN}"
```

### VS Code

Remember, the `matrix_access_token` header is an optional header. You should delete it if you have token exchange working.

In mcp.json:

```json
{
  "servers": {
    "matrix-mcp": {
      "url": "http://localhost:3000/mcp",
      "type": "http",
      "headers": {
        "matrix_access_token": "${input:matrix-access-token}",
        "matrix_user_id": "@<your-matrix-username>:<your-homeserver-domain>",
        "matrix_homeserver_url": "<your-homeserver-url>"
      }
    }
  },
  "inputs": [
    {
      "id": "matrix-access-token",
      "type": "promptString",
      "description": "Your OAuth access token"
    }
  ]
}
```

### Testing with MCP Inspector

```bash
# Start the server
npm run dev

# In another terminal, run the inspector
npx @modelcontextprotocol/inspector
```

Connect to `http://localhost:3000/mcp` to authenticate and test all available tools.

## Development

### Available Scripts

```bash
npm run build      # Build TypeScript to dist/
npm run dev        # Development server with hot reload
npm run start      # Production server
npm run lint       # Run ESLint
npm run test       # Run tests
```

### Project Structure

```
src/
├── http-server.ts           # Main HTTP server entry point
├── server.ts               # MCP server configuration
├── tools/                  # Tool implementations
│   ├── tier0/             # Read-only tools
│   │   ├── rooms.ts       # Room information tools
│   │   ├── messages.ts    # Message retrieval tools
│   │   ├── users.ts       # User profile tools
│   │   ├── search.ts      # Room search tools
│   │   └── notifications.ts # Notification tools
│   └── tier1/             # Action tools
│       ├── messaging.ts   # Message sending tools
│       ├── room-management.ts # Room lifecycle tools
│       └── room-admin.ts  # Room administration tools
├── matrix/                # Matrix client management
├── utils/                 # Helper utilities
└── types/                 # TypeScript type definitions
```

## Security Considerations

- 🔐 **Token Management**: All Matrix clients are ephemeral and cleaned up after operations
- 🛡️ **OAuth Integration**: Prevents direct Matrix token exposure through OAuth proxy
- 🔍 **Permission Checks**: Respects Matrix room power levels and permissions
- 🚫 **Input Validation**: Comprehensive parameter validation using Zod schemas
- 🌐 **CORS Support**: Configurable origin restrictions for web clients

## Architecture

The server implements a three-layer architecture:

1. **HTTP Layer** (`http-server.ts`): Express server with OAuth integration
2. **MCP Layer** (`server.ts`): Tool registration and request routing
3. **Matrix Layer** (`tools/`): Matrix homeserver communication

Each tool creates ephemeral Matrix clients that authenticate via your configured method, perform the requested operation, and clean up automatically.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
