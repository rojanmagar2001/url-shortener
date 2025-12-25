export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public override readonly cause?: unknown;

  constructor(args: {
    code: string;
    message: string;
    statusCode: number;
    cause?: unknown;
  }) {
    super(args.message);
    this.code = args.code;
    this.statusCode = args.statusCode;
    this.cause = args.cause;
  }
}
