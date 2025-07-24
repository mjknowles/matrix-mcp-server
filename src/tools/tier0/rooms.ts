import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { createConfiguredMatrixClient, getAccessToken, getMatrixContext } from "../../utils/server-helpers.js";
import { removeClientFromCache } from "../../matrix/client.js";
import { ToolRegistrationFunction } from "../../types/tool-types.js";

// Tool: List joined rooms
export const listJoinedRoomsHandler = async (_input: any, { requestInfo, authInfo }: any): Promise<CallToolResult> => {
  const { matrixUserId, homeserverUrl } = getMatrixContext(requestInfo?.headers);
  const accessToken = getAccessToken(requestInfo?.headers, authInfo?.token);
  
  try {
    const client = await createConfiguredMatrixClient(homeserverUrl, matrixUserId, accessToken);

    const rooms = client.getRooms();
    return {
      content: rooms.map((room) => ({
        type: "text",
        text: `Room: ${room.name || "Unnamed Room"} (${room.roomId}) - ${room.getJoinedMemberCount()} members`,
      })),
    };
  } catch (error: any) {
    console.error(`Failed to list joined rooms: ${error.message}`);
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
};

// Tool: Get room information
export const getRoomInfoHandler = async ({ roomId }: { roomId: string }, { requestInfo, authInfo }: any) => {
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

    const roomName = room.name || "Unnamed Room";
    const roomTopic =
      room.currentState.getStateEvents("m.room.topic", "")?.getContent()?.topic || "No topic set";
    const memberCount = room.getJoinedMemberCount();
    const isEncrypted = room.hasEncryptionStateEvent();
    const roomAlias = room.getCanonicalAlias() || "No alias";
    const creationEvent = room.currentState.getStateEvents("m.room.create", "");
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
};

// Tool: Get room members
export const getRoomMembersHandler = async ({ roomId }: { roomId: string }, { requestInfo, authInfo }: any) => {
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
};

// Registration function
export const registerRoomTools: ToolRegistrationFunction = (server) => {
  // Tool: List joined rooms
  server.registerTool(
    "list-joined-rooms",
    {
      title: "List Joined Matrix Rooms",
      description: "Get a list of all Matrix rooms the user has joined, including room names, IDs, and basic information",
      inputSchema: {},
    },
    listJoinedRoomsHandler
  );

  // Tool: Get room information
  server.registerTool(
    "get-room-info",
    {
      title: "Get Matrix Room Information",
      description: "Get detailed information about a Matrix room including name, topic, settings, and member count",
      inputSchema: {
        roomId: z.string().describe("Matrix room ID (e.g., !roomid:domain.com)"),
      },
    },
    getRoomInfoHandler
  );

  // Tool: Get room members
  server.registerTool(
    "get-room-members",
    {
      title: "Get Matrix Room Members",
      description: "List all members currently joined to a Matrix room with their display names and user IDs",
      inputSchema: {
        roomId: z.string().describe("Matrix room ID (e.g., !roomid:domain.com)"),
      },
    },
    getRoomMembersHandler
  );
};