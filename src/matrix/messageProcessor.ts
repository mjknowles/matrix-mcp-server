import * as sdk from "matrix-js-sdk";
import { MatrixClient, EventType } from "matrix-js-sdk";
import fetch from "node-fetch";

/**
 * Represents a processed message that can be returned to MCP clients
 */
export type ProcessedMessage =
  | { type: "text"; text: string }
  | { type: "image"; data: string; mimeType: string };

/**
 * Processes a Matrix event and extracts relevant content
 * 
 * @param event - Matrix event to process
 * @param matrixClient - Matrix client instance for fetching additional data
 * @returns Promise<ProcessedMessage | null> - Processed message or null if not processable
 */
export async function processMessage(
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

/**
 * Filters and processes messages within a date range
 * 
 * @param events - Array of Matrix events
 * @param startDate - Start date string
 * @param endDate - End date string
 * @param matrixClient - Matrix client instance
 * @returns Promise<ProcessedMessage[]> - Array of processed messages
 */
export async function processMessagesByDate(
  events: sdk.MatrixEvent[],
  startDate: string,
  endDate: string,
  matrixClient: MatrixClient
): Promise<ProcessedMessage[]> {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();

  const filteredEvents = events.filter((event) => {
    const timestamp = event.getTs();
    return timestamp >= start && timestamp <= end;
  });

  const messages = await Promise.all(
    filteredEvents.map((event) => processMessage(event, matrixClient))
  );

  return messages.filter((message) => message !== null) as ProcessedMessage[];
}

/**
 * Counts messages by user in a room
 * 
 * @param events - Array of Matrix events
 * @param limit - Maximum number of users to return
 * @returns Array of user message counts
 */
export function countMessagesByUser(
  events: sdk.MatrixEvent[],
  limit: number = 10
): Array<{ userId: string; count: number }> {
  const userMessageCounts: Record<string, number> = {};
  
  events
    .filter((event) => event.getType() === EventType.RoomMessage)
    .forEach((event) => {
      const sender = event.getSender();
      if (sender) {
        userMessageCounts[sender] = (userMessageCounts[sender] || 0) + 1;
      }
    });

  return Object.entries(userMessageCounts)
    .sort(([, countA], [, countB]) => countB - countA)
    .slice(0, limit)
    .map(([userId, count]) => ({ userId, count }));
}