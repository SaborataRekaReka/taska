import { respondOk } from '../../core/http.js';
import type { RouteDefinition } from '../../core/http.js';

export const tasksModuleRoutes: RouteDefinition[] = [
  {
    method: 'GET',
    path: '/tasks/health',
    handler: ({ res, requestId }) => {
      respondOk(res, requestId, { module: 'tasks', status: 'planned' });
    },
  },
];
