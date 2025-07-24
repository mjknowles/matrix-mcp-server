import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { createMatrixClient, removeClientFromCache } from "./matrix/client.js";
import {
  processMessage,
  processMessagesByDate,
  countMessagesByUser,
} from "./matrix/messageProcessor.js";
import { TokenExchangeConfig } from "./auth/tokenExchange.js";
import { NotificationCountType } from "matrix-js-sdk";

// Environment configuration
const ENABLE_OAUTH = process.env.ENABLE_OAUTH === "true";
const ENABLE_TOKEN_EXCHANGE = process.env.ENABLE_TOKEN_EXCHANGE === "true";
const defaultHomeserverUrl =
  process.env.MATRIX_HOMESERVER_URL || "https://localhost:8008/";

// OAuth/Token exchange configuration
const tokenExchangeConfig: TokenExchangeConfig = {
  idpUrl: process.env.IDP_ISSUER_URL || "",
  clientId: process.env.MATRIX_CLIENT_ID || "",
  clientSecret: process.env.MATRIX_CLIENT_SECRET || "",
  matrixClientId: process.env.MATRIX_CLIENT_ID || "",
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
  headers: Record<string, string | string[] | undefined> | undefined,
  oauthToken: string | undefined
): string {
  const matrixTokenFromHeader = headers?.["matrix_access_token"];

  // Prioritize matrix_access_token from headers
  if (matrixTokenFromHeader) {
    if (Array.isArray(matrixTokenFromHeader)) {
      // If it's an array, take the first non-empty string.
      const firstMatrixToken = matrixTokenFromHeader.find(
        (token) => typeof token === "string" && token !== ""
      );
      if (firstMatrixToken) {
        return firstMatrixToken;
      }
    } else if (
      typeof matrixTokenFromHeader === "string" &&
      matrixTokenFromHeader !== ""
    ) {
      return matrixTokenFromHeader;
    }
  }

  // If no valid matrix_access_token, and OAuth is enabled, use oauthToken
  if (ENABLE_OAUTH && typeof oauthToken === "string" && oauthToken !== "") {
    return oauthToken;
  }

  return "";
}

/**
 * Helper function to extract matrixUserId and homeserverUrl from headers
 */
function getMatrixContext(
  headers: Record<string, string | string[] | undefined> | undefined
): { matrixUserId: string; homeserverUrl: string } {
  const matrixUserId =
    (Array.isArray(headers?.["matrix_user_id"])
      ? headers?.["matrix_user_id"][0]
      : headers?.["matrix_user_id"]) || "";
  const homeserverUrl =
    (Array.isArray(headers?.["matrix_homeserver_url"])
      ? headers?.["matrix_homeserver_url"][0]
      : headers?.["matrix_homeserver_url"]) || defaultHomeserverUrl;
  return { matrixUserId, homeserverUrl };
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
    tokenExchangeConfig: tokenExchangeConfig,
    enableTokenExchange: ENABLE_TOKEN_EXCHANGE,
  });
}

// Tool: List joined rooms
server.registerTool(
  "list-joined-rooms",
  {
    title: "List Joined Matrix Rooms",
    description:
      "Get a list of all Matrix rooms the user has joined, including room names, IDs, and basic information",
    inputSchema: {},
  },
  async (_input, { requestInfo, authInfo }): Promise<CallToolResult> => {
    const { matrixUserId, homeserverUrl } = getMatrixContext(
      requestInfo?.headers
    );
    const accessToken = getAccessToken(requestInfo?.headers, authInfo?.token);
    
    try {
      const client = await createConfiguredMatrixClient(
        homeserverUrl,
        matrixUserId,
        accessToken
      );

      const rooms = client.getRooms();
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
      // Remove client from cache on error
      removeClientFromCache(matrixUserId, homeserverUrl);
      return {
        content: [
          {
            type: "text",
            text: `Error: Failed to list joined rooms - ${error.message}`,
          },
        ],
        isError: true,
      };
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
      roomId: z.string().describe("Matrix room ID (e.g., !roomid:domain.com)"),
      limit: z
        .number()
        .default(20)
        .describe("Maximum number of messages to retrieve (default: 20)"),
    },
  },
  async ({ roomId, limit }, { requestInfo, authInfo }) => {
    const { matrixUserId, homeserverUrl } = getMatrixContext(
      requestInfo?.headers
    );
    const accessToken = getAccessToken(requestInfo?.headers, authInfo?.token);
    
    try {
      const client = await createConfiguredMatrixClient(
        homeserverUrl,
        matrixUserId,
        accessToken
      );

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
      removeClientFromCache(matrixUserId, homeserverUrl);
      return {
        content: [
          {
            type: "text",
            text: `Error: Failed to get room messages - ${error.message}`,
          },
        ],
        isError: true,
      };
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
      roomId: z.string().describe("Matrix room ID (e.g., !roomid:domain.com)"),
    },
  },
  async ({ roomId }, { requestInfo, authInfo }) => {
    const { matrixUserId, homeserverUrl } = getMatrixContext(
      requestInfo?.headers
    );
    const accessToken = getAccessToken(requestInfo?.headers, authInfo?.token);
    
    try {
      const client = await createConfiguredMatrixClient(
        homeserverUrl,
        matrixUserId,
        accessToken
      );

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
      removeClientFromCache(matrixUserId, homeserverUrl);
      return {
        content: [
          {
            type: "text",
            text: `Error: Failed to get room members - ${error.message}`,
          },
        ],
        isError: true,
      };
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
      roomId: z.string().describe("Matrix room ID (e.g., !roomid:domain.com)"),
      startDate: z
        .string()
        .describe("Start date in ISO 8601 format (e.g., 2024-01-01T00:00:00Z)"),
      endDate: z
        .string()
        .describe("End date in ISO 8601 format (e.g., 2024-01-02T00:00:00Z)"),
    },
  },
  async ({ roomId, startDate, endDate }, { requestInfo, authInfo }) => {
    const { matrixUserId, homeserverUrl } = getMatrixContext(
      requestInfo?.headers
    );
    const accessToken = getAccessToken(requestInfo?.headers, authInfo?.token);
    try {
      const client = await createConfiguredMatrixClient(
        homeserverUrl,
        matrixUserId,
        accessToken
      );
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
      removeClientFromCache(matrixUserId, homeserverUrl);
      return {
        content: [
          {
            type: "text",
            text: `Error: Failed to filter messages by date - ${error.message}`,
          },
        ],
        isError: true,
      };
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
      roomId: z.string().describe("Matrix room ID (e.g., !roomid:domain.com)"),
      limit: z
        .number()
        .default(10)
        .describe("Maximum number of active users to return (default: 10)"),
    },
  },
  async ({ roomId, limit }, { requestInfo, authInfo }) => {
    const { matrixUserId, homeserverUrl } = getMatrixContext(
      requestInfo?.headers
    );
    const accessToken = getAccessToken(requestInfo?.headers, authInfo?.token);
    try {
      const client = await createConfiguredMatrixClient(
        homeserverUrl,
        matrixUserId,
        accessToken
      );
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
      removeClientFromCache(matrixUserId, homeserverUrl);
      return {
        content: [
          {
            type: "text",
            text: `Error: Failed to identify active users - ${error.message}`,
          },
        ],
        isError: true,
      };
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
    inputSchema: {},
  },
  async (_input, { requestInfo, authInfo }) => {
    const { matrixUserId, homeserverUrl } = getMatrixContext(
      requestInfo?.headers
    );
    const accessToken = getAccessToken(requestInfo?.headers, authInfo?.token);
    try {
      const client = await createConfiguredMatrixClient(
        homeserverUrl,
        matrixUserId,
        accessToken
      );
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
      removeClientFromCache(matrixUserId, homeserverUrl);
      return {
        content: [
          {
            type: "text",
            text: `Error: Failed to get users - ${error.message}`,
          },
        ],
        isError: true,
      };
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
      roomId: z.string().describe("Matrix room ID (e.g., !roomid:domain.com)"),
    },
  },
  async ({ roomId }, { requestInfo, authInfo }) => {
    const { matrixUserId, homeserverUrl } = getMatrixContext(
      requestInfo?.headers
    );
    const accessToken = getAccessToken(requestInfo?.headers, authInfo?.token);
    try {
      const client = await createConfiguredMatrixClient(
        homeserverUrl,
        matrixUserId,
        accessToken
      );
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
      removeClientFromCache(matrixUserId, homeserverUrl);
      return {
        content: [
          {
            type: "text",
            text: `Error: Failed to get room information - ${error.message}`,
          },
        ],
        isError: true,
      };
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
      targetUserId: z
        .string()
        .describe(
          "Target user's Matrix ID to get profile for (e.g., @user:domain.com)"
        ),
    },
  },
  async ({ targetUserId }, { requestInfo, authInfo }) => {
    const { matrixUserId, homeserverUrl } = getMatrixContext(
      requestInfo?.headers
    );
    const accessToken = getAccessToken(requestInfo?.headers, authInfo?.token);
    try {
      const client = await createConfiguredMatrixClient(
        homeserverUrl,
        matrixUserId,
        accessToken
      );
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
      removeClientFromCache(matrixUserId, homeserverUrl);
      return {
        content: [
          {
            type: "text",
            text: `Error: Failed to get user profile - ${error.message}`,
          },
        ],
        isError: true,
      };
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
    inputSchema: {},
  },
  async (_input, { requestInfo, authInfo }) => {
    const { matrixUserId, homeserverUrl } = getMatrixContext(
      requestInfo?.headers
    );
    const accessToken = getAccessToken(requestInfo?.headers, authInfo?.token);
    try {
      const client = await createConfiguredMatrixClient(
        homeserverUrl,
        matrixUserId,
        accessToken
      );
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
      removeClientFromCache(matrixUserId, homeserverUrl);
      return {
        content: [
          {
            type: "text",
            text: `Error: Failed to get your profile - ${error.message}`,
          },
        ],
        isError: true,
      };
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
    { searchTerm, server, limit },
    { requestInfo, authInfo }
  ): Promise<CallToolResult> => {
    const { matrixUserId, homeserverUrl } = getMatrixContext(
      requestInfo?.headers
    );
    const accessToken = getAccessToken(requestInfo?.headers, authInfo?.token);
    try {
      const client = await createConfiguredMatrixClient(
        homeserverUrl,
        matrixUserId,
        accessToken
      );
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
      removeClientFromCache(matrixUserId, homeserverUrl);
      return {
        content: [
          {
            type: "text" as const,
            text: `Error: Failed to search public rooms - ${error.message}`,
          },
        ],
        isError: true,
      };
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
      roomFilter: z
        .string()
        .optional()
        .describe("Optional room ID to get counts for specific room only"),
    },
  },
  async ({ roomFilter }, { requestInfo, authInfo }) => {
    const { matrixUserId, homeserverUrl } = getMatrixContext(
      requestInfo?.headers
    );
    const accessToken = getAccessToken(requestInfo?.headers, authInfo?.token);
    try {
      const client = await createConfiguredMatrixClient(
        homeserverUrl,
        matrixUserId,
        accessToken
      );
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
      removeClientFromCache(matrixUserId, homeserverUrl);
      return {
        content: [
          {
            type: "text",
            text: `Error: Failed to get notification counts - ${error.message}`,
          },
        ],
        isError: true,
      };
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
      includeEmpty: z
        .boolean()
        .default(false)
        .describe("Include DM rooms with no recent messages (default: false)"),
    },
  },
  async ({ includeEmpty }, { requestInfo, authInfo }) => {
    const { matrixUserId, homeserverUrl } = getMatrixContext(
      requestInfo?.headers
    );
    const accessToken = getAccessToken(requestInfo?.headers, authInfo?.token);
    try {
      const client = await createConfiguredMatrixClient(
        homeserverUrl,
        matrixUserId,
        accessToken
      );
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
      removeClientFromCache(matrixUserId, homeserverUrl);
      return {
        content: [
          {
            type: "text",
            text: `Error: Failed to get direct messages - ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Tool: Send message
server.registerTool(
  "send-message",
  {
    title: "Send Matrix Message",
    description:
      "Send a text message to a Matrix room, with support for plain text, HTML formatting, and replies",
    inputSchema: {
      roomId: z.string().describe("Matrix room ID (e.g., !roomid:domain.com)"),
      message: z.string().describe("The message content to send"),
      messageType: z
        .enum(["text", "html", "emote"])
        .default("text")
        .describe("Type of message: text (plain), html (formatted), or emote (action)"),
      replyToEventId: z
        .string()
        .optional()
        .describe("Event ID to reply to (optional)"),
    },
  },
  async ({ roomId, message, messageType, replyToEventId }, { requestInfo, authInfo }) => {
    const { matrixUserId, homeserverUrl } = getMatrixContext(
      requestInfo?.headers
    );
    const accessToken = getAccessToken(requestInfo?.headers, authInfo?.token);
    try {
      const client = await createConfiguredMatrixClient(
        homeserverUrl,
        matrixUserId,
        accessToken
      );
      
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

      // Check if user can send messages
      const powerLevelEvent = room.currentState.getStateEvents("m.room.power_levels", "");
      const userPowerLevel = room.getMember(matrixUserId)?.powerLevel || 0;
      const requiredLevel = powerLevelEvent?.getContent()?.events?.["m.room.message"] || 0;
      
      if (userPowerLevel < requiredLevel) {
        return {
          content: [
            {
              type: "text",
              text: `Error: You don't have permission to send messages in this room. Required power level: ${requiredLevel}, your level: ${userPowerLevel}`,
            },
          ],
          isError: true,
        };
      }

      let response;
      if (messageType === "html") {
        response = await client.sendHtmlMessage(roomId, message, message);
      } else if (messageType === "emote") {
        response = await client.sendEmoteMessage(roomId, message);
      } else {
        // Default to text message
        if (replyToEventId) {
          const replyToEvent = room.findEventById(replyToEventId);
          if (replyToEvent) {
            response = await client.sendMessage(roomId, {
              msgtype: "m.text" as any,
              body: message,
              "m.relates_to": {
                "m.in_reply_to": {
                  event_id: replyToEventId,
                },
              },
            });
          } else {
            return {
              content: [
                {
                  type: "text",
                  text: `Error: Reply event ${replyToEventId} not found in room`,
                },
              ],
              isError: true,
            };
          }
        } else {
          response = await client.sendTextMessage(roomId, message);
        }
      }

      return {
        content: [
          {
            type: "text",
            text: `Message sent successfully to ${room.name || roomId}
Event ID: ${response.event_id}
Message type: ${messageType}${replyToEventId ? ` (reply to ${replyToEventId})` : ""}`,
          },
        ],
      };
    } catch (error: any) {
      console.error(`Failed to send message: ${error.message}`);
      removeClientFromCache(matrixUserId, homeserverUrl);
      return {
        content: [
          {
            type: "text",
            text: `Error: Failed to send message - ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Tool: Send direct message
server.registerTool(
  "send-direct-message",
  {
    title: "Send Direct Message",
    description:
      "Send a direct message to a Matrix user. Creates a new DM room if one doesn't exist",
    inputSchema: {
      targetUserId: z
        .string()
        .describe("Target user's Matrix ID (e.g., @user:domain.com)"),
      message: z.string().describe("The message content to send"),
    },
  },
  async ({ targetUserId, message }, { requestInfo, authInfo }) => {
    const { matrixUserId, homeserverUrl } = getMatrixContext(
      requestInfo?.headers
    );
    const accessToken = getAccessToken(requestInfo?.headers, authInfo?.token);
    try {
      const client = await createConfiguredMatrixClient(
        homeserverUrl,
        matrixUserId,
        accessToken
      );
      
      // First, try to find an existing DM room
      const rooms = client.getRooms();
      let dmRoom = rooms.find((room) => {
        const members = room.getJoinedMembers();
        return (
          members.length === 2 &&
          members.some((member) => member.userId === targetUserId) &&
          members.some((member) => member.userId === matrixUserId)
        );
      });

      let roomId: string;
      
      if (dmRoom) {
        // Use existing DM room
        roomId = dmRoom.roomId;
      } else {
        // Create new DM room
        const createResponse = await client.createRoom({
          is_direct: true,
          invite: [targetUserId],
          preset: "trusted_private_chat" as any,
          initial_state: [
            {
              type: "m.room.guest_access",
              content: {
                guest_access: "forbidden",
              },
            },
          ],
        });
        roomId = createResponse.room_id;
        
        // Mark as DM in account data
        try {
          const existingDmData: any = await client.getAccountData("m.direct" as any);
          const dmData: { [key: string]: string[] } = (existingDmData && typeof existingDmData === 'object' && !Array.isArray(existingDmData)) ? { ...existingDmData } : {};
          if (!dmData[targetUserId]) {
            dmData[targetUserId] = [];
          }
          dmData[targetUserId].push(roomId);
          await client.setAccountData("m.direct" as any, dmData as any);
        } catch (error) {
          console.warn("Could not update m.direct account data:", error);
        }
      }

      // Send the message
      const response = await client.sendTextMessage(roomId, message);
      
      // Get room info for response
      const finalRoom = client.getRoom(roomId) || dmRoom;
      const roomName = finalRoom?.name || `DM with ${targetUserId}`;

      return {
        content: [
          {
            type: "text",
            text: `Direct message sent successfully to ${targetUserId}
Room: ${roomName} (${roomId})
Event ID: ${response.event_id}
${!dmRoom ? "New DM room created" : "Used existing DM room"}`,
          },
        ],
      };
    } catch (error: any) {
      console.error(`Failed to send direct message: ${error.message}`);
      removeClientFromCache(matrixUserId, homeserverUrl);
      
      // Provide more specific error messages
      let errorMessage = `Error: Failed to send direct message - ${error.message}`;
      if (error.message.includes("not found") || error.message.includes("M_NOT_FOUND")) {
        errorMessage = `Error: User ${targetUserId} not found or not accessible from your homeserver`;
      } else if (error.message.includes("forbidden") || error.message.includes("M_FORBIDDEN")) {
        errorMessage = `Error: Cannot send direct message to ${targetUserId} - they may have blocked DMs or be on a different homeserver`;
      }
      
      return {
        content: [
          {
            type: "text",
            text: errorMessage,
          },
        ],
        isError: true,
      };
    }
  }
);

// Tool: Join room
server.registerTool(
  "join-room",
  {
    title: "Join Matrix Room",
    description:
      "Join a Matrix room by room ID or alias. Can also be used to accept room invitations",
    inputSchema: {
      roomIdOrAlias: z
        .string()
        .describe("Room ID (e.g., !roomid:domain.com) or room alias (e.g., #roomalias:domain.com)"),
    },
  },
  async ({ roomIdOrAlias }, { requestInfo, authInfo }) => {
    const { matrixUserId, homeserverUrl } = getMatrixContext(
      requestInfo?.headers
    );
    const accessToken = getAccessToken(requestInfo?.headers, authInfo?.token);
    try {
      const client = await createConfiguredMatrixClient(
        homeserverUrl,
        matrixUserId,
        accessToken
      );
      
      // Check if already joined
      const existingRoom = client.getRoom(roomIdOrAlias);
      if (existingRoom && existingRoom.getMyMembership() === "join") {
        return {
          content: [
            {
              type: "text",
              text: `You are already a member of room ${existingRoom.name || roomIdOrAlias}`,
            },
          ],
        };
      }

      // Join the room
      const joinResponse = await client.joinRoom(roomIdOrAlias);
      const roomId = joinResponse.roomId;
      
      // Wait a moment for the room to sync, then get room info
      await new Promise(resolve => setTimeout(resolve, 1000));
      const room = client.getRoom(roomId);
      const roomName = room?.name || "Unnamed Room";
      const memberCount = room?.getJoinedMemberCount() || "Unknown";

      return {
        content: [
          {
            type: "text",
            text: `Successfully joined room: ${roomName}
Room ID: ${roomId}
Members: ${memberCount}
${roomIdOrAlias !== roomId ? `Joined via alias: ${roomIdOrAlias}` : ""}`,
          },
        ],
      };
    } catch (error: any) {
      console.error(`Failed to join room: ${error.message}`);
      removeClientFromCache(matrixUserId, homeserverUrl);
      
      // Provide more specific error messages
      let errorMessage = `Error: Failed to join room ${roomIdOrAlias} - ${error.message}`;
      if (error.message.includes("not found") || error.message.includes("M_NOT_FOUND")) {
        errorMessage = `Error: Room ${roomIdOrAlias} not found`;
      } else if (error.message.includes("forbidden") || error.message.includes("M_FORBIDDEN")) {
        errorMessage = `Error: Access denied to room ${roomIdOrAlias} - it may be private or you may be banned`;
      } else if (error.message.includes("M_LIMIT_EXCEEDED")) {
        errorMessage = `Error: Rate limited when trying to join room ${roomIdOrAlias} - please try again later`;
      }
      
      return {
        content: [
          {
            type: "text",
            text: errorMessage,
          },
        ],
        isError: true,
      };
    }
  }
);

// Tool: Leave room
server.registerTool(
  "leave-room",
  {
    title: "Leave Matrix Room",
    description:
      "Leave a Matrix room with an optional reason message",
    inputSchema: {
      roomId: z.string().describe("Matrix room ID (e.g., !roomid:domain.com)"),
      reason: z
        .string()
        .optional()
        .describe("Optional reason for leaving the room"),
    },
  },
  async ({ roomId, reason }, { requestInfo, authInfo }) => {
    const { matrixUserId, homeserverUrl } = getMatrixContext(
      requestInfo?.headers
    );
    const accessToken = getAccessToken(requestInfo?.headers, authInfo?.token);
    try {
      const client = await createConfiguredMatrixClient(
        homeserverUrl,
        matrixUserId,
        accessToken
      );
      
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
      const membership = room.getMyMembership();
      
      if (membership !== "join") {
        return {
          content: [
            {
              type: "text",
              text: `You are not currently joined to room ${roomName}. Current membership: ${membership}`,
            },
          ],
        };
      }

      // Leave the room
      await client.leave(roomId);

      return {
        content: [
          {
            type: "text",
            text: `Successfully left room: ${roomName}
Room ID: ${roomId}${reason ? `\nReason: ${reason}` : ""}`,
          },
        ],
      };
    } catch (error: any) {
      console.error(`Failed to leave room: ${error.message}`);
      removeClientFromCache(matrixUserId, homeserverUrl);
      
      // Provide more specific error messages
      let errorMessage = `Error: Failed to leave room ${roomId} - ${error.message}`;
      if (error.message.includes("not found") || error.message.includes("M_NOT_FOUND")) {
        errorMessage = `Error: Room ${roomId} not found`;
      } else if (error.message.includes("forbidden") || error.message.includes("M_FORBIDDEN")) {
        errorMessage = `Error: Cannot leave room ${roomId} - you may not have permission or may not be a member`;
      }
      
      return {
        content: [
          {
            type: "text",
            text: errorMessage,
          },
        ],
        isError: true,
      };
    }
  }
);

// Tool: Create room
server.registerTool(
  "create-room",
  {
    title: "Create Matrix Room",
    description:
      "Create a new Matrix room with customizable settings including name, topic, privacy, and initial invitations",
    inputSchema: {
      roomName: z.string().describe("Name for the new room"),
      isPrivate: z
        .boolean()
        .default(false)
        .describe("Whether the room should be private (default: false - public room)"),
      topic: z
        .string()
        .optional()
        .describe("Optional topic/description for the room"),
      inviteUsers: z
        .array(z.string())
        .optional()
        .describe("Optional array of user IDs to invite to the room"),
      roomAlias: z
        .string()
        .optional()
        .describe("Optional room alias (e.g., 'my-room' for #my-room:domain.com)"),
    },
  },
  async ({ roomName, isPrivate, topic, inviteUsers, roomAlias }, { requestInfo, authInfo }) => {
    const { matrixUserId, homeserverUrl } = getMatrixContext(
      requestInfo?.headers
    );
    const accessToken = getAccessToken(requestInfo?.headers, authInfo?.token);
    try {
      const client = await createConfiguredMatrixClient(
        homeserverUrl,
        matrixUserId,
        accessToken
      );
      
      // Build room creation options
      const createOptions: any = {
        name: roomName,
        visibility: isPrivate ? "private" : "public",
      };

      if (topic) {
        createOptions.topic = topic;
      }

      if (inviteUsers && inviteUsers.length > 0) {
        createOptions.invite = inviteUsers;
      }

      if (roomAlias) {
        createOptions.room_alias_name = roomAlias;
      }

      // Set appropriate preset based on privacy
      if (isPrivate) {
        createOptions.preset = "private_chat" as any;
      } else {
        createOptions.preset = "public_chat" as any;
      }

      // Additional security settings for private rooms
      if (isPrivate) {
        createOptions.initial_state = [
          {
            type: "m.room.guest_access",
            content: {
              guest_access: "forbidden",
            },
          },
          {
            type: "m.room.history_visibility",
            content: {
              history_visibility: "invited",
            },
          },
        ];
      }

      // Create the room
      const createResponse = await client.createRoom(createOptions);
      const roomId = createResponse.room_id;
      
      // Wait a moment for the room to sync, then get room info
      await new Promise(resolve => setTimeout(resolve, 1000));
      const room = client.getRoom(roomId);
      const finalRoomName = room?.name || roomName;
      const memberCount = room?.getJoinedMemberCount() || 1;
      const finalAlias = roomAlias ? `#${roomAlias}:${matrixUserId.split(':')[1]}` : "No alias";

      return {
        content: [
          {
            type: "text",
            text: `Successfully created room: ${finalRoomName}
Room ID: ${roomId}
Alias: ${finalAlias}
Privacy: ${isPrivate ? "Private" : "Public"}
Topic: ${topic || "No topic set"}
Members: ${memberCount}
Invited users: ${inviteUsers && inviteUsers.length > 0 ? inviteUsers.join(", ") : "None"}`,
          },
        ],
      };
    } catch (error: any) {
      console.error(`Failed to create room: ${error.message}`);
      removeClientFromCache(matrixUserId, homeserverUrl);
      
      // Provide more specific error messages
      let errorMessage = `Error: Failed to create room "${roomName}" - ${error.message}`;
      if (error.message.includes("M_ROOM_IN_USE") || error.message.includes("already exists")) {
        errorMessage = `Error: Room alias "${roomAlias}" is already in use`;
      } else if (error.message.includes("M_INVALID_ROOM_STATE")) {
        errorMessage = `Error: Invalid room configuration - check your settings`;
      } else if (error.message.includes("M_LIMIT_EXCEEDED")) {
        errorMessage = `Error: Rate limited when creating room - please try again later`;
      } else if (error.message.includes("M_FORBIDDEN")) {
        errorMessage = `Error: You don't have permission to create rooms on this homeserver`;
      }
      
      return {
        content: [
          {
            type: "text",
            text: errorMessage,
          },
        ],
        isError: true,
      };
    }
  }
);

// Tool: Invite user
server.registerTool(
  "invite-user",
  {
    title: "Invite User to Matrix Room",
    description:
      "Invite a user to a Matrix room. Requires appropriate permissions in the room",
    inputSchema: {
      roomId: z.string().describe("Matrix room ID (e.g., !roomid:domain.com)"),
      targetUserId: z
        .string()
        .describe("Target user's Matrix ID to invite (e.g., @user:domain.com)"),
    },
  },
  async ({ roomId, targetUserId }, { requestInfo, authInfo }) => {
    const { matrixUserId, homeserverUrl } = getMatrixContext(
      requestInfo?.headers
    );
    const accessToken = getAccessToken(requestInfo?.headers, authInfo?.token);
    try {
      const client = await createConfiguredMatrixClient(
        homeserverUrl,
        matrixUserId,
        accessToken
      );
      
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
      
      // Check if user is already in the room
      const existingMember = room.getMember(targetUserId);
      if (existingMember) {
        const membership = existingMember.membership;
        if (membership === "join") {
          return {
            content: [
              {
                type: "text",
                text: `User ${targetUserId} is already a member of room ${roomName}`,
              },
            ],
          };
        } else if (membership === "invite") {
          return {
            content: [
              {
                type: "text",
                text: `User ${targetUserId} has already been invited to room ${roomName}`,
              },
            ],
          };
        } else if (membership === "ban") {
          return {
            content: [
              {
                type: "text",
                text: `User ${targetUserId} is banned from room ${roomName}. Cannot invite banned users.`,
              },
            ],
            isError: true,
          };
        }
      }

      // Check if user has permission to invite
      const powerLevelEvent = room.currentState.getStateEvents("m.room.power_levels", "");
      const userPowerLevel = room.getMember(matrixUserId)?.powerLevel || 0;
      const inviteLevel = powerLevelEvent?.getContent()?.invite || 0;
      
      if (userPowerLevel < inviteLevel) {
        return {
          content: [
            {
              type: "text",
              text: `Error: You don't have permission to invite users to this room. Required power level: ${inviteLevel}, your level: ${userPowerLevel}`,
            },
          ],
          isError: true,
        };
      }

      // Invite the user
      await client.invite(roomId, targetUserId);

      return {
        content: [
          {
            type: "text",
            text: `Successfully invited ${targetUserId} to room ${roomName}
Room ID: ${roomId}
The user will receive an invitation and can choose to join the room.`,
          },
        ],
      };
    } catch (error: any) {
      console.error(`Failed to invite user: ${error.message}`);
      removeClientFromCache(matrixUserId, homeserverUrl);
      
      // Provide more specific error messages
      let errorMessage = `Error: Failed to invite ${targetUserId} to room ${roomId} - ${error.message}`;
      if (error.message.includes("not found") || error.message.includes("M_NOT_FOUND")) {
        errorMessage = `Error: User ${targetUserId} not found or room ${roomId} not found`;
      } else if (error.message.includes("forbidden") || error.message.includes("M_FORBIDDEN")) {
        errorMessage = `Error: Cannot invite ${targetUserId} to room - you may not have permission or the user may be banned`;
      } else if (error.message.includes("M_LIMIT_EXCEEDED")) {
        errorMessage = `Error: Rate limited when inviting user - please try again later`;
      }
      
      return {
        content: [
          {
            type: "text",
            text: errorMessage,
          },
        ],
        isError: true,
      };
    }
  }
);

// Tool: Set room name
server.registerTool(
  "set-room-name",
  {
    title: "Set Matrix Room Name",
    description:
      "Update the display name of a Matrix room. Requires appropriate permissions in the room",
    inputSchema: {
      roomId: z.string().describe("Matrix room ID (e.g., !roomid:domain.com)"),
      roomName: z.string().describe("New name for the room"),
    },
  },
  async ({ roomId, roomName }, { requestInfo, authInfo }) => {
    const { matrixUserId, homeserverUrl } = getMatrixContext(
      requestInfo?.headers
    );
    const accessToken = getAccessToken(requestInfo?.headers, authInfo?.token);
    try {
      const client = await createConfiguredMatrixClient(
        homeserverUrl,
        matrixUserId,
        accessToken
      );
      
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

      const currentName = room.name || "Unnamed Room";
      
      // Check if user has permission to change room name
      const powerLevelEvent = room.currentState.getStateEvents("m.room.power_levels", "");
      const userPowerLevel = room.getMember(matrixUserId)?.powerLevel || 0;
      const nameChangeLevel = powerLevelEvent?.getContent()?.events?.["m.room.name"] || 
                            powerLevelEvent?.getContent()?.state_default || 50;
      
      if (userPowerLevel < nameChangeLevel) {
        return {
          content: [
            {
              type: "text",
              text: `Error: You don't have permission to change the room name. Required power level: ${nameChangeLevel}, your level: ${userPowerLevel}`,
            },
          ],
          isError: true,
        };
      }

      // Set the room name
      await client.setRoomName(roomId, roomName);

      return {
        content: [
          {
            type: "text",
            text: `Successfully updated room name
Room ID: ${roomId}
Previous name: ${currentName}
New name: ${roomName}`,
          },
        ],
      };
    } catch (error: any) {
      console.error(`Failed to set room name: ${error.message}`);
      removeClientFromCache(matrixUserId, homeserverUrl);
      
      // Provide more specific error messages
      let errorMessage = `Error: Failed to set room name to "${roomName}" - ${error.message}`;
      if (error.message.includes("not found") || error.message.includes("M_NOT_FOUND")) {
        errorMessage = `Error: Room ${roomId} not found`;
      } else if (error.message.includes("forbidden") || error.message.includes("M_FORBIDDEN")) {
        errorMessage = `Error: You don't have permission to change the room name`;
      } else if (error.message.includes("M_LIMIT_EXCEEDED")) {
        errorMessage = `Error: Rate limited when changing room name - please try again later`;
      }
      
      return {
        content: [
          {
            type: "text",
            text: errorMessage,
          },
        ],
        isError: true,
      };
    }
  }
);

// Tool: Set room topic
server.registerTool(
  "set-room-topic",
  {
    title: "Set Matrix Room Topic",
    description:
      "Update the topic/description of a Matrix room. Requires appropriate permissions in the room",
    inputSchema: {
      roomId: z.string().describe("Matrix room ID (e.g., !roomid:domain.com)"),
      topic: z.string().describe("New topic/description for the room"),
    },
  },
  async ({ roomId, topic }, { requestInfo, authInfo }) => {
    const { matrixUserId, homeserverUrl } = getMatrixContext(
      requestInfo?.headers
    );
    const accessToken = getAccessToken(requestInfo?.headers, authInfo?.token);
    try {
      const client = await createConfiguredMatrixClient(
        homeserverUrl,
        matrixUserId,
        accessToken
      );
      
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
      const currentTopic = room.currentState.getStateEvents("m.room.topic", "")?.getContent()?.topic || "No topic set";
      
      // Check if user has permission to change room topic
      const powerLevelEvent = room.currentState.getStateEvents("m.room.power_levels", "");
      const userPowerLevel = room.getMember(matrixUserId)?.powerLevel || 0;
      const topicChangeLevel = powerLevelEvent?.getContent()?.events?.["m.room.topic"] || 
                             powerLevelEvent?.getContent()?.state_default || 50;
      
      if (userPowerLevel < topicChangeLevel) {
        return {
          content: [
            {
              type: "text",
              text: `Error: You don't have permission to change the room topic. Required power level: ${topicChangeLevel}, your level: ${userPowerLevel}`,
            },
          ],
          isError: true,
        };
      }

      // Set the room topic
      await client.setRoomTopic(roomId, topic);

      return {
        content: [
          {
            type: "text",
            text: `Successfully updated room topic for ${roomName}
Room ID: ${roomId}
Previous topic: ${currentTopic}
New topic: ${topic}`,
          },
        ],
      };
    } catch (error: any) {
      console.error(`Failed to set room topic: ${error.message}`);
      removeClientFromCache(matrixUserId, homeserverUrl);
      
      // Provide more specific error messages
      let errorMessage = `Error: Failed to set room topic - ${error.message}`;
      if (error.message.includes("not found") || error.message.includes("M_NOT_FOUND")) {
        errorMessage = `Error: Room ${roomId} not found`;
      } else if (error.message.includes("forbidden") || error.message.includes("M_FORBIDDEN")) {
        errorMessage = `Error: You don't have permission to change the room topic`;
      } else if (error.message.includes("M_LIMIT_EXCEEDED")) {
        errorMessage = `Error: Rate limited when changing room topic - please try again later`;
      }
      
      return {
        content: [
          {
            type: "text",
            text: errorMessage,
          },
        ],
        isError: true,
      };
    }
  }
);

export default server;
