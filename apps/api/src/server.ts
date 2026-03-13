import type { IncomingMessage, ServerResponse } from 'node:http';

import { moduleRegistry } from './modules/index.js';

interface JsonResponse {
  status: number;
  body: Record<string, unknown>;
}

function json(res: ServerResponse, response: JsonResponse): void {
  res.statusCode = response.status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(response.body));
}

export function createApiApp() {
  return {
    handle(req: IncomingMessage, res: ServerResponse): void {
      if (req.url === '/health' && req.method === 'GET') {
        json(res, {
          status: 200,
          body: {
            ok: true,
            service: 'taska-api',
            modules: moduleRegistry,
          },
        });
        return;
      }

      json(res, {
        status: 404,
        body: {
          error: 'Not Found',
        },
      });
    },
  };
}
