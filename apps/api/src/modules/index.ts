import type { RouteDefinition } from '../core/http.js';
import { aiAssistantModuleRoutes } from './ai-assistant/module.js';
import { authModuleRoutes } from './auth/module.js';
import { historyModuleRoutes } from './history/module.js';
import { listsModuleRoutes } from './lists/module.js';
import { subtasksModuleRoutes } from './subtasks/module.js';
import { tasksModuleRoutes } from './tasks/module.js';
import { usersModuleRoutes } from './users/module.js';

export const moduleRegistry = [
  'auth',
  'users',
  'lists',
  'tasks',
  'subtasks',
  'history',
  'ai-assistant',
] as const;

export const moduleRoutes: RouteDefinition[] = [
  ...authModuleRoutes,
  ...usersModuleRoutes,
  ...listsModuleRoutes,
  ...tasksModuleRoutes,
  ...subtasksModuleRoutes,
  ...historyModuleRoutes,
  ...aiAssistantModuleRoutes,
];
