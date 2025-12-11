import { Stadium } from 'src/modules/stadium/core/domain/stadium.entity';
import { parkingInfoSeeder } from 'src/tools/seeds/data/parking-info.seed';
import { DataSource } from 'typeorm';
import { Seeder } from 'typeorm-extension';
import { ParkingInfo } from 'src/modules/parking-info/core/domain/parking-info.entity';

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
