import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import { Catch, HttpException, HttpStatus } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';

import { resolveRequestId } from './request-id.js';

interface NormalizedError {
  statusCode: number;
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

function toErrorCode(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function statusCodeToErrorCode(statusCode: number): string {
  switch (statusCode) {
    case HttpStatus.BAD_REQUEST:
      return 'VALIDATION_ERROR';
    case HttpStatus.UNAUTHORIZED:
      return 'UNAUTHORIZED';
    case HttpStatus.FORBIDDEN:
      return 'FORBIDDEN';
    case HttpStatus.NOT_FOUND:
      return 'NOT_FOUND';
    case HttpStatus.CONFLICT:
      return 'CONFLICT';
    case HttpStatus.UNPROCESSABLE_ENTITY:
      return 'VALIDATION_ERROR';
    default:
      return 'HTTP_ERROR';
  }
}

function normalizeHttpException(exception: HttpException): NormalizedError {
  const statusCode = exception.getStatus();
  const response = exception.getResponse();

  let code = statusCodeToErrorCode(statusCode);
  let message = exception.message || 'Request failed';
  let details: Record<string, unknown> | undefined;

  if (typeof response === 'string') {
    message = response;
  } else if (response && typeof response === 'object') {
    const body = response as {
      message?: unknown;
      error?: unknown;
      details?: unknown;
    };

    if (Array.isArray(body.message)) {
      message = 'Validation failed';
      details = {
        messages: body.message.map((value) => String(value)),
      };
      code = 'VALIDATION_ERROR';
    } else if (typeof body.message === 'string' && body.message.trim().length > 0) {
      message = body.message;
    }

    if (typeof body.error === 'string' && body.error.trim().length > 0) {
      code = toErrorCode(body.error);
    }

    if (body.details && typeof body.details === 'object' && !Array.isArray(body.details)) {
      details = body.details as Record<string, unknown>;
    }
  }

  if (details) {
    return { statusCode, code, message, details };
  }

  return { statusCode, code, message };
}

@Catch()
export class UnifiedErrorFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<FastifyRequest>();
    const reply = http.getResponse<FastifyReply>();

    const requestId = request.requestId ?? resolveRequestId(request.headers['x-request-id']);
    request.requestId = requestId;
    reply.header('x-request-id', requestId);

    const normalized: NormalizedError =
      exception instanceof HttpException
        ? normalizeHttpException(exception)
        : {
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            code: 'INTERNAL_ERROR',
            message: 'Unexpected server error',
          };

    reply.status(normalized.statusCode).send({
      error: {
        code: normalized.code,
        message: normalized.message,
        ...(normalized.details ? { details: normalized.details } : {}),
      },
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
      },
    });
  }
}
