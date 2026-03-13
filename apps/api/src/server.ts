import { createHttpApp, jsonValidationMiddleware, respondOk } from './core/http.js';
import type { RouteDefinition } from './core/http.js';
import { moduleRegistry, moduleRoutes } from './modules/index.js';
import { openApiDocument } from './swagger.js';

const foundationRoutes: RouteDefinition[] = [
  {
    method: 'GET',
    path: '/health',
    handler: ({ res, requestId }) => {
      respondOk(res, requestId, {
        ok: true,
        service: 'taska-api',
        architecture: 'modular-bootstrap',
        modules: moduleRegistry,
      });
    },
  },
  {
    method: 'GET',
    path: '/openapi.json',
    handler: ({ res, requestId }) => {
      respondOk(res, requestId, openApiDocument as unknown as Record<string, unknown>);
    },
  },
];


export function createApiApp() {
  return createHttpApp([...foundationRoutes, ...moduleRoutes], [jsonValidationMiddleware]);
}
