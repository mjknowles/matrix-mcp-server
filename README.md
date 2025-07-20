# matrix-mcp-server

## Overview

`matrix-mcp` is an MCP server implemented in TypeScript that provides tools for interacting with a Matrix homeserver. It includes features such as connecting to a Matrix server, listing joined rooms, fetching room messages, and more.

## Prerequisites

- Node.js 20 or higher
- npm (Node package manager)
- access token; visible in Element in `All Settings --> Help & About --> Access Token`

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

4. **Test the Server**

```bash
npm run dev
```

## Add to VSCode

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
