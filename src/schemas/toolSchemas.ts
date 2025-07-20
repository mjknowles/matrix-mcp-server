import { z } from "zod";

/**
 * Base schema for all Matrix tools containing common parameters
 */
export const baseMatrixToolSchema = {
  homeserverUrl: z
    .string()
    .describe("Matrix homeserver URL (e.g., https://matrix.org)"),
  matrixUserId: z
    .string()
    .describe("Full Matrix user ID (e.g., @username:domain.com)"),
  matrixAccessToken: z
    .string()
    .optional()
    .describe("Matrix access token (required when OAuth disabled)"),
};

/**
 * Schema for room-based operations
 */
export const roomBasedToolSchema = {
  ...baseMatrixToolSchema,
  roomId: z.string().describe("Matrix room ID (e.g., !roomid:domain.com)"),
};

/**
 * Schema for list-joined-rooms tool
 */
export const listJoinedRoomsSchema = baseMatrixToolSchema;

/**
 * Schema for get-room-messages tool
 */
export const getRoomMessagesSchema = {
  ...roomBasedToolSchema,
  limit: z
    .number()
    .optional()
    .default(20)
    .describe("Maximum number of messages to retrieve"),
};

/**
 * Schema for get-room-members tool
 */
export const getRoomMembersSchema = roomBasedToolSchema;

/**
 * Schema for get-messages-by-date tool
 */
export const getMessagesByDateSchema = {
  ...roomBasedToolSchema,
  startDate: z
    .string()
    .describe("Start date (ISO 8601 format, e.g., 2024-01-01T00:00:00Z)"),
  endDate: z
    .string()
    .describe("End date (ISO 8601 format, e.g., 2024-01-02T00:00:00Z)"),
};

/**
 * Schema for identify-active-users tool
 */
export const identifyActiveUsersSchema = {
  ...roomBasedToolSchema,
  limit: z
    .number()
    .optional()
    .default(10)
    .describe("Maximum number of active users to return"),
};

/**
 * Schema for get-all-users tool
 */
export const getAllUsersSchema = baseMatrixToolSchema;