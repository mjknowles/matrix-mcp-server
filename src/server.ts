import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { MatrixClient } from "matrix-js-sdk";
import { z } from "zod";

const server = new McpServer(
  {
    name: "matrix-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      logging: {},
      resources: {},
      tools: {},
    },
  }
);

let matrixClientInstance: MatrixClient | null = null;

// Tool: Connect to Matrix homeserver
server.tool(
  "connect-matrix",
  {
    homeserverUrl: z.string(),
    userId: z.string().optional(),
    token: z.string().optional(),
    username: z.string().optional(),
    password: z.string().optional(),
  },
  async ({ homeserverUrl, userId, token, username, password }) => {
    if (matrixClientInstance) {
      server.server.sendLoggingMessage({
        level: "warning",
        data: "Matrix client already connected. Reconnecting.",
      });
      matrixClientInstance.stopClient();
      matrixClientInstance = null;
    }

    try {
      if (token) {
        server.server.sendLoggingMessage({
          level: "info",
          data: "Initializing MatrixClient with token...",
        });
        matrixClientInstance = new MatrixClient({
          baseUrl: homeserverUrl,
          accessToken: token,
          userId,
        });
      } else if (username && password) {
        server.server.sendLoggingMessage({
          level: "info",
          data: "Initializing MatrixClient with username and password...",
        });
        matrixClientInstance = new MatrixClient({
          baseUrl: homeserverUrl,
        });
        await matrixClientInstance.login("m.login.password", {
          user: username,
          password,
        });
      } else {
        throw new Error(
          "Insufficient details. Provide either token or username/password."
        );
      }

      server.server.sendLoggingMessage({
        level: "info",
        data: "Starting Matrix client...",
      });
      await matrixClientInstance.startClient();
      server.server.sendLoggingMessage({
        level: "info",
        data: "Matrix client started successfully.",
      });
      return {
        content: [
          {
            type: "text",
            text: `Connected to ${homeserverUrl}`,
          },
        ],
      };
    } catch (error: any) {
      server.server.sendLoggingMessage({
        level: "error",
        data: `Failed to connect to Matrix: ${error.message}`,
      });
      throw error;
    }
  }
);

// Tool: List joined rooms
server.tool("list-joined-rooms", {}, async () => {
  if (!matrixClientInstance) {
    throw new Error("Not connected to Matrix. Use connect-matrix first.");
  }

  try {
    const rooms = matrixClientInstance.getRooms();
    const roomList = rooms.map((room) => ({
      room_id: room.roomId,
      name: room.name || room.roomId,
    }));

    return {
      content: roomList.map((room) => ({
        type: "text",
        text: `Room ID: ${room.room_id}, Name: ${room.name}`,
      })),
    };
  } catch (error: any) {
    server.server.sendLoggingMessage({
      level: "error",
      data: `Failed to list joined rooms: ${error.message}`,
    });
    throw error;
  }
});
// Tool: Get room messages
server.tool(
  "get-room-messages",
  {
    roomId: z.string(),
    limit: z.number().optional().default(20),
  },
  async ({ roomId, limit }) => {
    if (!matrixClientInstance) {
      throw new Error("Not connected to Matrix. Use connect-matrix first.");
    }

    try {
      const room = matrixClientInstance.getRoom(roomId);
      if (!room) {
        throw new Error(`Room with ID ${roomId} not found.`);
      }

      const messages = room.timeline.slice(-limit).map((event) => ({
        event_id: event.getId(),
        sender: event.getSender(),
        type: event.getType(),
        content: event.getContent(),
        timestamp: event.getTs(),
      }));

      return {
        content: messages.map((message) => ({
          type: "text",
          text: `Event ID: ${message.event_id}, Sender: ${message.sender}, Type: ${message.type}, Timestamp: ${message.timestamp}`,
        })),
      };
    } catch (error: any) {
      server.server.sendLoggingMessage({
        level: "error",
        data: `Failed to get room messages: ${error.message}`,
      });
      throw error;
    }
  }
);

// Tool: Get room members
server.tool(
  "get-room-members",
  {
    roomId: z.string(),
  },
  async ({ roomId }) => {
    if (!matrixClientInstance) {
      throw new Error("Not connected to Matrix. Use connect-matrix first.");
    }

    try {
      const room = matrixClientInstance.getRoom(roomId);
      if (!room) {
        throw new Error(`Room with ID ${roomId} not found.`);
      }

      const members = room.getJoinedMembers().map((member) => ({
        user_id: member.userId,
        display_name: member.name || member.userId,
      }));

      return {
        content: members.map((member) => ({
          type: "text",
          text: `User ID: ${member.user_id}, Display Name: ${member.display_name}`,
        })),
      };
    } catch (error: any) {
      server.server.sendLoggingMessage({
        level: "error",
        data: `Failed to get room members: ${error.message}`,
      });
      throw error;
    }
  }
);

// Start the MCP server using StdioServerTransport
const transport = new StdioServerTransport();
await server.connect(transport);
