import { ERRORS, type ErrorCode } from "./catalog";

const APP_ERROR_TAG = "AppError:v1";

export class AppError extends Error {
  public readonly _tag = APP_ERROR_TAG;
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: unknown;
  public override readonly cause?: unknown;

  constructor(args: {
    code: ErrorCode;
    message?: string;
    statusCode?: number;
    details?: unknown;
    cause?: unknown;
  }) {
    const def = ERRORS[args.code];
    super(args.message ?? def.message);

    this.code = args.code;
    this.statusCode = args.statusCode ?? def.statusCode;
    this.details = args.details;
    this.cause = args.cause;
  }
}

/**
 * Convenience helper to throw typed errors using the central catalog.
 */
export function err(
  code: ErrorCode,
  opts?: { message?: string; details?: unknown; cause?: unknown },
): AppError {
  return new AppError({
    code,
    message: opts?.message,
    details: opts?.details,
    cause: opts?.cause,
  });
}

export function isAppError(err: unknown): err is AppError {
  return (
    typeof err === "object" &&
    err !== null &&
    "_tag" in err &&
    (err as any)._tag === APP_ERROR_TAG &&
    "code" in err &&
    "statusCode" in err
  );
}

export { ERRORS, type ErrorCode };
