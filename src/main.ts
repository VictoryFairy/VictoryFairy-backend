import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule } from '@nestjs/swagger';
import { swaggerConfig } from './config/swagger.config';
import * as cookieParser from 'cookie-parser';
import { ConfigService } from '@nestjs/config';
import { ApiLoggingInterceptor } from './interceptor/api-logger.interceptor';
import * as basicAuth from 'express-basic-auth';
import { initializeTransactionalContext } from 'typeorm-transactional';

async function bootstrap() {
  initializeTransactionalContext();

  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const backendRootUrl = configService.get<string>('BACK_END_URL');
  const frontendRootUrl = configService.get<string>('FRONT_END_URL');
  const nodeEnv = configService.get<string>('NODE_ENV');
  const swaggerUser = configService.get<string>('SWAGGER_USER');
  const swaggerPw = configService.get<string>('SWAGGER_PW');

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
