/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { AuditInterceptor } from './audit/audit.interceptor.js';
import { NestExpressApplication } from '@nestjs/platform-express';
// import { Logger } from '@nestjs/common';
import * as dotenv from 'dotenv';

dotenv.config();

async function bootstrap() {
  // Cast to NestExpressApplication to access Express-specific methods
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // TRUST PROXY: Essential for Throttler to see the real User IP
  // '1' means trust the first hop. Use 'true' if behind many hops (Cloudflare -> Nginx).
  app.set('trust proxy', 1);

  // 1. Create an array of allowed origins
  const allowedOrigins = [
    process.env.ALLOWED_ORIGIN,
    'http://localhost:5173',
    'http://localhost:3000',
  ].filter((origin): origin is string => origin !== undefined); // removes 'undefined' if the env variable isn't set

  app.enableCors({
    origin: allowedOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    optionsSuccessStatus: 200,
  });

  app.setGlobalPrefix('api');

  // console.log('Allowed CORS origins:', allowedOrigins);

  // const thisLogger = new Logger('Main');
  // thisLogger.log('Starting application...');
  // thisLogger.log('Allowed CORS origins:', allowedOrigins);
  // thisLogger.log('Environment:', process.env.NODE_ENV);

  // Interceptors should usually come AFTER CORS/Prefix setup
  const auditInterceptor = app.get(AuditInterceptor);
  app.useGlobalInterceptors(auditInterceptor);

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const config = new DocumentBuilder()
    .setTitle('Admin API')
    .setDescription('All endpoints and auth testing')
    .setVersion('1.0')
    .addBearerAuth() // adds auth UI support
    .build();
  const doc = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, doc);

  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
