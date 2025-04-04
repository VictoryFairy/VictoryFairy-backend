import { DataSource } from 'typeorm';
import { Seeder } from 'typeorm-extension';
import { Logger } from '@nestjs/common';
import * as moment from 'moment';
import { upsertSchedules } from 'src/modules/game/scheduling/game-crawling.util';

export default class GameSeeder implements Seeder {
  private readonly logger = new Logger(GameSeeder.name);
  public async run(dataSource: DataSource): Promise<any> {
    const getGameMonth = this.getGameMonths();

    try {
      await Promise.all(
        getGameMonth.map(async (seedMonth) => {
          await upsertSchedules({ ...seedMonth, dataSource });
          this.logger.log(
            `Seeding completed for ${seedMonth.year}-${seedMonth.month}`,
          );
        }),
      );
      this.logger.log('Game seeding data saving completed.');
    } catch (error) {
      this.logger.error('Error occurred while seeding games', error.stack);
    }
  }

  private getGameMonths(): { year: number; month: number }[] {
    const thisYear = moment().get('year');
    const thisMonth = moment().get('month') + 1;

    const monthList = [];
    for (let y = 2023; y <= thisYear; y++) {
      if (thisYear === y) {
        for (let m = 1; m < thisMonth; m++) {
          monthList.push({ year: y, month: m });
        }
      } else {
        for (let m = 1; m <= 12; m++) {
          monthList.push({ year: y, month: m });
        }
      }
    }
    return monthList;
  }
}
