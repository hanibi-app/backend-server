import { ClassSerializerInterceptor, ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import helmet from 'helmet';
import morgan from 'morgan';
import { AppModule } from './app.module';
import { WinstonLoggerService } from './common/logger/logger.service';
import { generalRateLimiter, sensorDataRateLimiter } from './common/middleware/sensor-rate-limit.middleware';
import { createSwaggerDocument } from './swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const winstonLogger = app.get(WinstonLoggerService);
  app.useLogger(winstonLogger);

  const globalPrefix = 'api';
  const apiVersion = 'v1';

  app.setGlobalPrefix(globalPrefix);
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: apiVersion,
  });

  app.use(helmet());
  app.use(compression());
  
  // 센서 데이터 전송 API 전용 Rate Limit (더 관대함, POST만)
  app.use(`/${globalPrefix}/${apiVersion}/sensors`, sensorDataRateLimiter);
  
  // 일반 API용 Rate Limit (더 엄격함)
  app.use(generalRateLimiter);

  app.use(morgan('combined'));
  app.enableCors({
    origin: process.env.CORS_ORIGINS?.split(',') ?? '*',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      forbidNonWhitelisted: true,
    }),
  );

  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  const swaggerDocument = createSwaggerDocument(app);
  SwaggerModule.setup('docs', app, swaggerDocument, {
    customSiteTitle: 'Hanibi API Docs',
  });

  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  await app.listen(port);
  winstonLogger.log(`Application running on http://localhost:${port}/${globalPrefix}/${apiVersion}`, 'Bootstrap');
  winstonLogger.log(`Swagger docs available at http://localhost:${port}/docs`, 'Bootstrap');
}

bootstrap();
