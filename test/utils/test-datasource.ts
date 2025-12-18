import * as dotenv from 'dotenv';
import { join } from 'path';
import { DataSource, DataSourceOptions } from 'typeorm';
import { SeederOptions } from 'typeorm-extension';

import TeamSeeder from 'src/tools/seeds/team.seeder';
import StadiumSeeder from 'src/tools/seeds/stadium.seeder';
import ParkingInfoSeeder from 'src/tools/seeds/parking-info.seeder';
import CheeringSongSeeder from 'src/tools/seeds/cheering-song.seeder';
import TestGameSeeder from './test-game-seeder';

dotenv.config({ path: join(__dirname, '../../.env.test') });

const dataSourceOptions: DataSourceOptions & SeederOptions = {
  type: 'postgres',
  host: process.env.DB_CONTAINER_NAME,
  port: parseInt(process.env.DB_TCP_PORT || '5432'),
  database: process.env.DB_DATABASE_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  entities: [join(__dirname, '../../src/modules/**/*.entity.ts')],
  migrations: [join(__dirname, '../../src/tools/migrations/*.ts')],
  migrationsTableName: 'migrations',
  seeds: [
    TeamSeeder,
    StadiumSeeder,
    ParkingInfoSeeder,
    CheeringSongSeeder,
    TestGameSeeder,
  ],
};

export default new DataSource(dataSourceOptions);
