import { DocumentBuilder } from '@nestjs/swagger';

export const swaggerConfig = new DocumentBuilder()
  .setTitle('승요 API')
  .setVersion('0.0.1')
  .build();
