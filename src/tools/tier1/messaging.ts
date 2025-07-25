import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { createConfiguredMatrixClient, getAccessToken, getMatrixContext } from "../../utils/server-helpers.js";
import { removeClientFromCache } from "../../matrix/client.js";
import { ToolRegistrationFunction } from "../../types/tool-types.js";

// Tool: Send message
export const sendMessageHandler = async (
  { roomId, message, messageType, replyToEventId }: { 
    roomId: string; 
    message: string; 
    messageType: "text" | "html" | "emote"; 
    replyToEventId?: string 
  },
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
};

// Tool: Send direct message
export const sendDirectMessageHandler = async (
  { targetUserId, message }: { targetUserId: string; message: string },
  { requestInfo, authInfo }: any
) => {
  const { matrixUserId, homeserverUrl } = getMatrixContext(requestInfo?.headers);
  const accessToken = getAccessToken(requestInfo?.headers, authInfo?.token);
  
  try {
    const client = await createConfiguredMatrixClient(homeserverUrl, matrixUserId, accessToken);
    
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
};

// Registration function
export const registerMessagingTools: ToolRegistrationFunction = (server) => {
  // Tool: Send message
  server.registerTool(
    "send-message",
    {
      title: "Send Matrix Message",
      description: "Send a text message to a Matrix room, with support for plain text, HTML formatting, and replies",
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
    sendMessageHandler
  );

  // Tool: Send direct message
  server.registerTool(
    "send-direct-message",
    {
      title: "Send Direct Message",
      description: "Send a direct message to a Matrix user. Creates a new DM room if one doesn't exist",
      inputSchema: {
        targetUserId: z
          .string()
          .describe("Target user's Matrix ID (e.g., @user:domain.com)"),
        message: z.string().describe("The message content to send"),
      },
    },
    sendDirectMessageHandler
  );
};