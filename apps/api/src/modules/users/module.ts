import { respondOk } from '../../core/http.js';
import type { RouteDefinition } from '../../core/http.js';

export const usersModuleRoutes: RouteDefinition[] = [
  {
    method: 'GET',
    path: '/users/health',
    handler: ({ res, requestId }) => {
      respondOk(res, requestId, { module: 'users', status: 'planned' });
    },
  },
];
