import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { createConfiguredMatrixClient, getAccessToken, getMatrixContext } from "../../utils/server-helpers.js";
import { removeClientFromCache } from "../../matrix/client.js";
import { processMessage, processMessagesByDate, countMessagesByUser } from "../../matrix/messageProcessor.js";
import { ToolRegistrationFunction } from "../../types/tool-types.js";

// Tool: Get room messages
export const getRoomMessagesHandler = async (
  { roomId, limit }: { roomId: string; limit: number },
  { requestInfo, authInfo }: any
) => {
  const { matrixUserId, homeserverUrl } = getMatrixContext(requestInfo?.headers);
  const accessToken = getAccessToken(requestInfo?.headers, authInfo?.token);
  
  try {
    const client = await createConfiguredMatrixClient(homeserverUrl, matrixUserId, accessToken);

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
};

// Tool: Get messages by date
export const getMessagesByDateHandler = async (
  { roomId, startDate, endDate }: { roomId: string; startDate: string; endDate: string },
  { requestInfo, authInfo }: any
) => {
  const { matrixUserId, homeserverUrl } = getMatrixContext(requestInfo?.headers);
  const accessToken = getAccessToken(requestInfo?.headers, authInfo?.token);
  
  try {
    const client = await createConfiguredMatrixClient(homeserverUrl, matrixUserId, accessToken);
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
    const messages = await processMessagesByDate(events, startDate, endDate, client);

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
};

// Tool: Identify active users
export const identifyActiveUsersHandler = async (
  { roomId, limit }: { roomId: string; limit: number },
  { requestInfo, authInfo }: any
) => {
  const { matrixUserId, homeserverUrl } = getMatrixContext(requestInfo?.headers);
  const accessToken = getAccessToken(requestInfo?.headers, authInfo?.token);
  
  try {
    const client = await createConfiguredMatrixClient(homeserverUrl, matrixUserId, accessToken);
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
                text: `No message activity found in room ${room.name || roomId}`,
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
};

// Registration function
export const registerMessageTools: ToolRegistrationFunction = (server) => {
  // Tool: Get room messages
  server.registerTool(
    "get-room-messages",
    {
      title: "Get Matrix Room Messages",
      description: "Retrieve recent messages from a specific Matrix room, including text and image content",
      inputSchema: {
        roomId: z.string().describe("Matrix room ID (e.g., !roomid:domain.com)"),
        limit: z
          .number()
          .default(20)
          .describe("Maximum number of messages to retrieve (default: 20)"),
      },
    },
    getRoomMessagesHandler
  );

  // Tool: Get messages by date
  server.registerTool(
    "get-messages-by-date",
    {
      title: "Get Matrix Messages by Date Range",
      description: "Retrieve messages from a Matrix room within a specific date range",
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
    getMessagesByDateHandler
  );

  // Tool: Identify active users
  server.registerTool(
    "identify-active-users",
    {
      title: "Identify Most Active Users",
      description: "Find the most active users in a Matrix room based on message count in recent history",
      inputSchema: {
        roomId: z.string().describe("Matrix room ID (e.g., !roomid:domain.com)"),
        limit: z
          .number()
          .default(10)
          .describe("Maximum number of active users to return (default: 10)"),
      },
    },
    identifyActiveUsersHandler
  );
};