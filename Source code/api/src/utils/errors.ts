export class AppError extends Error {
  statusCode: number;
  code?: string;
  details?: Record<string, unknown>;

  constructor(
    message: string,
    statusCode: number,
    code?: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = new.target.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class BadRequestError extends AppError {
  constructor(
    message: string,
    code?: string,
    details?: Record<string, unknown>
  ) {
    super(message, 400, code, details);
  }
}

export class UnprocessableEntityError extends AppError {
  constructor(
    message: string,
    code?: string,
    details?: Record<string, unknown>
  ) {
    super(message, 422, code, details);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(message, 404);
  }
}

export class UnauthenticatedError extends AppError {
  constructor(message: string) {
    super(message, 401);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string) {
    super(message, 403);
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(
    message: string,
    code?: string,
    details?: Record<string, unknown>
  ) {
    super(message, 503, code, details);
  }
}
