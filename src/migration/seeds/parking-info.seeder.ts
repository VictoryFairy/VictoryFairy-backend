import { ParkingInfo } from 'src/entities/parking-info.entity';
import { Stadium } from 'src/entities/stadium.entity';
import { parkingInfoSeeder } from 'src/migration/seeds/data/parking-info.seed';
import { DataSource } from 'typeorm';
import { Seeder } from 'typeorm-extension';

export default class ParkingInfoSeeder implements Seeder {
  async run(dataSource: DataSource): Promise<any> {
    await dataSource.manager.transaction(async (manager) => {
      for (const seed of parkingInfoSeeder) {
        const stadium = await manager
          .getRepository(Stadium)
          .findOne({ where: { name: seed.stadium } });

        await manager.getRepository(ParkingInfo).upsert(
          {
            name: seed.name,
            latitude: seed.position.lat,
            longitude: seed.position.lng,
            address: seed.address,
            link: seed.link,
            stadium: stadium,
          },
          ['name'],
        );
      }
    });
  }
}
