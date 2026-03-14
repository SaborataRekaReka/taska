import type { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { resolveRequestId } from './request-id.js';

function normalizeData(payload: unknown): Record<string, unknown> {
  if (payload === null || payload === undefined) {
    return {};
  }

  if (typeof payload === 'object' && !Array.isArray(payload)) {
    return payload as Record<string, unknown>;
  }

  return { value: payload };
}

@Injectable()
export class ResponseEnvelopeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<FastifyRequest>();
    const reply = http.getResponse<FastifyReply>();

    const requestId = resolveRequestId(request.headers['x-request-id']);
    request.requestId = requestId;
    reply.header('x-request-id', requestId);

    return next.handle().pipe(
      map((payload: unknown) => ({
        data: normalizeData(payload),
        meta: {
          requestId,
          timestamp: new Date().toISOString(),
        },
      })),
    );
  }
}
