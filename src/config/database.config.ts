import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const getDatabaseConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => {
  const nodeEnv = configService.get<string>('NODE_ENV');

  return {
    type: 'postgres',
    host: configService.get<string>('DB_CONTAINER_NAME') || 'localhost',
    port: configService.get<number>('DB_TCP_PORT'),
    database: configService.get<string>('DB_DATABASE_NAME'),
    username: configService.get<string>('DB_USER'),
    password: configService.get<string>('DB_PASSWORD'),
    entities: ['dist/**/entities/*.entity.{ts,js}'],
    synchronize: nodeEnv !== 'production',
  };
};
