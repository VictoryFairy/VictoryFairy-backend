import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_CONTAINER_NAME || 'localhost',
  port: process.env.DB_TCP_PORT ? parseInt(process.env.DB_TCP_PORT) : 5432,
  database: process.env.DB_DATABASE_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  entities: [
    isProduction ? 'dist/entities/*.entity.js' : 'src/entities/*.entity.ts',
  ],
  migrations: [
    isProduction
      ? 'dist/migration/files/**/*.js'
      : 'src/migration/files/**/*.ts',
  ],
  migrationsTableName: 'migrations',
});
