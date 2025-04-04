import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule } from '@nestjs/swagger';
import { swaggerConfig } from './core/config/swagger.config';
import * as cookieParser from 'cookie-parser';
import { ConfigService } from '@nestjs/config';
import { ApiLoggingInterceptor } from './common/interceptors/api-logger.interceptor';
import * as basicAuth from 'express-basic-auth';
import { initializeTransactionalContext } from 'typeorm-transactional';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  initializeTransactionalContext();

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);
  const backendRootUrl = configService.get<string>(
    'BACK_END_URL',
    'http://localhost:3000',
  );
  const frontendRootUrl = configService.get<string>(
    'FRONT_END_URL',
    'http://localhost:5173',
  );
  const nodeEnv = configService.get<string>('NODE_ENV');
  const swaggerUser = configService.get<string>('SWAGGER_USER');
  const swaggerPw = configService.get<string>('SWAGGER_PW');

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
    origin: [frontendRootUrl, backendRootUrl],
    credentials: true,
  });
  if (nodeEnv === 'production') {
    app.use(
      ['/api-doc'],
      basicAuth({ challenge: true, users: { [swaggerUser]: swaggerPw } }),
    );
  }

  app.useGlobalInterceptors(new ApiLoggingInterceptor());
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api-doc', app, document);
  await app.listen(3000);
}
bootstrap();
