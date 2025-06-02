import { mockGames } from 'test/mock/data/mock-games';
import { DataSource } from 'typeorm';
import { Seeder } from 'typeorm-extension';

export default class TestGameSeeder implements Seeder {
  public async run(dataSource: DataSource): Promise<any> {
    const gameRepo = dataSource.getRepository('game');
    const teamRepo = dataSource.getRepository('team');
    const stadiumRepo = dataSource.getRepository('stadium');

    for (const game of mockGames) {
      const homeTeam = await teamRepo.findOne({
        where: { id: game.home_team_id },
      });
      const awayTeam = await teamRepo.findOne({
        where: { id: game.away_team_id },
      });
      const winningTeam = game.winning_team_id
        ? await teamRepo.findOne({ where: { id: game.winning_team_id } })
        : null;
      const stadium = await stadiumRepo.findOne({
        where: { id: game.stadium_id },
      });

      await gameRepo.save({
        ...game,
        home_team: homeTeam,
        away_team: awayTeam,
        winning_team: winningTeam,
        stadium: stadium,
      });
    }
  }
}
