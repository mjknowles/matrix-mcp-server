import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { createMatrixClient, stopMatrixClient } from "./matrix/client.js";
import {
  processMessage,
  processMessagesByDate,
  countMessagesByUser,
} from "./matrix/messageProcessor.js";
import { TokenExchangeConfig } from "./auth/tokenExchange.js";
import { NotificationCountType } from "matrix-js-sdk";

// Environment configuration
const ENABLE_OAUTH = process.env.ENABLE_OAUTH === "true";
const defaultHomeserverUrl =
  process.env.MATRIX_HOMESERVER_URL || "https://localhost:8008/";

// OAuth/Token exchange configuration
const tokenExchangeConfig: TokenExchangeConfig = {
  idpUrl:
    process.env.IDP_ISSUER_URL || "https://localhost:8444/realms/localrealm",
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
function getAccessToken(
  matrixAccessToken: string | undefined,
  oauthToken: string | undefined
): string {
  return ENABLE_OAUTH ? oauthToken || "" : matrixAccessToken || "";
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
    description:
      "Get a list of all Matrix rooms the user has joined, including room names, IDs, and basic information",
    inputSchema: {
      homeserverUrl: z
        .string()
        .default(defaultHomeserverUrl)
        .describe("Matrix homeserver URL (e.g., https://matrix.org)"),
      matrixUserId: z
        .string()
        .describe("Full Matrix user ID (e.g., @username:domain.com)"),
      matrixAccessToken: z
        .string()
        .optional()
        .describe("Matrix access token (required when OAuth disabled)"),
    },
  },
  async (
    { homeserverUrl, matrixUserId, matrixAccessToken },
    extra
  ): Promise<CallToolResult> => {
    const accessToken = getAccessToken(
      matrixAccessToken,
      extra.authInfo?.token
    );
    const client = await createConfiguredMatrixClient(
      homeserverUrl,
      matrixUserId,
      accessToken
    );

    try {
      const rooms = client.getRooms();
      console.log(`Found ${rooms.length} joined rooms`);
      return {
        content: rooms.map((room) => ({
          type: "text",
          text: `Room: ${room.name || "Unnamed Room"} (${
            room.roomId
          }) - ${room.getJoinedMemberCount()} members`,
        })),
      };
    } catch (error: any) {
      console.error(`Failed to list joined rooms: ${error.message}`);
      return {
        content: [
          {
            type: "text",
            text: `Error: Failed to list joined rooms - ${error.message}`,
          },
        ],
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
    description:
      "Retrieve recent messages from a specific Matrix room, including text and image content",
    inputSchema: {
      homeserverUrl: z
        .string()
        .default(defaultHomeserverUrl)
        .describe("Matrix homeserver URL"),
      matrixUserId: z
        .string()
        .describe("Full Matrix user ID (e.g., @username:domain.com)"),
      matrixAccessToken: z
        .string()
        .optional()
        .describe("Matrix access token (required when OAuth disabled)"),
      roomId: z.string().describe("Matrix room ID (e.g., !roomid:domain.com)"),
      limit: z
        .number()
        .default(20)
        .describe("Maximum number of messages to retrieve (default: 20)"),
    },
  },
  async (
    { homeserverUrl, matrixUserId, matrixAccessToken, roomId, limit },
    extra
  ) => {
    const accessToken = getAccessToken(
      matrixAccessToken,
      extra.authInfo?.token
    );
    const client = await createConfiguredMatrixClient(
      homeserverUrl,
      matrixUserId,
      accessToken
    );

    try {
      const room = client.getRoom(roomId);
      if (!room) {
        return {
          content: [
            {
              type: "text",
              text: `Error: Room with ID ${roomId} not found. You may not be a member of this room.`,
            },
          ],
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
        content:
          validMessages.length > 0
            ? validMessages
            : [
                {
                  type: "text",
                  text: `No messages found in room ${room.name || roomId}`,
                },
              ],
      };
    } catch (error: any) {
      console.error(`Failed to get room messages: ${error.message}`);
      return {
        content: [
          {
            type: "text",
            text: `Error: Failed to get room messages - ${error.message}`,
          },
        ],
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
    description:
      "List all members currently joined to a Matrix room with their display names and user IDs",
    inputSchema: {
      homeserverUrl: z
        .string()
        .default(defaultHomeserverUrl)
        .describe("Matrix homeserver URL"),
      matrixUserId: z
        .string()
        .describe("Full Matrix user ID (e.g., @username:domain.com)"),
      matrixAccessToken: z
        .string()
        .optional()
        .describe("Matrix access token (required when OAuth disabled)"),
      roomId: z.string().describe("Matrix room ID (e.g., !roomid:domain.com)"),
    },
  },
  async ({ homeserverUrl, matrixUserId, matrixAccessToken, roomId }, extra) => {
    const accessToken = getAccessToken(
      matrixAccessToken,
      extra.authInfo?.token
    );
    const client = await createConfiguredMatrixClient(
      homeserverUrl,
      matrixUserId,
      accessToken
    );

    try {
      const room = client.getRoom(roomId);
      if (!room) {
        return {
          content: [
            {
              type: "text",
              text: `Error: Room with ID ${roomId} not found. You may not be a member of this room.`,
            },
          ],
          isError: true,
        };
      }

      const members = room.getJoinedMembers().map((member) => ({
        user_id: member.userId,
        display_name: member.name || member.userId,
      }));

      return {
        content:
          members.length > 0
            ? members.map((member) => ({
                type: "text",
                text: `${member.display_name} (${member.user_id})`,
              }))
            : [
                {
                  type: "text",
                  text: `No members found in room ${room.name || roomId}`,
                },
              ],
      };
    } catch (error: any) {
      console.error(`Failed to get room members: ${error.message}`);
      return {
        content: [
          {
            type: "text",
            text: `Error: Failed to get room members - ${error.message}`,
          },
        ],
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
    description:
      "Retrieve messages from a Matrix room within a specific date range",
    inputSchema: {
      homeserverUrl: z
        .string()
        .default(defaultHomeserverUrl)
        .describe("Matrix homeserver URL"),
      matrixUserId: z
        .string()
        .describe("Full Matrix user ID (e.g., @username:domain.com)"),
      matrixAccessToken: z
        .string()
        .optional()
        .describe("Matrix access token (required when OAuth disabled)"),
      roomId: z.string().describe("Matrix room ID (e.g., !roomid:domain.com)"),
      startDate: z
        .string()
        .describe("Start date in ISO 8601 format (e.g., 2024-01-01T00:00:00Z)"),
      endDate: z
        .string()
        .describe("End date in ISO 8601 format (e.g., 2024-01-02T00:00:00Z)"),
    },
  },
  async (
    {
      homeserverUrl,
      matrixUserId,
      matrixAccessToken,
      roomId,
      startDate,
      endDate,
    },
    extra
  ) => {
    const accessToken = getAccessToken(
      matrixAccessToken,
      extra.authInfo?.token
    );
    const client = await createConfiguredMatrixClient(
      homeserverUrl,
      matrixUserId,
      accessToken
    );

    try {
      const room = client.getRoom(roomId);
      if (!room) {
        return {
          content: [
            {
              type: "text",
              text: `Error: Room with ID ${roomId} not found. You may not be a member of this room.`,
            },
          ],
          isError: true,
        };
      }

      const events = room.getLiveTimeline().getEvents();
      const messages = await processMessagesByDate(
        events,
        startDate,
        endDate,
        client
      );

      return {
        content:
          messages.length > 0
            ? messages
            : [
                {
                  type: "text",
                  text: `No messages found in room ${
                    room.name || roomId
                  } between ${startDate} and ${endDate}`,
                },
              ],
      };
    } catch (error: any) {
      console.error(`Failed to filter messages by date: ${error.message}`);
      return {
        content: [
          {
            type: "text",
            text: `Error: Failed to filter messages by date - ${error.message}`,
          },
        ],
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
    description:
      "Find the most active users in a Matrix room based on message count in recent history",
    inputSchema: {
      homeserverUrl: z
        .string()
        .default(defaultHomeserverUrl)
        .describe("Matrix homeserver URL"),
      matrixUserId: z
        .string()
        .describe("Full Matrix user ID (e.g., @username:domain.com)"),
      matrixAccessToken: z
        .string()
        .optional()
        .describe("Matrix access token (required when OAuth disabled)"),
      roomId: z.string().describe("Matrix room ID (e.g., !roomid:domain.com)"),
      limit: z
        .number()
        .default(10)
        .describe("Maximum number of active users to return (default: 10)"),
    },
  },
  async (
    { homeserverUrl, matrixUserId, matrixAccessToken, roomId, limit },
    extra
  ) => {
    const accessToken = getAccessToken(
      matrixAccessToken,
      extra.authInfo?.token
    );
    const client = await createConfiguredMatrixClient(
      homeserverUrl,
      matrixUserId,
      accessToken
    );

    try {
      const room = client.getRoom(roomId);
      if (!room) {
        return {
          content: [
            {
              type: "text",
              text: `Error: Room with ID ${roomId} not found. You may not be a member of this room.`,
            },
          ],
          isError: true,
        };
      }

      const events = room.getLiveTimeline().getEvents();
      const activeUsers = countMessagesByUser(events, limit);

      return {
        content:
          activeUsers.length > 0
            ? activeUsers.map((user) => ({
                type: "text",
                text: `${user.userId}: ${user.count} messages`,
              }))
            : [
                {
                  type: "text",
                  text: `No message activity found in room ${
                    room.name || roomId
                  }`,
                },
              ],
      };
    } catch (error: any) {
      console.error(`Failed to identify active users: ${error.message}`);
      return {
        content: [
          {
            type: "text",
            text: `Error: Failed to identify active users - ${error.message}`,
          },
        ],
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
    description:
      "List all users known to the Matrix client, including their display names and user IDs",
    inputSchema: {
      homeserverUrl: z
        .string()
        .default(defaultHomeserverUrl)
        .describe("Matrix homeserver URL"),
      matrixUserId: z
        .string()
        .describe("Full Matrix user ID (e.g., @username:domain.com)"),
      matrixAccessToken: z
        .string()
        .optional()
        .describe("Matrix access token (required when OAuth disabled)"),
    },
  },
  async ({ homeserverUrl, matrixUserId, matrixAccessToken }, extra) => {
    const accessToken = getAccessToken(
      matrixAccessToken,
      extra.authInfo?.token
    );
    const client = await createConfiguredMatrixClient(
      homeserverUrl,
      matrixUserId,
      accessToken
    );

    try {
      const users = client.getUsers();
      return {
        content:
          users.length > 0
            ? users.map((user) => ({
                type: "text",
                text: `${user.displayName || user.userId} (${user.userId})`,
              }))
            : [
                {
                  type: "text",
                  text: "No users found in the client cache",
                },
              ],
      };
    } catch (error: any) {
      console.error(`Failed to get all users: ${error.message}`);
      return {
        content: [
          {
            type: "text",
            text: `Error: Failed to get users - ${error.message}`,
          },
        ],
        isError: true,
      };
    } finally {
      stopMatrixClient(client);
    }
  }
);

// Tool: Get room information
server.registerTool(
  "get-room-info",
  {
    title: "Get Matrix Room Information",
    description:
      "Get detailed information about a Matrix room including name, topic, settings, and member count",
    inputSchema: {
      homeserverUrl: z
        .string()
        .default(defaultHomeserverUrl)
        .describe("Matrix homeserver URL"),
      matrixUserId: z
        .string()
        .describe("Full Matrix user ID (e.g., @username:domain.com)"),
      matrixAccessToken: z
        .string()
        .optional()
        .describe("Matrix access token (required when OAuth disabled)"),
      roomId: z.string().describe("Matrix room ID (e.g., !roomid:domain.com)"),
    },
  },
  async ({ homeserverUrl, matrixUserId, matrixAccessToken, roomId }, extra) => {
    const accessToken = getAccessToken(
      matrixAccessToken,
      extra.authInfo?.token
    );
    const client = await createConfiguredMatrixClient(
      homeserverUrl,
      matrixUserId,
      accessToken
    );

    try {
      const room = client.getRoom(roomId);
      if (!room) {
        return {
          content: [
            {
              type: "text",
              text: `Error: Room with ID ${roomId} not found. You may not be a member of this room.`,
            },
          ],
          isError: true,
        };
      }

      const roomName = room.name || "Unnamed Room";
      const roomTopic =
        room.currentState.getStateEvents("m.room.topic", "")?.getContent()
          ?.topic || "No topic set";
      const memberCount = room.getJoinedMemberCount();
      const isEncrypted = room.hasEncryptionStateEvent();
      const roomAlias = room.getCanonicalAlias() || "No alias";
      const creationEvent = room.currentState.getStateEvents(
        "m.room.create",
        ""
      );
      const creator = creationEvent?.getSender() || "Unknown";
      const createdAt = creationEvent?.getTs()
        ? new Date(creationEvent.getTs()).toISOString()
        : "Unknown";

      return {
        content: [
          {
            type: "text",
            text: `Room Information:
Name: ${roomName}
Room ID: ${roomId}
Alias: ${roomAlias}
Topic: ${roomTopic}
Members: ${memberCount}
Encrypted: ${isEncrypted ? "Yes" : "No"}
Creator: ${creator}
Created: ${createdAt}`,
          },
        ],
      };
    } catch (error: any) {
      console.error(`Failed to get room info: ${error.message}`);
      return {
        content: [
          {
            type: "text",
            text: `Error: Failed to get room information - ${error.message}`,
          },
        ],
        isError: true,
      };
    } finally {
      stopMatrixClient(client);
    }
  }
);

// Tool: Get user profile
server.registerTool(
  "get-user-profile",
  {
    title: "Get Matrix User Profile",
    description:
      "Get profile information for a specific Matrix user including display name, avatar, and presence",
    inputSchema: {
      homeserverUrl: z
        .string()
        .default(defaultHomeserverUrl)
        .describe("Matrix homeserver URL"),
      matrixUserId: z
        .string()
        .describe("Full Matrix user ID (e.g., @username:domain.com)"),
      matrixAccessToken: z
        .string()
        .optional()
        .describe("Matrix access token (required when OAuth disabled)"),
      targetUserId: z
        .string()
        .describe(
          "Target user's Matrix ID to get profile for (e.g., @user:domain.com)"
        ),
    },
  },
  async (
    { homeserverUrl, matrixUserId, matrixAccessToken, targetUserId },
    extra
  ) => {
    const accessToken = getAccessToken(
      matrixAccessToken,
      extra.authInfo?.token
    );
    const client = await createConfiguredMatrixClient(
      homeserverUrl,
      matrixUserId,
      accessToken
    );

    try {
      const user = client.getUser(targetUserId);
      if (!user) {
        return {
          content: [
            {
              type: "text",
              text: `Error: User ${targetUserId} not found or not known to your client.`,
            },
          ],
          isError: true,
        };
      }

      const displayName = user.displayName || "No display name set";
      const avatarUrl = user.avatarUrl || "No avatar set";
      const presence = user.presence || "unknown";
      const presenceStatus = user.presenceStatusMsg || "No status message";
      const lastActiveAgo = user.lastActiveAgo
        ? `${Math.floor(user.lastActiveAgo / 1000 / 60)} minutes ago`
        : "Unknown";

      // Get shared rooms
      const sharedRooms = client
        .getRooms()
        .filter((room) => room.getMember(targetUserId)?.membership === "join")
        .map((room) => room.name || room.roomId)
        .slice(0, 5); // Limit to first 5 shared rooms

      return {
        content: [
          {
            type: "text",
            text: `User Profile: ${targetUserId}
Display Name: ${displayName}
Avatar: ${avatarUrl}
Presence: ${presence}
Status: ${presenceStatus}
Last Active: ${lastActiveAgo}
Shared Rooms (up to 5): ${
              sharedRooms.length > 0 ? sharedRooms.join(", ") : "None visible"
            }`,
          },
        ],
      };
    } catch (error: any) {
      console.error(`Failed to get user profile: ${error.message}`);
      return {
        content: [
          {
            type: "text",
            text: `Error: Failed to get user profile - ${error.message}`,
          },
        ],
        isError: true,
      };
    } finally {
      stopMatrixClient(client);
    }
  }
);

// Tool: Get my profile
server.registerTool(
  "get-my-profile",
  {
    title: "Get My Matrix Profile",
    description:
      "Get your own profile information including display name, avatar, settings, and device list",
    inputSchema: {
      homeserverUrl: z
        .string()
        .default(defaultHomeserverUrl)
        .describe("Matrix homeserver URL"),
      matrixUserId: z
        .string()
        .describe("Full Matrix user ID (e.g., @username:domain.com)"),
      matrixAccessToken: z
        .string()
        .optional()
        .describe("Matrix access token (required when OAuth disabled)"),
    },
  },
  async ({ homeserverUrl, matrixUserId, matrixAccessToken }, extra) => {
    const accessToken = getAccessToken(
      matrixAccessToken,
      extra.authInfo?.token
    );
    const client = await createConfiguredMatrixClient(
      homeserverUrl,
      matrixUserId,
      accessToken
    );

    try {
      const user = client.getUser(matrixUserId);
      if (!user) {
        return {
          content: [
            {
              type: "text",
              text: `Error: Could not retrieve your own profile information.`,
            },
          ],
          isError: true,
        };
      }

      const displayName = user.displayName || "No display name set";
      const avatarUrl = user.avatarUrl || "No avatar set";
      const presence = user.presence || "unknown";
      const presenceStatus = user.presenceStatusMsg || "No status message";

      // Get device information
      let deviceInfo = "Unable to retrieve device list";
      try {
        const devices = await client.getDevices();
        const currentDevice = devices.devices.find(
          (d) => d.device_id === client.getDeviceId()
        );
        deviceInfo = `Current device: ${
          currentDevice?.display_name || "Unknown"
        } (${client.getDeviceId()})
Total devices: ${devices.devices.length}`;
      } catch (error) {
        console.warn("Could not retrieve device information");
      }

      // Get room count
      const joinedRooms = client.getRooms();
      const roomCount = joinedRooms.length;
      const dmCount = joinedRooms.filter(
        (room) =>
          room.getMyMembership() === "join" && room.getJoinedMemberCount() === 2
      ).length;

      return {
        content: [
          {
            type: "text",
            text: `My Profile: ${matrixUserId}
Display Name: ${displayName}
Avatar: ${avatarUrl}
Presence: ${presence}
Status: ${presenceStatus}
Joined Rooms: ${roomCount}
Direct Messages: ${dmCount}
${deviceInfo}`,
          },
        ],
      };
    } catch (error: any) {
      console.error(`Failed to get my profile: ${error.message}`);
      return {
        content: [
          {
            type: "text",
            text: `Error: Failed to get your profile - ${error.message}`,
          },
        ],
        isError: true,
      };
    } finally {
      stopMatrixClient(client);
    }
  }
);

// Tool: Search public rooms
server.registerTool(
  "search-public-rooms",
  {
    title: "Search Public Matrix Rooms",
    description:
      "Search for public Matrix rooms that you can join, with optional filtering by name or topic",
    inputSchema: {
      homeserverUrl: z
        .string()
        .default(defaultHomeserverUrl)
        .describe("Matrix homeserver URL"),
      matrixUserId: z
        .string()
        .describe("Full Matrix user ID (e.g., @username:domain.com)"),
      matrixAccessToken: z
        .string()
        .optional()
        .describe("Matrix access token (required when OAuth disabled)"),
      searchTerm: z
        .string()
        .optional()
        .describe("Search term to filter rooms by name or topic"),
      server: z
        .string()
        .optional()
        .describe(
          "Specific server to search rooms on (defaults to your homeserver)"
        ),
      limit: z
        .number()
        .default(20)
        .describe("Maximum number of rooms to return (default: 20)"),
    },
  },
  async (
    {
      homeserverUrl,
      matrixUserId,
      matrixAccessToken,
      searchTerm,
      server,
      limit,
    },
    extra
  ): Promise<CallToolResult> => {
    const accessToken = getAccessToken(
      matrixAccessToken,
      extra.authInfo?.token
    );
    const client = await createConfiguredMatrixClient(
      homeserverUrl,
      matrixUserId,
      accessToken
    );

    try {
      const searchOptions: any = {
        limit,
        include_all_known_networks: true,
      };

      if (server) {
        searchOptions.server = server;
      }

      if (searchTerm) {
        searchOptions.filter = {
          generic_search_term: searchTerm,
        };
      }

      const publicRooms = await client.publicRooms(searchOptions);

      if (!publicRooms.chunk || publicRooms.chunk.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: searchTerm
                ? `No public rooms found matching "${searchTerm}"`
                : "No public rooms found",
            },
          ],
        };
      }

      const roomList = publicRooms.chunk.map((room: any) => {
        const name = room.name || "Unnamed Room";
        const topic = room.topic || "No topic";
        const members = room.num_joined_members || 0;
        const alias = room.canonical_alias || room.room_id;
        const avatar = room.avatar_url ? "Has avatar" : "No avatar";

        return {
          type: "text" as const,
          text: `${name} (${alias})
Topic: ${topic}
Members: ${members}
Avatar: ${avatar}
Room ID: ${room.room_id}`,
        };
      });

      return {
        content: [
          {
            type: "text" as const,
            text: `Found ${publicRooms.chunk.length} public rooms${
              searchTerm ? ` matching "${searchTerm}"` : ""
            }:`,
          },
          ...roomList,
        ],
      };
    } catch (error: any) {
      console.error(`Failed to search public rooms: ${error.message}`);
      return {
        content: [
          {
            type: "text" as const,
            text: `Error: Failed to search public rooms - ${error.message}`,
          },
        ],
        isError: true,
      };
    } finally {
      stopMatrixClient(client);
    }
  }
);

// Tool: Get notification counts
server.registerTool(
  "get-notification-counts",
  {
    title: "Get Matrix Notification Counts",
    description:
      "Get unread message counts and notification status for Matrix rooms",
    inputSchema: {
      homeserverUrl: z
        .string()
        .default(defaultHomeserverUrl)
        .describe("Matrix homeserver URL"),
      matrixUserId: z
        .string()
        .describe("Full Matrix user ID (e.g., @username:domain.com)"),
      matrixAccessToken: z
        .string()
        .optional()
        .describe("Matrix access token (required when OAuth disabled)"),
      roomFilter: z
        .string()
        .optional()
        .describe("Optional room ID to get counts for specific room only"),
    },
  },
  async (
    { homeserverUrl, matrixUserId, matrixAccessToken, roomFilter },
    extra
  ) => {
    const accessToken = getAccessToken(
      matrixAccessToken,
      extra.authInfo?.token
    );
    const client = await createConfiguredMatrixClient(
      homeserverUrl,
      matrixUserId,
      accessToken
    );

    try {
      const rooms = client.getRooms();
      let filteredRooms = rooms;

      if (roomFilter) {
        filteredRooms = rooms.filter((room) => room.roomId === roomFilter);
        if (filteredRooms.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: `Error: Room with ID ${roomFilter} not found.`,
              },
            ],
            isError: true,
          };
        }
      }

      let totalUnread = 0;
      let totalMentions = 0;
      const roomNotifications: any[] = [];

      for (const room of filteredRooms) {
        const unreadCount = room.getUnreadNotificationCount() || 0;
        const mentionCount =
          room.getUnreadNotificationCount(NotificationCountType.Highlight) || 0;
        const roomName = room.name || "Unnamed Room";

        totalUnread += unreadCount;
        totalMentions += mentionCount;

        if (unreadCount > 0 || mentionCount > 0 || roomFilter) {
          roomNotifications.push({
            type: "text",
            text: `${roomName} (${room.roomId})
Unread: ${unreadCount} messages
Mentions: ${mentionCount}
Last message: ${
              room.getLastLiveEvent()?.getTs()
                ? new Date(room.getLastLiveEvent()!.getTs()).toLocaleString()
                : "Unknown"
            }`,
          });
        }
      }

      if (roomFilter) {
        return {
          content:
            roomNotifications.length > 0
              ? roomNotifications
              : [
                  {
                    type: "text",
                    text: `No notifications in room ${roomFilter}`,
                  },
                ],
        };
      }

      // Summary for all rooms
      const summary = {
        type: "text",
        text: `Notification Summary:
Total unread messages: ${totalUnread}
Total mentions/highlights: ${totalMentions}
Rooms with notifications: ${roomNotifications.length}`,
      };

      return {
        content:
          roomNotifications.length > 0
            ? [summary, ...roomNotifications]
            : [
                {
                  type: "text",
                  text: "No unread notifications across all rooms",
                },
              ],
      };
    } catch (error: any) {
      console.error(`Failed to get notification counts: ${error.message}`);
      return {
        content: [
          {
            type: "text",
            text: `Error: Failed to get notification counts - ${error.message}`,
          },
        ],
        isError: true,
      };
    } finally {
      stopMatrixClient(client);
    }
  }
);

// Tool: Get direct messages
server.registerTool(
  "get-direct-messages",
  {
    title: "Get Direct Message Conversations",
    description:
      "List all direct message conversations with their recent activity and unread status",
    inputSchema: {
      homeserverUrl: z
        .string()
        .default(defaultHomeserverUrl)
        .describe("Matrix homeserver URL"),
      matrixUserId: z
        .string()
        .describe("Full Matrix user ID (e.g., @username:domain.com)"),
      matrixAccessToken: z
        .string()
        .optional()
        .describe("Matrix access token (required when OAuth disabled)"),
      includeEmpty: z
        .boolean()
        .default(false)
        .describe("Include DM rooms with no recent messages (default: false)"),
    },
  },
  async (
    { homeserverUrl, matrixUserId, matrixAccessToken, includeEmpty },
    extra
  ) => {
    const accessToken = getAccessToken(
      matrixAccessToken,
      extra.authInfo?.token
    );
    const client = await createConfiguredMatrixClient(
      homeserverUrl,
      matrixUserId,
      accessToken
    );

    try {
      const rooms = client.getRooms();

      // Filter for DM rooms (rooms with exactly 2 members where user is joined)
      const dmRooms = rooms.filter((room) => {
        const memberCount = room.getJoinedMemberCount();
        const membership = room.getMyMembership();
        return membership === "join" && memberCount === 2;
      });

      if (dmRooms.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: "No direct message conversations found",
            },
          ],
        };
      }

      const dmList: any[] = [];

      for (const room of dmRooms) {
        // Get the other user in the DM
        const members = room.getJoinedMembers();
        const otherUser = members.find(
          (member) => member.userId !== matrixUserId
        );

        if (!otherUser) continue;

        const lastEvent = room.getLastLiveEvent();
        const lastMessageTime = lastEvent?.getTs()
          ? new Date(lastEvent.getTs()).toLocaleString()
          : "No recent messages";
        const lastMessageText =
          lastEvent?.getContent()?.body || "No recent messages";
        const unreadCount = room.getUnreadNotificationCount() || 0;
        const mentionCount =
          room.getUnreadNotificationCount(NotificationCountType.Highlight) || 0;

        // Skip empty DMs if not requested
        if (!includeEmpty && !lastEvent) continue;

        dmList.push({
          type: "text",
          text: `${otherUser.name || otherUser.userId} (${otherUser.userId})
Room ID: ${room.roomId}
Last message: ${lastMessageTime}
Preview: ${
            lastMessageText.length > 100
              ? lastMessageText.substring(0, 100) + "..."
              : lastMessageText
          }
Unread: ${unreadCount} messages
Mentions: ${mentionCount}`,
        });
      }

      if (dmList.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: includeEmpty
                ? "No direct message conversations found"
                : "No direct message conversations with recent activity found",
            },
          ],
        };
      }

      // Sort by most recent activity
      dmList.sort((a, b) => {
        const aRoom = dmRooms.find((r) => a.text.includes(r.roomId));
        const bRoom = dmRooms.find((r) => b.text.includes(r.roomId));
        const aTime = aRoom?.getLastLiveEvent()?.getTs() || 0;
        const bTime = bRoom?.getLastLiveEvent()?.getTs() || 0;
        return bTime - aTime;
      });

      return {
        content: [
          {
            type: "text",
            text: `Found ${dmList.length} direct message conversation${
              dmList.length === 1 ? "" : "s"
            }:`,
          },
          ...dmList,
        ],
      };
    } catch (error: any) {
      console.error(`Failed to get direct messages: ${error.message}`);
      return {
        content: [
          {
            type: "text",
            text: `Error: Failed to get direct messages - ${error.message}`,
          },
        ],
        isError: true,
      };
    } finally {
      stopMatrixClient(client);
    }
  }
);

export default server;
