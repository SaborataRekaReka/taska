import { respondOk } from '../../core/http.js';
import type { RouteDefinition } from '../../core/http.js';

export const subtasksModuleRoutes: RouteDefinition[] = [
  {
    method: 'GET',
    path: '/subtasks/health',
    handler: ({ res, requestId }) => {
      respondOk(res, requestId, { module: 'subtasks', status: 'planned' });
    },
  },
];
