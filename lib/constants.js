/**
 * Application Constants
 * Centralized configuration values to avoid magic numbers
 */

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
};

// Port Configuration
export const PORTS = {
  MCP_DEFAULT_START: 50880,
  MCP_DEFAULT_END: 50881,
};

// Timeouts (in milliseconds)
export const TIMEOUTS = {
  SERVER_STARTUP: 5000,
  CONNECTION_RETRY: 1000,
};

// Retry Configuration
export const RETRY = {
  MAX_ATTEMPTS: 3,
  BACKOFF_MS: 500,
};

// Authentication
export const AUTH = {
  BEARER_PREFIX_LENGTH: 7, // Length of "Bearer " string
};
