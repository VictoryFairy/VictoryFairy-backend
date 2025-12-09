import { DocumentBuilder } from '@nestjs/swagger';

export const swaggerConfig = new DocumentBuilder()
  .setTitle('승요 API')
  .setVersion('0.0.1')
  .addBearerAuth(
    {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      in: 'header',
    },
    'access-token',
  )
  .addCookieAuth(
    'token',
    {
      type: 'apiKey',
      in: 'cookie',
      name: 'token',
    },
    'refresh-token',
  )
  .build();
