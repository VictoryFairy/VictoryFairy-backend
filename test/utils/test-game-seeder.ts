import { DataSource } from 'typeorm';
import { Seeder } from 'typeorm-extension';
import { mockGames } from '../mock/data/mock-games';

export default class TestGameSeeder implements Seeder {
  public async run(dataSource: DataSource): Promise<any> {
    const gameRepo = dataSource.getRepository('game');
    await gameRepo.insert(mockGames);
  }
}
