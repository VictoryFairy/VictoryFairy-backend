import { DocumentBuilder } from "@nestjs/swagger";

export const swaggerConfig = new DocumentBuilder()
  .setTitle('승리 요정 백엔드 API')
  .setDescription('승리 요정 백엔드 API 문서입니다.')
  .setVersion('0.0.1')
  .build();
