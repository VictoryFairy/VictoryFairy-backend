import { Team } from 'src/modules/team/core/domain/team.entity';
import { DataSource } from 'typeorm';
import { Seeder } from 'typeorm-extension';
import { teamSeeder } from './data/team.seed';

export default class TeamSeeder implements Seeder {
  async run(dataSource: DataSource): Promise<any> {
    await dataSource.manager.transaction(async (manager) => {
      for (const seed of teamSeeder) {
        await manager.getRepository(Team).upsert(
          {
            name: seed.name,
            id: seed.id,
          },
          ['name'],
        );
      }
    });
  }
}
