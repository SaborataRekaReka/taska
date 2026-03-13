import { respondOk } from '../../core/http.js';
import type { RouteDefinition } from '../../core/http.js';

export const listsModuleRoutes: RouteDefinition[] = [
  {
    method: 'GET',
    path: '/lists/health',
    handler: ({ res, requestId }) => {
      respondOk(res, requestId, { module: 'lists', status: 'planned' });
    },
  },
];
