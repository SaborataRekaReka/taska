import { createServer } from 'node:http';

import { createApiApp } from './server.js';

const port = Number(process.env.PORT ?? 3000);
const app = createApiApp();

const server = createServer((req, res) => {
  app.handle(req, res);
});

server.listen(port, () => {
  console.log(`[api] listening on :${port}`);
});
