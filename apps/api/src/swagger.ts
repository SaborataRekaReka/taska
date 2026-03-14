import { moduleRegistry } from './modules/index.js';

const moduleHealthPaths = moduleRegistry.reduce<Record<string, { get: { summary: string } }>>(
  (acc, moduleName) => {
    acc[`/${moduleName}/health`] = {
      get: {
        summary: `${moduleName} module health`,
      },
    };
    return acc;
  },
  {},
);

export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Taska API',
    version: '0.3.0',
    description:
      'A-series bootstrap shell with auth flow, request-id envelopes, and module-scoped health routes.',
  },
  servers: [
    {
      url: 'http://localhost:3000',
    },
  ],
  paths: {
    '/health': {
      get: {
        summary: 'Service health check',
      },
    },
    '/openapi.json': {
      get: {
        summary: 'OpenAPI document',
      },
    },
    '/auth/register': {
      post: {
        summary: 'Register with email and password',
      },
    },
    '/auth/login': {
      post: {
        summary: 'Login with email and password',
      },
    },
    '/auth/refresh': {
      post: {
        summary: 'Rotate token pair by refresh token',
      },
    },
    '/auth/logout': {
      post: {
        summary: 'Logout by invalidating refresh token',
      },
    },
    ...moduleHealthPaths,
  },
  tags: moduleRegistry.map((moduleName) => ({ name: moduleName })),
} as const;
