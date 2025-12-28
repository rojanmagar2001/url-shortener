export type ErrorCode =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "INTERNAL_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "SESSION_INVALID"
  | "SESSION_REVOKED"
  | "SESSION_EXPIRED"
  | "IDENTITY_EMAIL_TAKEN"
  | "IDENTITY_INVALID_CREDENTIALS"
  | "IDENTITY_USER_DISABLED"
  | "IDENTITY_PROVIDER_NOT_SUPPORTED"
  | "IDENTITY_EMAIL_NOT_VERIFIED"
  | "LINK_INACTIVE"
  | "LINK_EXPIRED"
  | "LINK_UNSAFE_REDIRECT"
  | "RATE_LIMITED";

export type ErrorDefinition = Readonly<{
  code: ErrorCode;
  statusCode: number;
  message: string; // safe to show to client
}>;

export const ERRORS: Record<ErrorCode, ErrorDefinition> = {
  VALIDATION_ERROR: {
    code: "VALIDATION_ERROR",
    statusCode: 400,
    message: "Request validation failed",
  },
  NOT_FOUND: {
    code: "NOT_FOUND",
    statusCode: 404,
    message: "Not found",
  },
  INTERNAL_ERROR: {
    code: "INTERNAL_ERROR",
    statusCode: 500,
    message: "Internal error",
  },

  UNAUTHORIZED: {
    code: "UNAUTHORIZED",
    statusCode: 401,
    message: "Unauthorized",
  },
  FORBIDDEN: { code: "FORBIDDEN", statusCode: 403, message: "Forbidden" },

  SESSION_INVALID: {
    code: "SESSION_INVALID",
    statusCode: 401,
    message: "Invalid session",
  },
  SESSION_REVOKED: {
    code: "SESSION_REVOKED",
    statusCode: 401,
    message: "Session revoked",
  },
  SESSION_EXPIRED: {
    code: "SESSION_EXPIRED",
    statusCode: 401,
    message: "Session expired",
  },

  IDENTITY_EMAIL_TAKEN: {
    code: "IDENTITY_EMAIL_TAKEN",
    statusCode: 409,
    message: "Email is already registered",
  },
  IDENTITY_INVALID_CREDENTIALS: {
    code: "IDENTITY_INVALID_CREDENTIALS",
    statusCode: 401,
    message: "Invalid credentials",
  },
  IDENTITY_USER_DISABLED: {
    code: "IDENTITY_USER_DISABLED",
    statusCode: 403,
    message: "User is disabled",
  },
  IDENTITY_PROVIDER_NOT_SUPPORTED: {
    code: "IDENTITY_PROVIDER_NOT_SUPPORTED",
    statusCode: 400,
    message: "Authentication provider not supported",
  },
  IDENTITY_EMAIL_NOT_VERIFIED: {
    code: "IDENTITY_EMAIL_NOT_VERIFIED",
    statusCode: 403,
    message: "Email is not verified with the provider",
  },

  LINK_INACTIVE: {
    code: "LINK_INACTIVE",
    statusCode: 410,
    message: "Link is inactive",
  },
  LINK_EXPIRED: {
    code: "LINK_EXPIRED",
    statusCode: 410,
    message: "Link has expired",
  },
  LINK_UNSAFE_REDIRECT: {
    code: "LINK_UNSAFE_REDIRECT",
    statusCode: 400,
    message: "Unsafe redirect target",
  },

  RATE_LIMITED: {
    code: "RATE_LIMITED",
    statusCode: 429,
    message: "Too many requests",
  },
};
