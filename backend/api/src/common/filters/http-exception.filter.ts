import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Semantic error codes understood by the frontend normalization layer.
 * Frontend maps these to localized, user-friendly messages.
 * Never include sensitive internals here.
 */
const MESSAGE_TO_CODE: Record<string, string> = {
  'Invalid email or password': 'AUTH_INVALID_CREDENTIALS',
  'An account with this email already exists': 'AUTH_EMAIL_ALREADY_EXISTS',
  'Email is already verified': 'AUTH_EMAIL_ALREADY_VERIFIED',
  'Invalid or expired reset token': 'AUTH_INVALID_TOKEN',
  'Invalid or expired verification token': 'AUTH_INVALID_TOKEN',
  'Invalid or already used invitation code': 'AUTH_INVALID_INVITE',
  'Invitation has expired': 'AUTH_INVALID_INVITE',
  'Email must match the invited address': 'AUTH_INVALID_INVITE',
  'This account type must be created by an administrator': 'AUTH_FORBIDDEN_ROLE',
};

function resolveCode(status: number, message: string): string {
  // Check known message → code mappings first
  if (MESSAGE_TO_CODE[message]) {
    return MESSAGE_TO_CODE[message];
  }
  // Generic per-status fallbacks
  switch (status) {
    case 400: return 'VALIDATION_ERROR';
    case 401: return 'UNAUTHORIZED';
    case 403: return 'FORBIDDEN';
    case 404: return 'NOT_FOUND';
    case 409: return 'CONFLICT';
    case 422: return 'UNPROCESSABLE';
    case 429: return 'RATE_LIMITED';
    default:
      return status >= 500 ? 'SERVER_ERROR' : 'REQUEST_ERROR';
  }
}

/** Safe user-facing message — never leak stack traces or internal details. */
function sanitizeMessage(message: unknown): string | string[] {
  if (Array.isArray(message)) {
    return (message as unknown[])
      .filter((m) => typeof m === 'string')
      .map((m) => String(m)) as string[];
  }
  if (typeof message === 'string' && message.trim().length > 0) {
    return message.trim();
  }
  return 'An unexpected error occurred';
}

@Catch()
export class GlobalHttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalHttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exResponse = exception.getResponse();
      if (typeof exResponse === 'string') {
        message = exResponse;
      } else if (typeof exResponse === 'object' && exResponse !== null) {
        const r = exResponse as Record<string, unknown>;
        message = sanitizeMessage(r['message'] ?? r['error'] ?? 'An error occurred');
      }
    } else {
      // Non-HTTP exceptions: log internally, return generic 500
      this.logger.error('Unhandled exception', exception instanceof Error ? exception.stack : String(exception));
      message = 'Something went wrong. Please try again later.';
    }

    const safeMessage = sanitizeMessage(message);
    const primaryMessage = Array.isArray(safeMessage) ? safeMessage[0] ?? '' : safeMessage;
    const code = resolveCode(status, primaryMessage);

    // Log 5xx errors server-side (not 4xx — those are client errors)
    if (status >= 500) {
      this.logger.error(`${request.method} ${request.url} → ${status} [${code}]`);
    }

    response.status(status).json({
      statusCode: status,
      code,
      message: safeMessage,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
