import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { createMatrixClient, stopMatrixClient } from "./matrix/client.js";
import { processMessage, processMessagesByDate, countMessagesByUser } from "./matrix/messageProcessor.js";
import { TokenExchangeConfig } from "./auth/tokenExchange.js";

// Environment configuration
const ENABLE_OAUTH = process.env.ENABLE_OAUTH === "true";
const defaultHomeserverUrl = process.env.MATRIX_HOMESERVER_URL || "https://localhost:8008/";

// OAuth/Token exchange configuration
const tokenExchangeConfig: TokenExchangeConfig = {
  idpUrl: process.env.IDP_ISSUER_URL || "https://localhost:8444/realms/localrealm",
  clientId: process.env.MATRIX_CLIENT_ID || "synapse",
  clientSecret: process.env.MATRIX_CLIENT_SECRET || "myclientsecret",
  matrixClientId: process.env.MATRIX_CLIENT_ID || "synapse",
};

// Create MCP server instance
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

/**
 * Helper function to get access token based on OAuth mode
 */
function getAccessToken(matrixAccessToken: string | undefined, oauthToken: string | undefined): string {
  return ENABLE_OAUTH ? (oauthToken || "") : (matrixAccessToken || "");
}

/**
 * Helper function to create Matrix client with proper configuration
 */
async function createConfiguredMatrixClient(
  homeserverUrl: string,
  matrixUserId: string,
  accessToken: string
) {
  return createMatrixClient({
    homeserverUrl,
    userId: matrixUserId,
    accessToken,
    enableOAuth: ENABLE_OAUTH,
    tokenExchangeConfig: ENABLE_OAUTH ? tokenExchangeConfig : undefined,
  });
}

// Tool: List joined rooms
server.registerTool(
  "list-joined-rooms",
  {
    title: "List Joined Matrix Rooms",
    description: "Get a list of all Matrix rooms the user has joined, including room names, IDs, and basic information",
    inputSchema: {
      homeserverUrl: z.string().default(defaultHomeserverUrl).describe("Matrix homeserver URL (e.g., https://matrix.org)"),
      matrixUserId: z.string().describe("Full Matrix user ID (e.g., @username:domain.com)"),
      matrixAccessToken: z.string().optional().describe("Matrix access token (required when OAuth disabled)"),
    },
  },
  async ({ homeserverUrl, matrixUserId, matrixAccessToken }, extra): Promise<CallToolResult> => {
    const accessToken = getAccessToken(matrixAccessToken, extra.authInfo?.token);
    const client = await createConfiguredMatrixClient(homeserverUrl, matrixUserId, accessToken);

    try {
      const rooms = client.getRooms();
      console.log(`Found ${rooms.length} joined rooms`);
      return {
        content: rooms.map((room) => ({
          type: "text",
          text: `Room: ${room.name || "Unnamed Room"} (${room.roomId}) - ${room.getJoinedMemberCount()} members`,
        })),
      };
    } catch (error: any) {
      console.error(`Failed to list joined rooms: ${error.message}`);
      return {
        content: [{
          type: "text",
          text: `Error: Failed to list joined rooms - ${error.message}`,
        }],
        isError: true,
      };
    } finally {
      stopMatrixClient(client);
    }
  }
);

// Tool: Get room messages
server.registerTool(
  "get-room-messages",
  {
    title: "Get Matrix Room Messages",
    description: "Retrieve recent messages from a specific Matrix room, including text and image content",
    inputSchema: {
      homeserverUrl: z.string().default(defaultHomeserverUrl).describe("Matrix homeserver URL"),
      matrixUserId: z.string().describe("Full Matrix user ID (e.g., @username:domain.com)"),
      matrixAccessToken: z.string().optional().describe("Matrix access token (required when OAuth disabled)"),
      roomId: z.string().describe("Matrix room ID (e.g., !roomid:domain.com)"),
      limit: z.number().default(20).describe("Maximum number of messages to retrieve (default: 20)"),
    },
  },
  async ({ homeserverUrl, matrixUserId, matrixAccessToken, roomId, limit }, extra) => {
    const accessToken = getAccessToken(matrixAccessToken, extra.authInfo?.token);
    const client = await createConfiguredMatrixClient(homeserverUrl, matrixUserId, accessToken);

    try {
      const room = client.getRoom(roomId);
      if (!room) {
        return {
          content: [{
            type: "text",
            text: `Error: Room with ID ${roomId} not found. You may not be a member of this room.`,
          }],
          isError: true,
        };
      }

      const messages = await Promise.all(
        room
          .getLiveTimeline()
          .getEvents()
          .slice(-limit)
          .map((event) => processMessage(event, client))
      );

      const validMessages = messages.filter((message) => message !== null);
      
      return {
        content: validMessages.length > 0 ? validMessages : [{
          type: "text",
          text: `No messages found in room ${room.name || roomId}`,
        }],
      };
    } catch (error: any) {
      console.error(`Failed to get room messages: ${error.message}`);
      return {
        content: [{
          type: "text",
          text: `Error: Failed to get room messages - ${error.message}`,
        }],
        isError: true,
      };
    } finally {
      stopMatrixClient(client);
    }
  }
);

// Tool: Get room members
server.registerTool(
  "get-room-members",
  {
    title: "Get Matrix Room Members",
    description: "List all members currently joined to a Matrix room with their display names and user IDs",
    inputSchema: {
      homeserverUrl: z.string().default(defaultHomeserverUrl).describe("Matrix homeserver URL"),
      matrixUserId: z.string().describe("Full Matrix user ID (e.g., @username:domain.com)"),
      matrixAccessToken: z.string().optional().describe("Matrix access token (required when OAuth disabled)"),
      roomId: z.string().describe("Matrix room ID (e.g., !roomid:domain.com)"),
    },
  },
  async ({ homeserverUrl, matrixUserId, matrixAccessToken, roomId }, extra) => {
    const accessToken = getAccessToken(matrixAccessToken, extra.authInfo?.token);
    const client = await createConfiguredMatrixClient(homeserverUrl, matrixUserId, accessToken);

    try {
      const room = client.getRoom(roomId);
      if (!room) {
        return {
          content: [{
            type: "text",
            text: `Error: Room with ID ${roomId} not found. You may not be a member of this room.`,
          }],
          isError: true,
        };
      }

      const members = room.getJoinedMembers().map((member) => ({
        user_id: member.userId,
        display_name: member.name || member.userId,
      }));

      return {
        content: members.length > 0 ? members.map((member) => ({
          type: "text",
          text: `${member.display_name} (${member.user_id})`,
        })) : [{
          type: "text",
          text: `No members found in room ${room.name || roomId}`,
        }],
      };
    } catch (error: any) {
      console.error(`Failed to get room members: ${error.message}`);
      return {
        content: [{
          type: "text",
          text: `Error: Failed to get room members - ${error.message}`,
        }],
        isError: true,
      };
    } finally {
      stopMatrixClient(client);
    }
  }
);

// Tool: Get messages by date
server.registerTool(
  "get-messages-by-date",
  {
    title: "Get Matrix Messages by Date Range",
    description: "Retrieve messages from a Matrix room within a specific date range",
    inputSchema: {
      homeserverUrl: z.string().default(defaultHomeserverUrl).describe("Matrix homeserver URL"),
      matrixUserId: z.string().describe("Full Matrix user ID (e.g., @username:domain.com)"),
      matrixAccessToken: z.string().optional().describe("Matrix access token (required when OAuth disabled)"),
      roomId: z.string().describe("Matrix room ID (e.g., !roomid:domain.com)"),
      startDate: z.string().describe("Start date in ISO 8601 format (e.g., 2024-01-01T00:00:00Z)"),
      endDate: z.string().describe("End date in ISO 8601 format (e.g., 2024-01-02T00:00:00Z)"),
    },
  },
  async ({ homeserverUrl, matrixUserId, matrixAccessToken, roomId, startDate, endDate }, extra) => {
    const accessToken = getAccessToken(matrixAccessToken, extra.authInfo?.token);
    const client = await createConfiguredMatrixClient(homeserverUrl, matrixUserId, accessToken);

    try {
      const room = client.getRoom(roomId);
      if (!room) {
        return {
          content: [{
            type: "text",
            text: `Error: Room with ID ${roomId} not found. You may not be a member of this room.`,
          }],
          isError: true,
        };
      }

      const events = room.getLiveTimeline().getEvents();
      const messages = await processMessagesByDate(events, startDate, endDate, client);

      return {
        content: messages.length > 0 ? messages : [{
          type: "text",
          text: `No messages found in room ${room.name || roomId} between ${startDate} and ${endDate}`,
        }],
      };
    } catch (error: any) {
      console.error(`Failed to filter messages by date: ${error.message}`);
      return {
        content: [{
          type: "text",
          text: `Error: Failed to filter messages by date - ${error.message}`,
        }],
        isError: true,
      };
    } finally {
      stopMatrixClient(client);
    }
  }
);

// Tool: Identify active users
server.registerTool(
  "identify-active-users",
  {
    title: "Identify Most Active Users",
    description: "Find the most active users in a Matrix room based on message count in recent history",
    inputSchema: {
      homeserverUrl: z.string().default(defaultHomeserverUrl).describe("Matrix homeserver URL"),
      matrixUserId: z.string().describe("Full Matrix user ID (e.g., @username:domain.com)"),
      matrixAccessToken: z.string().optional().describe("Matrix access token (required when OAuth disabled)"),
      roomId: z.string().describe("Matrix room ID (e.g., !roomid:domain.com)"),
      limit: z.number().default(10).describe("Maximum number of active users to return (default: 10)"),
    },
  },
  async ({ homeserverUrl, matrixUserId, matrixAccessToken, roomId, limit }, extra) => {
    const accessToken = getAccessToken(matrixAccessToken, extra.authInfo?.token);
    const client = await createConfiguredMatrixClient(homeserverUrl, matrixUserId, accessToken);

    try {
      const room = client.getRoom(roomId);
      if (!room) {
        return {
          content: [{
            type: "text",
            text: `Error: Room with ID ${roomId} not found. You may not be a member of this room.`,
          }],
          isError: true,
        };
      }

      const events = room.getLiveTimeline().getEvents();
      const activeUsers = countMessagesByUser(events, limit);

      return {
        content: activeUsers.length > 0 ? activeUsers.map((user) => ({
          type: "text",
          text: `${user.userId}: ${user.count} messages`,
        })) : [{
          type: "text",
          text: `No message activity found in room ${room.name || roomId}`,
        }],
      };
    } catch (error: any) {
      console.error(`Failed to identify active users: ${error.message}`);
      return {
        content: [{
          type: "text",
          text: `Error: Failed to identify active users - ${error.message}`,
        }],
        isError: true,
      };
    } finally {
      stopMatrixClient(client);
    }
  }
);

// Tool: Get all users
server.registerTool(
  "get-all-users",
  {
    title: "Get All Known Users",
    description: "List all users known to the Matrix client, including their display names and user IDs",
    inputSchema: {
      homeserverUrl: z.string().default(defaultHomeserverUrl).describe("Matrix homeserver URL"),
      matrixUserId: z.string().describe("Full Matrix user ID (e.g., @username:domain.com)"),
      matrixAccessToken: z.string().optional().describe("Matrix access token (required when OAuth disabled)"),
    },
  },
  async ({ homeserverUrl, matrixUserId, matrixAccessToken }, extra) => {
    const accessToken = getAccessToken(matrixAccessToken, extra.authInfo?.token);
    const client = await createConfiguredMatrixClient(homeserverUrl, matrixUserId, accessToken);

    try {
      const users = client.getUsers();
      return {
        content: users.length > 0 ? users.map((user) => ({
          type: "text",
          text: `${user.displayName || user.userId} (${user.userId})`,
        })) : [{
          type: "text",
          text: "No users found in the client cache",
        }],
      };
    } catch (error: any) {
      console.error(`Failed to get all users: ${error.message}`);
      return {
        content: [{
          type: "text",
          text: `Error: Failed to get users - ${error.message}`,
        }],
        isError: true,
      };
    } finally {
      stopMatrixClient(client);
    }
  }
);

export default server;