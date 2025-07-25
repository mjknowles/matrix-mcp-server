import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { createConfiguredMatrixClient, getAccessToken, getMatrixContext } from "../../utils/server-helpers.js";
import { removeClientFromCache } from "../../matrix/client.js";
import { ToolRegistrationFunction } from "../../types/tool-types.js";

// Tool: Create room
export const createRoomHandler = async (
  { roomName, isPrivate, topic, inviteUsers, roomAlias }: { 
    roomName: string; 
    isPrivate: boolean; 
    topic?: string; 
    inviteUsers?: string[]; 
    roomAlias?: string 
  },
  { requestInfo, authInfo }: any
) => {
  const { matrixUserId, homeserverUrl } = getMatrixContext(requestInfo?.headers);
  const accessToken = getAccessToken(requestInfo?.headers, authInfo?.token);
  
  try {
    const client = await createConfiguredMatrixClient(homeserverUrl, matrixUserId, accessToken);
    
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
};

// Tool: Join room
export const joinRoomHandler = async (
  { roomIdOrAlias }: { roomIdOrAlias: string },
  { requestInfo, authInfo }: any
) => {
  const { matrixUserId, homeserverUrl } = getMatrixContext(requestInfo?.headers);
  const accessToken = getAccessToken(requestInfo?.headers, authInfo?.token);
  
  try {
    const client = await createConfiguredMatrixClient(homeserverUrl, matrixUserId, accessToken);
    
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
};

// Tool: Leave room
export const leaveRoomHandler = async (
  { roomId, reason }: { roomId: string; reason?: string },
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
};

// Tool: Invite user
export const inviteUserHandler = async (
  { roomId, targetUserId }: { roomId: string; targetUserId: string },
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
};

// Registration function
export const registerRoomManagementTools: ToolRegistrationFunction = (server) => {
  // Tool: Create room
  server.registerTool(
    "create-room",
    {
      title: "Create Matrix Room",
      description: "Create a new Matrix room with customizable settings including name, topic, privacy, and initial invitations",
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
    createRoomHandler
  );

  // Tool: Join room
  server.registerTool(
    "join-room",
    {
      title: "Join Matrix Room",
      description: "Join a Matrix room by room ID or alias. Can also be used to accept room invitations",
      inputSchema: {
        roomIdOrAlias: z
          .string()
          .describe("Room ID (e.g., !roomid:domain.com) or room alias (e.g., #roomalias:domain.com)"),
      },
    },
    joinRoomHandler
  );

  // Tool: Leave room
  server.registerTool(
    "leave-room",
    {
      title: "Leave Matrix Room",
      description: "Leave a Matrix room with an optional reason message",
      inputSchema: {
        roomId: z.string().describe("Matrix room ID (e.g., !roomid:domain.com)"),
        reason: z
          .string()
          .optional()
          .describe("Optional reason for leaving the room"),
      },
    },
    leaveRoomHandler
  );

  // Tool: Invite user
  server.registerTool(
    "invite-user",
    {
      title: "Invite User to Matrix Room",
      description: "Invite a user to a Matrix room. Requires appropriate permissions in the room",
      inputSchema: {
        roomId: z.string().describe("Matrix room ID (e.g., !roomid:domain.com)"),
        targetUserId: z
          .string()
          .describe("Target user's Matrix ID to invite (e.g., @user:domain.com)"),
      },
    },
    inviteUserHandler
  );
};