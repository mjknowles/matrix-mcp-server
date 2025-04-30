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

3. **Run the Server**

   Start the MCP server in development mode:

   ```bash
   npm run dev
   ```

   To build and run the server in production mode:

   ```bash
   npm run build
   npm start
   ```

   By default, the server will run on `http://localhost:3000`.

## Test the Server

You can test the server using tools like Postman or curl. For example, to connect to a Matrix homeserver, send a POST request to `/connect-matrix` with the following JSON payload:

```json
{
  "homeserverUrl": "https://matrix.org",
  "username": "your-username",
  "password": "your-password"
}
```

### Add to VSCode

```
{
  "servers": {
    "matrix-mcp": {
      "type": "stdio",
      "command": "<full-path-to>/node",
      "args": [
        "<full-path-to>/matrix-mcp-server/dist/server.js"
      ]
    }
  }
}
```

## Notes

- This project is for development purposes. For production use, ensure proper session management and security measures are implemented.
- Refer to the `src/server.ts` file for additional configuration options.

## License

This project is licensed under the MIT License.
