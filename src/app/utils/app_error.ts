export class AppError extends Error {
  public statusCode: number;
  public details?: Record<string, unknown>;

  constructor(
    message: string,
    statusCode: number,
    details?: Record<string, unknown>,
    stack = "",
  ) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}
