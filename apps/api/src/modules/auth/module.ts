import { respondOk } from '../../core/http.js';
import type { RouteDefinition } from '../../core/http.js';

export const authModuleRoutes: RouteDefinition[] = [
  {
    method: 'GET',
    path: '/auth/health',
    handler: ({ res, requestId }) => {
      respondOk(res, requestId, { module: 'auth', status: 'planned' });
    },
  },
];
