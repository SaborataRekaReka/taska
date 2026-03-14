import 'reflect-metadata';

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module.js';
import { ResponseEnvelopeInterceptor } from './core/response-envelope.interceptor.js';
import { UnifiedErrorFilter } from './core/unified-error.filter.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: false }),
  );

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
    .setDescription('A1 foundation with NestJS + Fastify modular bootstrap.')
    .setVersion('0.2.0')
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
