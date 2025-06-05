import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { IDotenv } from './dotenv.interface';

export const getDatabaseConfig = (
  configService: ConfigService<IDotenv>,
): TypeOrmModuleOptions => {
  return {
    type: 'postgres',
    host:
      configService.get('DB_CONTAINER_NAME', { infer: true }) || 'localhost',
    port: configService.get('DB_TCP_PORT', { infer: true }),
    database: configService.get('DB_DATABASE_NAME', { infer: true }),
    username: configService.get('DB_USER', { infer: true }),
    password: configService.get('DB_PASSWORD', { infer: true }),
    autoLoadEntities: true,
    synchronize: false,
    extra: {
      max: configService.get('DB_MAX_CONNECTIONS', { infer: true }) || 10,
    },
  };
};
