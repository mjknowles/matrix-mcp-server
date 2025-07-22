# matrix-mcp-server

## Overview

`matrix-mcp` is an MCP server implemented in TypeScript that provides tools for interacting with a Matrix homeserver. It includes features such as connecting to a Matrix server, listing joined rooms, fetching room messages, and more.

## Prerequisites

- Node.js 20 or higher
- npm (Node package manager)

## Setup Instructions

1. **Clone the Repository**

   ```bash
   git clone <repository-url>
   cd matrix-mcp-server
   ```

2. **Install Dependencies**

   ```bash
   npm install
   ```

3. **Build the Server**

   ```bash
   npm run build
   ```

4. **Configure the Server**

```bash
cp .env.example .env
# customize .env as appropriate for your setup
```

5. **Test the Server**

```bash
npm run dev
```

## Authentication Options

You have a few authentication options controllable via environment variables.

- `ENABLE_OAUTH`: if `true`, this will activate all the code in this MCP server related to adding OAuth authentication on the server; if `false` anyone can access the server with no `Bearer` token required.
- `ENABLE_TOKEN_EXCHANGE`: if you've set up token exchange capability from your synapse/homeserver IdP client and your dynamically registered MCP clients then you can set this to `true` for the MCP server to take your initial `Bearer` token and exchange it for a token from the `synapse` client. This will make sure you have the right `aud` claim. If `false` then the server will pass along the `Bearer` token to the Matrix `/login` endpoint which will most likely fail unless you are much smarter than I at configuring your homeserver's OAuth setup.

You also have an optional header key/value that you can attach if you can't get token exchange working. You can grab from Element in `All Settings --> Help & About --> Access Token`. The header key would then be `matrix_access_token` and the value would be the access token.

## Add to Claude Code

Remember, the `matrix_access_token` header is an optional header. You should delete it if you have token exchange working.

```bash
claude mcp add --transport http matrix-server http://localhost:3000/mcp -H "matrix_user_id:  @user1:matrix.example.com" -H "matrix_homeserver_url: https://localhost:8008" --header "Authorization: Bearer ${MATRIX_MCP_TOKEN}"
```

## Add to VSCode

Remember, the `MATRIX_ACCESS_TOKEN` header is an optional header. You should delete it if you have token exchange working.

In mcp.json:

```
{
  "servers": {
    "matrix-mcp": {
      "url": "http://localhost:3000/mcp",
      "type": "http",
      "headers": {
        "MATRIX_ACCESS_TOKEN": "${input:matrix-access-token}",
        "MATRIX_USER_ID": "@<your-matrix-username>:<your-homeserver-domain>",
        "MATRIX_HOMESERVER_URL": "<your-homeserver-url>"
      }
    }
  },
    "inputs": [
    {
      "id": "matrix-access-token",
      "type": "promptString",
      "description": "Provide your homeserver access token."
    }
  ]
}
```

## Notes

- This project is for development purposes. For production use, ensure proper session management and security measures are implemented.

## License

This project is licensed under the MIT License.
