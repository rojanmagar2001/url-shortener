export type ErrorCode =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "INTERNAL_ERROR"
  | "IDENTITY_EMAIL_TAKEN"
  | "IDENTITY_INVALID_CREDENTIALS"
  | "IDENTITY_USER_DISABLED"
  | "IDENTITY_PROVIDER_NOT_SUPPORTED"
  | "IDENTITY_EMAIL_NOT_VERIFIED";

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
};
