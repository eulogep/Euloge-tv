/**
 * Base error class for the MJTV domain. Carries a stable `code` so the UI
 * layer can map to a deterministic French message without instanceof chains.
 */
export class AppError extends Error {
  readonly code: string;
  readonly cause?: unknown;
  constructor(code: string, message: string, cause?: unknown) {
    super(message);
    this.name = "AppError";
    this.code = code;
    if (cause !== undefined) {
      this.cause = cause;
    }
  }
}

export class ValidationError extends AppError {
  constructor(message: string, cause?: unknown) {
    super("VALIDATION_ERROR", message, cause);
    this.name = "ValidationError";
  }
}

export class NetworkError extends AppError {
  constructor(message: string, cause?: unknown) {
    super("NETWORK_ERROR", message, cause);
    this.name = "NetworkError";
  }
}

export class SchemaError extends AppError {
  constructor(message: string, cause?: unknown) {
    super("SCHEMA_ERROR", message, cause);
    this.name = "SchemaError";
  }
}

export class NotFoundError extends AppError {
  constructor(message: string, cause?: unknown) {
    super("NOT_FOUND", message, cause);
    this.name = "NotFoundError";
  }
}

export const isAppError = (value: unknown): value is AppError => value instanceof AppError;
