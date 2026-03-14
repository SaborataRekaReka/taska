import type { IncomingMessage, ServerResponse } from 'node:http';

export interface ApiSuccess {
  data: Record<string, unknown>;
  meta: {
    requestId: string;
    timestamp: string;
  };
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta: {
    requestId: string;
    timestamp: string;
  };
}

export interface RequestContext {
  req: IncomingMessage;
  res: ServerResponse;
  requestId: string;
  method: string;
  pathname: string;
}

export interface RouteDefinition {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: string;
  handler: (context: RequestContext) => void | Promise<void>;
}

export type Middleware = (context: RequestContext) => void;

export class HttpError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
  }
}

export function createRequestId(req: IncomingMessage): string {
  const provided = req.headers['x-request-id'];
  if (typeof provided === 'string' && provided.trim().length > 0) {
    return provided;
  }

  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function writeJson(
  res: ServerResponse,
  statusCode: number,
  requestId: string,
  payload: Record<string, unknown>,
): void {
  res.statusCode = statusCode;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('x-request-id', requestId);
  res.end(JSON.stringify(payload));
}

export function respondOk(
  res: ServerResponse,
  requestId: string,
  data: Record<string, unknown>,
  statusCode = 200,
): void {
  const payload: ApiSuccess = {
    data,
    meta: {
      requestId,
      timestamp: new Date().toISOString(),
    },
  };

  writeJson(res, statusCode, requestId, payload as unknown as Record<string, unknown>);
}

export function respondError(
  res: ServerResponse,
  statusCode: number,
  requestId: string,
  code: string,
  message: string,
  details?: Record<string, unknown>,
): void {
  const payload: ApiError = {
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
    meta: {
      requestId,
      timestamp: new Date().toISOString(),
    },
  };

  writeJson(res, statusCode, requestId, payload as unknown as Record<string, unknown>);
}

export function createHttpApp(routes: RouteDefinition[], middlewares: Middleware[] = []) {
  const routeMap = new Map<string, RouteDefinition>();
  for (const route of routes) {
    routeMap.set(`${route.method} ${route.path}`, route);
  }

  return {
    handle(req: IncomingMessage, res: ServerResponse): void {
      const method = (req.method ?? 'GET') as RouteDefinition['method'];
      const pathname = new URL(req.url ?? '/', 'http://localhost').pathname;
      const requestId = createRequestId(req);

      const context: RequestContext = {
        req,
        res,
        requestId,
        method,
        pathname,
      };

      Promise.resolve()
        .then(async () => {
          for (const middleware of middlewares) {
            middleware(context);
          }

          const route = routeMap.get(`${method} ${pathname}`);
          if (!route) {
            throw new HttpError(404, 'NOT_FOUND', 'Route not found', { method, pathname });
          }

          await route.handler(context);
        })
        .catch((error: unknown) => {
          if (error instanceof HttpError) {
            respondError(res, error.statusCode, requestId, error.code, error.message, error.details);
            return;
          }

          respondError(res, 500, requestId, 'INTERNAL_ERROR', 'Unexpected server error');
        });
    },
  };
}

export const jsonValidationMiddleware: Middleware = ({ method, req }) => {
  const needsJson = method === 'POST' || method === 'PATCH';
  if (!needsJson) {
    return;
  }

  const contentType = req.headers['content-type'];
  if (typeof contentType === 'string' && contentType.includes('application/json')) {
    return;
  }

  throw new HttpError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Content-Type must be application/json', {
    method,
  });
};

export async function parseJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  const rawBody = await new Promise<string>((resolve, reject) => {
    let body = '';

    req.setEncoding('utf8');
    req.on('data', (chunk: string) => {
      body += chunk;
    });
    req.on('end', () => {
      resolve(body);
    });
    req.on('error', reject);
  });

  if (rawBody.trim().length === 0) {
    return {};
  }

  try {
    const parsed = JSON.parse(rawBody) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new HttpError(400, 'INVALID_JSON_BODY', 'Request body must be a JSON object');
    }

    return parsed as Record<string, unknown>;
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }

    throw new HttpError(400, 'INVALID_JSON_BODY', 'Request body must be valid JSON');
  }
}
