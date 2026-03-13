import { createServer } from 'node:http';

import { createApiApp } from './server.js';

const port = Number(process.env.PORT ?? 3000);
const app = createApiApp();

const server = createServer((req, res) => {
  app.handle(req, res);
});

server.listen(port, () => {
  console.log(`[api] listening on :${port}`);
  console.log(`[api] health: http://localhost:${port}/health`);
  console.log(`[api] openapi: http://localhost:${port}/openapi.json`);
});
