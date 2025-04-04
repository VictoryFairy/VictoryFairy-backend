import { Stadium } from 'src/modules/stadium/entities/stadium.entity';
import { DataSource } from 'typeorm';
import { Seeder } from 'typeorm-extension';
import { stadiumSeeder } from './data/stadium.seed';

export default class StadiumSeeder implements Seeder {
  async run(dataSource: DataSource): Promise<any> {
    await dataSource.manager.transaction(async (manager) => {
      for (const seed of stadiumSeeder) {
        await manager.getRepository(Stadium).upsert(
          {
            name: seed.name,
            full_name: seed.full_name,
            latitude: seed.lat,
            longitude: seed.lng,
          },
          ['name'],
        );
      }
    });
  }
}
