import * as dotenv from 'dotenv';
import { join } from 'path';
import { DataSource, DataSourceOptions } from 'typeorm';
import { SeederOptions } from 'typeorm-extension';
import TeamSeeder from './seeds/team.seeder';
import StadiumSeeder from './seeds/stadium.seeder';
import ParkingInfoSeeder from './seeds/parking-info.seeder';
import CheeringSongSeeder from './seeds/cheering-song.seeder';
import GameSeeder from './seeds/game.seeder';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

const dataOptions: DataSourceOptions & SeederOptions = {
  type: 'postgres',
  host: process.env.DB_CONTAINER_NAME || 'localhost',
  port: process.env.DB_TCP_PORT ? parseInt(process.env.DB_TCP_PORT) : 5432,
  database: process.env.DB_DATABASE_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  entities: [
    isProduction
      ? join(__dirname, '../dist/modules/**/entities/*.entity.js')
      : join(__dirname, '../src/modules/**/entities/*.entity.ts'),
  ],
  migrations: [
    isProduction
      ? join(__dirname, './migrations/*.js')
      : join(__dirname, './migrations/*.ts'),
  ],
  migrationsTableName: 'migrations',
  seeds: [
    TeamSeeder,
    StadiumSeeder,
    ParkingInfoSeeder,
    CheeringSongSeeder,
    GameSeeder,
  ],
};

export default new DataSource(dataOptions);
