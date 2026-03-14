import { respondOk } from '../../core/http.js';
import type { RouteDefinition } from '../../core/http.js';

export const aiAssistantModuleRoutes: RouteDefinition[] = [
  {
    method: 'GET',
    path: '/ai-assistant/health',
    handler: ({ res, requestId }) => {
      respondOk(res, requestId, { module: 'ai-assistant', status: 'planned' });
    },
  },
];
