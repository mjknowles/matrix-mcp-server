import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as sdk from "matrix-js-sdk";
import { EventType, MatrixClient } from "matrix-js-sdk";
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

// Tool: Connect to Matrix homeserver
server.tool(
  "connect-matrix",
  {
    homeserverUrl: z.string().default("http://localhost:8008"),
    username: z.string().default("user1"),
    password: z.string().default("i_love_matrix"),
  },
  async ({ homeserverUrl, username, password }) => {
    try {
      console.log("Initializing MatrixClient with username and password...");

      const tempClient = sdk.createClient({ baseUrl: homeserverUrl });
      const loginResp = await tempClient.loginRequest({
        user: username,
        password,
        type: "m.login.password",
      });

      console.log("Matrix client connected successfully.");
      const data = {
        access_token: loginResp.access_token,
        user_id: loginResp.user_id,
        device_id: loginResp.device_id,
        message: "Login successful",
      };
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data),
          },
        ],
      };
    } catch (error: any) {
      console.error(`Failed to connect to Matrix: ${error.message}`);
      throw error;
    }
  }
);

// Tool: List joined rooms
server.tool(
  "list-joined-rooms",
  {
    homeserverUrl: z.string(),
    accessToken: z.string(),
    user_id: z.string(),
  },
  async ({ homeserverUrl, accessToken, user_id }) => {
    const client = await createMatrixClient(
      homeserverUrl,
      accessToken,
      user_id
    );

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
    }
  }
);

// Tool: Get room messages
server.tool(
  "get-room-messages",
  {
    homeserverUrl: z.string(),
    accessToken: z.string(),
    roomId: z.string(),
    limit: z.number().optional().default(20),
    user_id: z.string(),
  },
  async ({ homeserverUrl, accessToken, roomId, limit, user_id }) => {
    const client = await createMatrixClient(
      homeserverUrl,
      accessToken,
      user_id
    );

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
    }
  }
);

// Tool: Get room members
server.tool(
  "get-room-members",
  {
    homeserverUrl: z.string(),
    accessToken: z.string(),
    roomId: z.string(),
    user_id: z.string(),
  },
  async ({ homeserverUrl, accessToken, roomId, user_id }) => {
    const client = await createMatrixClient(
      homeserverUrl,
      accessToken,
      user_id
    );

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
    }
  }
);

// Tool: Get messages by date
server.tool(
  "get-messages-by-date",
  {
    homeserverUrl: z.string(),
    accessToken: z.string(),
    roomId: z.string(),
    startDate: z.string(),
    endDate: z.string(),
    user_id: z.string(),
  },
  async ({
    homeserverUrl,
    accessToken,
    roomId,
    startDate,
    endDate,
    user_id,
  }) => {
    const client = await createMatrixClient(
      homeserverUrl,
      accessToken,
      user_id
    );

    try {
      const room = client.getRoom(roomId);
      if (!room) {
        throw new Error(`Room with ID ${roomId} not found.`);
      }

      const start = new Date(startDate).getTime();
      const end = new Date(endDate).getTime();

      const messages = await Promise.all(
        room
          .getLiveTimeline()
          .getEvents()
          .filter((event) => {
            const timestamp = event.getTs();
            return timestamp >= start && timestamp <= end;
          })
          .map((event) => processMessage(event, client))
      );

      return {
        content: messages.filter((message) => message !== null),
      };
    } catch (error: any) {
      console.error(`Failed to filter messages by date: ${error.message}`);
      throw error;
    }
  }
);

// Tool: Identify active users
server.tool(
  "identify-active-users",
  {
    homeserverUrl: z.string(),
    accessToken: z.string(),
    roomId: z.string(),
    limit: z.number().optional().default(10),
    user_id: z.string(),
  },
  async ({ homeserverUrl, accessToken, roomId, limit, user_id }) => {
    const client = await createMatrixClient(
      homeserverUrl,
      accessToken,
      user_id
    );

    try {
      const room = client.getRoom(roomId);
      if (!room) {
        throw new Error(`Room with ID ${roomId} not found.`);
      }

      const userMessageCounts: Record<string, number> = {};
      room
        .getLiveTimeline()
        .getEvents()
        .filter((event) => event.getType() === EventType.RoomMessage)
        .forEach((event) => {
          const sender = event.getSender();
          if (sender) {
            userMessageCounts[sender] = (userMessageCounts[sender] || 0) + 1;
          }
        });

      const activeUsers = Object.entries(userMessageCounts)
        .sort(([, countA], [, countB]) => countB - countA)
        .slice(0, limit)
        .map(([userId, count]) => ({ userId, count }));

      return {
        content: activeUsers.map((user) => ({
          type: "text",
          text: `User ID: ${user.userId}, Message Count: ${user.count}`,
        })),
      };
    } catch (error: any) {
      console.error(`Failed to identify active users: ${error.message}`);
      throw error;
    }
  }
);

// Tool: Get all users
server.tool(
  "get-all-users",
  {
    homeserverUrl: z.string(),
    accessToken: z.string(),
    user_id: z.string(),
  },
  async ({ homeserverUrl, accessToken, user_id }) => {
    const client = await createMatrixClient(
      homeserverUrl,
      accessToken,
      user_id
    );

    try {
      const users = client.getUsers();
      return {
        content: users.map((user) => ({
          type: "text",
          text: `User ID: ${user.userId}, Display Name: ${user.displayName}}`,
        })),
      };
    } catch (error: any) {
      console.error(`Failed to get all users: ${error.message}`);
      throw error;
    }
  }
);

// Define the return type for processMessage
type ProcessedMessage =
  | { type: "text"; text: string }
  | { type: "image"; data: string; mimeType: string };

// Helper function to process messages
async function processMessage(
  event: sdk.MatrixEvent,
  matrixClient: MatrixClient | null
): Promise<ProcessedMessage | null> {
  if (!matrixClient) {
    throw new Error("Matrix client is not initialized.");
  }
  const content = event.getContent();
  if (event.getType() === EventType.RoomMessage && content) {
    if (content.msgtype === "m.text") {
      return {
        type: "text",
        text: String(content.body || ""),
      };
    } else if (content.msgtype === "m.image" && content.url) {
      try {
        const httpUrl = String(matrixClient.mxcUrlToHttp(content.url) || "");
        const response = await fetch(httpUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.statusText}`);
        }
        const buffer = await response.arrayBuffer();
        const base64Data = Buffer.from(buffer).toString("base64");
        return {
          type: "image",
          data: base64Data,
          mimeType: String(
            content.info?.mimetype || "application/octet-stream"
          ),
        };
      } catch (error: any) {
        console.error(`Failed to fetch image content: ${error.message}`);
        return null;
      }
    }
  }
  return null;
}

// Private method to create a Matrix client instance
async function createMatrixClient(
  homeserverUrl: string,
  accessToken: string,
  userId: string
): Promise<MatrixClient> {
  const client = sdk.createClient({
    baseUrl: homeserverUrl,
    accessToken,
    userId,
  });
  await client.startClient({ initialSyncLimit: 100 });
  return client;
}

export default server;
