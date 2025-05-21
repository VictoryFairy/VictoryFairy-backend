import { NestExpressApplication } from '@nestjs/platform-express';
import * as request from 'supertest';

export function requestWithDefault(
  app: NestExpressApplication,
  method: 'get' | 'post' | 'put' | 'patch' | 'delete' | 'head' | 'options',
  url: string,
) {
  const baseRequest = request(app.getHttpServer());
  return baseRequest[method](url)
    .set('User-Agent', 'test-agent')
    .set('X-Forwarded-For', '127.0.0.1');
}
