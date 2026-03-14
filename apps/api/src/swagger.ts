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
    version: '0.2.0',
    description:
      'A1 modular bootstrap shell with request-id, unified errors, and module-scoped health routes.',
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
    ...moduleHealthPaths,
  },
  tags: moduleRegistry.map((moduleName) => ({ name: moduleName })),
} as const;
