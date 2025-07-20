import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { createMatrixClient, stopMatrixClient } from "./matrix/client.js";
import { processMessage, processMessagesByDate, countMessagesByUser } from "./matrix/messageProcessor.js";
import { TokenExchangeConfig } from "./auth/tokenExchange.js";
import {
  listJoinedRoomsSchema,
  getRoomMessagesSchema,
  getRoomMembersSchema,
  getMessagesByDateSchema,
  identifyActiveUsersSchema,
  getAllUsersSchema,
} from "./schemas/toolSchemas.js";

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
server.tool(
  "list-joined-rooms",
  {
    homeserverUrl: listJoinedRoomsSchema.homeserverUrl.default(defaultHomeserverUrl),
    matrixUserId: listJoinedRoomsSchema.matrixUserId,
    matrixAccessToken: listJoinedRoomsSchema.matrixAccessToken,
  },
  async ({ homeserverUrl, matrixUserId, matrixAccessToken }, extra): Promise<CallToolResult> => {
    const accessToken = getAccessToken(matrixAccessToken, extra.authInfo?.token);
    const client = await createConfiguredMatrixClient(homeserverUrl, matrixUserId, accessToken);

    try {
      const rooms = client.getRooms();
      console.log(`Room count: ${rooms.length}`);
      return {
        content: rooms.map((room) => ({
          type: "text",
          text: `Room ID: ${room.roomId}, Name: ${room.name}`,
        })),
      };
    } catch (error: any) {
      console.error(`Failed to list joined rooms: ${error.message}`);
      throw error;
    } finally {
      stopMatrixClient(client);
    }
  }
);

// Tool: Get room messages
server.tool(
  "get-room-messages",
  {
    homeserverUrl: getRoomMessagesSchema.homeserverUrl.default(defaultHomeserverUrl),
    matrixUserId: getRoomMessagesSchema.matrixUserId,
    matrixAccessToken: getRoomMessagesSchema.matrixAccessToken,
    roomId: getRoomMessagesSchema.roomId,
    limit: getRoomMessagesSchema.limit,
  },
  async ({ homeserverUrl, matrixUserId, matrixAccessToken, roomId, limit }, extra) => {
    const accessToken = getAccessToken(matrixAccessToken, extra.authInfo?.token);
    const client = await createConfiguredMatrixClient(homeserverUrl, matrixUserId, accessToken);

    try {
      const room = client.getRoom(roomId);
      if (!room) {
        throw new Error(`Room with ID ${roomId} not found.`);
      }

      const messages = await Promise.all(
        room
          .getLiveTimeline()
          .getEvents()
          .slice(-limit)
          .map((event) => processMessage(event, client))
      );

      return {
        content: messages.filter((message) => message !== null),
      };
    } catch (error: any) {
      console.error(`Failed to get room messages: ${error.message}`);
      throw error;
    } finally {
      stopMatrixClient(client);
    }
  }
);

// Tool: Get room members
server.tool(
  "get-room-members",
  {
    homeserverUrl: getRoomMembersSchema.homeserverUrl.default(defaultHomeserverUrl),
    matrixUserId: getRoomMembersSchema.matrixUserId,
    matrixAccessToken: getRoomMembersSchema.matrixAccessToken,
    roomId: getRoomMembersSchema.roomId,
  },
  async ({ homeserverUrl, matrixUserId, matrixAccessToken, roomId }, extra) => {
    const accessToken = getAccessToken(matrixAccessToken, extra.authInfo?.token);
    const client = await createConfiguredMatrixClient(homeserverUrl, matrixUserId, accessToken);

    try {
      const room = client.getRoom(roomId);
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
      console.error(`Failed to get room members: ${error.message}`);
      throw error;
    } finally {
      stopMatrixClient(client);
    }
  }
);

// Tool: Get messages by date
server.tool(
  "get-messages-by-date",
  {
    homeserverUrl: getMessagesByDateSchema.homeserverUrl.default(defaultHomeserverUrl),
    matrixUserId: getMessagesByDateSchema.matrixUserId,
    matrixAccessToken: getMessagesByDateSchema.matrixAccessToken,
    roomId: getMessagesByDateSchema.roomId,
    startDate: getMessagesByDateSchema.startDate,
    endDate: getMessagesByDateSchema.endDate,
  },
  async ({ homeserverUrl, matrixUserId, matrixAccessToken, roomId, startDate, endDate }, extra) => {
    const accessToken = getAccessToken(matrixAccessToken, extra.authInfo?.token);
    const client = await createConfiguredMatrixClient(homeserverUrl, matrixUserId, accessToken);

    try {
      const room = client.getRoom(roomId);
      if (!room) {
        throw new Error(`Room with ID ${roomId} not found.`);
      }

      const events = room.getLiveTimeline().getEvents();
      const messages = await processMessagesByDate(events, startDate, endDate, client);

      return {
        content: messages,
      };
    } catch (error: any) {
      console.error(`Failed to filter messages by date: ${error.message}`);
      throw error;
    } finally {
      stopMatrixClient(client);
    }
  }
);

// Tool: Identify active users
server.tool(
  "identify-active-users",
  {
    homeserverUrl: identifyActiveUsersSchema.homeserverUrl.default(defaultHomeserverUrl),
    matrixUserId: identifyActiveUsersSchema.matrixUserId,
    matrixAccessToken: identifyActiveUsersSchema.matrixAccessToken,
    roomId: identifyActiveUsersSchema.roomId,
    limit: identifyActiveUsersSchema.limit,
  },
  async ({ homeserverUrl, matrixUserId, matrixAccessToken, roomId, limit }, extra) => {
    const accessToken = getAccessToken(matrixAccessToken, extra.authInfo?.token);
    const client = await createConfiguredMatrixClient(homeserverUrl, matrixUserId, accessToken);

    try {
      const room = client.getRoom(roomId);
      if (!room) {
        throw new Error(`Room with ID ${roomId} not found.`);
      }

      const events = room.getLiveTimeline().getEvents();
      const activeUsers = countMessagesByUser(events, limit);

      return {
        content: activeUsers.map((user) => ({
          type: "text",
          text: `User ID: ${user.userId}, Message Count: ${user.count}`,
        })),
      };
    } catch (error: any) {
      console.error(`Failed to identify active users: ${error.message}`);
      throw error;
    } finally {
      stopMatrixClient(client);
    }
  }
);

// Tool: Get all users
server.tool(
  "get-all-users",
  {
    homeserverUrl: getAllUsersSchema.homeserverUrl.default(defaultHomeserverUrl),
    matrixUserId: getAllUsersSchema.matrixUserId,
    matrixAccessToken: getAllUsersSchema.matrixAccessToken,
  },
  async ({ homeserverUrl, matrixUserId, matrixAccessToken }, extra) => {
    const accessToken = getAccessToken(matrixAccessToken, extra.authInfo?.token);
    const client = await createConfiguredMatrixClient(homeserverUrl, matrixUserId, accessToken);

    try {
      const users = client.getUsers();
      return {
        content: users.map((user) => ({
          type: "text",
          text: `User ID: ${user.userId}, Display Name: ${user.displayName}`,
        })),
      };
    } catch (error: any) {
      console.error(`Failed to get all users: ${error.message}`);
      throw error;
    } finally {
      stopMatrixClient(client);
    }
  }
);

export default server;