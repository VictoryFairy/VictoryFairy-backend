import { CheeringSong } from 'src/entities/cheering-song.entity';
import { Player } from 'src/entities/player.entity';
import { Team } from 'src/entities/team.entity';
import { refinedCheeringSongs } from 'src/migration/seeds/data/cheering-song.seed';
import { DataSource } from 'typeorm';
import { Seeder } from 'typeorm-extension';

export default class CheeringSongSeeder implements Seeder {
  async run(dataSource: DataSource): Promise<any> {
    const cheeringSongSeeder = refinedCheeringSongs;

    await dataSource.manager.transaction(async (manager) => {
      for (const seed of cheeringSongSeeder) {
        const team = await manager
          .getRepository(Team)
          .findOne({ where: { name: seed.team_name } });

        let player: Player | undefined;

        if (seed.type === 'player') {
          player = await manager.getRepository(Player).findOne({
            where: {
              name: seed.player_name,
              jersey_number: seed.jersey_number,
            },
          });

          if (!player) {
            player = manager.getRepository(Player).create({
              name: seed.player_name,
              jersey_number: seed.jersey_number,
              position: seed.position,
              throws_bats: seed.throws_bats,
              team: team,
            });
            await manager
              .getRepository(Player)
              .upsert(player, ['name', 'jersey_number']);
          }
        }

        await manager.getRepository(CheeringSong).upsert(
          {
            type: seed.type,
            title: seed.title,
            lyrics: seed.lyrics,
            link: seed.link,
            team: team,
            player: player,
          },
          ['link'],
        );
      }
    });
  }
}
