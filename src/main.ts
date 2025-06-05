import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule } from '@nestjs/swagger';
import { swaggerConfig } from './core/config/swagger.config';
import * as cookieParser from 'cookie-parser';
import { ConfigService } from '@nestjs/config';
import { ApiLoggingInterceptor } from './common/interceptors/api-logger.interceptor';
import { initializeTransactionalContext } from 'typeorm-transactional';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as Sentry from '@sentry/node';
import { IDotenv } from './core/config/dotenv.interface';

async function bootstrap() {
  initializeTransactionalContext();

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService<IDotenv>);
  const frontendRootUrl =
    configService.get('FRONT_END_URL', { infer: true }) ||
    'http://localhost:5173';
  const nodeEnv =
    configService.get('NODE_ENV', { infer: true }) || 'development';

  if (nodeEnv === 'production') {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
    });
  }

  app.set('trust proxy', true);
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  app.enableCors({
    origin: [frontendRootUrl],
    credentials: true,
  });

  app.useGlobalInterceptors(new ApiLoggingInterceptor());
  if (nodeEnv !== 'production') {
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api-doc', app, document);
  }
  await app.listen(3000);
}
bootstrap();
