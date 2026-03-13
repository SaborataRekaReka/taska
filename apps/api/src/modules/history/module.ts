import { respondOk } from '../../core/http.js';
import type { RouteDefinition } from '../../core/http.js';

export const historyModuleRoutes: RouteDefinition[] = [
  {
    method: 'GET',
    path: '/history/health',
    handler: ({ res, requestId }) => {
      respondOk(res, requestId, { module: 'history', status: 'planned' });
    },
  },
];
