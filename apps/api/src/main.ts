import 'reflect-metadata';

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module.js';
import { ResponseEnvelopeInterceptor } from './core/response-envelope.interceptor.js';
import { UnifiedErrorFilter } from './core/unified-error.filter.js';

function loadLocalEnvDefaults(): void {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const repoRoot = resolve(currentDir, '../../..');
  const candidates = [
    resolve(repoRoot, '.env'),
    resolve(repoRoot, '.env.example'),
  ];

  for (const filePath of candidates) {
    if (!existsSync(filePath)) {
      continue;
    }

    const lines = readFileSync(filePath, 'utf8').split(/\r?\n/);
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) {
        continue;
      }

      const separatorIndex = line.indexOf('=');
      if (separatorIndex <= 0) {
        continue;
      }

      const key = line.slice(0, separatorIndex).trim();
      if (!key || process.env[key] !== undefined) {
        continue;
      }

      let value = line.slice(separatorIndex + 1).trim();
      const hasMatchingQuotes = (
        (value.startsWith('"') && value.endsWith('"'))
        || (value.startsWith('\'') && value.endsWith('\''))
      );

      if (hasMatchingQuotes && value.length >= 2) {
        value = value.slice(1, -1);
      }

      process.env[key] = value;
    }
  }
}

loadLocalEnvDefaults();

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: false }),
  );

  app.enableCors({ origin: true, credentials: true });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.useGlobalInterceptors(new ResponseEnvelopeInterceptor());
  app.useGlobalFilters(new UnifiedErrorFilter());

  const openApiConfig = new DocumentBuilder()
    .setTitle('Taska API')
    .setDescription('Task Manager API with AI assistant. Auth, Lists, Tasks, Subtasks, History.')
    .setVersion('0.3.0')
    .addBearerAuth()
    .build();
  const openApiDocument = SwaggerModule.createDocument(app, openApiConfig);
  SwaggerModule.setup('docs', app, openApiDocument, {
    jsonDocumentUrl: 'openapi.json',
  });

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port, '0.0.0.0');

  console.log(`[api] listening on :${port}`);
  console.log(`[api] health: http://localhost:${port}/health`);
  console.log(`[api] docs: http://localhost:${port}/docs`);
  console.log(`[api] openapi: http://localhost:${port}/openapi.json`);
}

bootstrap().catch((error: unknown) => {
  console.error('[api] bootstrap failed', error);
  process.exit(1);
});
