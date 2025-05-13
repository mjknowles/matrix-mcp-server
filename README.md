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

4. **Test the Server**

Run Inspector to test the server. Make sure you get an access token via the `connect-matrix` tool first.

```bash
npm run dev
npx @modelcontextprotocol/inspector
```

## Add to VSCode

In mcp.json:

```
{
  "servers": {
    "matrix-mcp": {
      "url": "http://localhost:3000/mcp"
    }
  }
}
```

## Notes

- This project is for development purposes. For production use, ensure proper session management and security measures are implemented.
- Refer to the `src/server.ts` file for additional configuration options.

## License

This project is licensed under the MIT License.
