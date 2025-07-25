import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { createConfiguredMatrixClient, getAccessToken, getMatrixContext } from "../../utils/server-helpers.js";
import { removeClientFromCache } from "../../matrix/client.js";
import { ToolRegistrationFunction } from "../../types/tool-types.js";

// Tool: Set room name
export const setRoomNameHandler = async (
  { roomId, roomName }: { roomId: string; roomName: string },
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
};

// Tool: Set room topic
export const setRoomTopicHandler = async (
  { roomId, topic }: { roomId: string; topic: string },
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
};

// Registration function
export const registerRoomAdminTools: ToolRegistrationFunction = (server) => {
  // Tool: Set room name
  server.registerTool(
    "set-room-name",
    {
      title: "Set Matrix Room Name",
      description: "Update the display name of a Matrix room. Requires appropriate permissions in the room",
      inputSchema: {
        roomId: z.string().describe("Matrix room ID (e.g., !roomid:domain.com)"),
        roomName: z.string().describe("New name for the room"),
      },
    },
    setRoomNameHandler
  );

  // Tool: Set room topic
  server.registerTool(
    "set-room-topic",
    {
      title: "Set Matrix Room Topic",
      description: "Update the topic/description of a Matrix room. Requires appropriate permissions in the room",
      inputSchema: {
        roomId: z.string().describe("Matrix room ID (e.g., !roomid:domain.com)"),
        topic: z.string().describe("New topic/description for the room"),
      },
    },
    setRoomTopicHandler
  );
};