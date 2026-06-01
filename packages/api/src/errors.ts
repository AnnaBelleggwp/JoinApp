export interface JoinApiErrorOptions {
  code?: string;
  details?: string;
  hint?: string;
  status?: number;
  cause?: unknown;
}

export class JoinApiError extends Error {
  readonly code?: string;
  readonly details?: string;
  readonly hint?: string;
  readonly status?: number;

  constructor(message: string, options: JoinApiErrorOptions = {}) {
    super(message);
    this.name = "JoinApiError";
    this.code = options.code;
    this.details = options.details;
    this.hint = options.hint;
    this.status = options.status;

    if (options.cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = options.cause;
    }
  }
}

export function toJoinApiError(error: unknown): JoinApiError {
  if (error instanceof JoinApiError) return error;

  if (typeof error === "object" && error !== null) {
    const candidate = error as {
      message?: string;
      code?: string;
      details?: string;
      hint?: string;
      status?: number;
    };

    return new JoinApiError(candidate.message || "Join API request failed", {
      code: candidate.code,
      details: candidate.details,
      hint: candidate.hint,
      status: candidate.status,
      cause: error,
    });
  }

  return new JoinApiError("Join API request failed", { cause: error });
}
