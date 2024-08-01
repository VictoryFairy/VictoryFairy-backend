import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { from, map, Observable, switchMap } from 'rxjs';
import { Game } from 'src/entities/game.entity';
import { TGameSchedule, IGameData, ITeamAndScore, TTeam, IRawScheduleList } from 'src/types/crawling-game.type';
import { isNotTimeFormat, convertDateFormat } from 'src/util/time-format';
import { Repository } from 'typeorm';
import { TeamService } from './team.service';
import { StadiumService } from './stadium.service';
import { teamNameToTeamId } from 'src/util/teamid-mapper';
import parse from 'node-html-parser';

@Injectable()
export class GameService {
  constructor(
    private readonly httpService: HttpService,
    @InjectRepository(Game)
    private readonly gameRepository: Repository<Game>,
    private readonly teamService: TeamService,
    private readonly stadiumService: StadiumService,
  ) {}

  getScores(gameId: string = '20240731SSLG0'): Observable<unknown> {
    const extractScore = (htmlString: string) => {
      const root = parse(htmlString);
      const homeScoreElement = root.querySelector('.teamHome em');
      const awayScoreElement = root.querySelector('.teamAway em');

      const homeScore: number | null = homeScoreElement ? parseInt(homeScoreElement.innerText) : null;
      const awayScore: number | null = awayScoreElement ? parseInt(awayScoreElement.innerText) : null;

      return {
        homeScore,
        awayScore,
      }
    }

    return this.httpService.post(
      'https://www.koreabaseball.com/Game/LiveTextView1.aspx',
      {
        leagueId: 1,
        seriesId: 0,
        gameId: gameId,
        gyear: 2024
      },
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
        },
      },
    ).pipe(
      map(response => {
        return extractScore(response.data);
      })
    )
  }

  getStatus(gameId: string = '20240731SSLG0'): Observable<unknown> {
    const extractStatus = (htmlString: string) => {
      const root = parse(htmlString);
      const statusElement = root.querySelector('span.date');

      const status: string | null = (statusElement.innerText.match(/\[(.*?)\]/) || [])[1] ?? null;

      return {
        status
      }
    }

    return this.httpService.post(
      'https://www.koreabaseball.com/Game/LiveTextView2.aspx',
      {
        leagueId: 1,
        seriesId: 0,
        gameId: gameId,
        gyear: 2024
      },
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
        },
      },
    ).pipe(
      map(response => {
        return extractStatus(response.data);
      })
    )
  }

  /** 
   * 크롤링 관련 로직:
   * Thanks to EvansKJ57
   */
  getSchedules(): Observable<void> {
    const date = new Date();
    const curYear = date.getFullYear();

    return this.httpService.post<IRawScheduleList>(
      'https://www.koreabaseball.com/ws/Schedule.asmx/GetScheduleList',
      {
        leId: 1, // 1 => 1부 | 2 => 퓨쳐스 리그
        srIdList: [0, /*9, 6, 3, 4, 5, 7*/].join(','), // 0 => 프로팀 경기 | 1 => 시범경기 | 3,4,5,7 => 포스트 시즌 | 9 => 올스타전 | 6 => 모름
        seasonId: curYear,
        gameMonth: date.getMonth() + 1,
        teamid: '', //LG => LG | 롯데 => LT | 두산 => OB | KIA => HT | 삼성 => SS | SSG => SK | NC => NC | 키움 => WO | KT => KT | 한화 => HH
      },
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        },
      },
    ).pipe(
      switchMap(response => {
        const convertRowsToArray = response.data.rows.map(row => 
          this.extractTextFromHtml(row.row)
        );
        const refinedGameData: TGameSchedule = this.refineGamesData(convertRowsToArray, curYear);
        
        return from(this.createMany(refinedGameData));
      })
    );
  }

  private async createMany(gameSchedules: TGameSchedule): Promise<void> {
    await this.gameRepository.manager.transaction(async manager => {
      for (const schedule of gameSchedules) {
        // Create or update game entity
        let game = new Game();
        game.id = schedule.id;
        game.date = schedule.date;
        game.time = schedule.time;
        game.status = schedule.status;
        game.home_team_score = schedule.homeScore ?? null;
        game.away_team_score = schedule.awayScore ?? null;
        game.winning_team = schedule.winner ? await this.teamService.findByName(schedule.winner) : null;
  
        // Ensure home_team exists
        game.home_team = await this.teamService.findByName(schedule.homeTeam);
        if (!game.home_team) {
          console.log('홈 팀이 누락되었거나 아직 로드되지 않았습니다:', game, schedule);
          continue; // Skip this schedule
        }
  
        // Ensure away_team exists
        game.away_team = await this.teamService.findByName(schedule.awayTeam);
        if (!game.away_team) {
          console.log('원정 팀이 누락되었거나 아직 로드되지 않았습니다:', game, schedule);
          continue; // Skip this schedule
        }
  
        // Ensure stadium exists
        game.stadium = await this.stadiumService.findByName(schedule.stadium);
        if (!game.stadium) {
          console.log('구장이 누락되었거나 아직 로드되지 않았습니다:', game, schedule);
          continue; // Skip this schedule
        }
  
        // Validate all required fields
        if (!game.date || !game.time || !game.status) {
          console.log('필수 필드가 누락되었거나 잘못되었습니다:', game, schedule);
          continue; // Skip this schedule
        }
  
        try {
          await manager.upsert(Game, game, ['date', 'time', 'stadium']);
        } catch (error) {
          console.error('게임 저장 중 오류 발생:', error);
          throw error; // Rethrow error to trigger rollback
        }
      }
    });
  }
  
  private extractTextFromHtml(data: IRawScheduleList['rows'][number]['row']): string[] {
    return data.map((row) => {
      return row.Text.replace(/<[^>]*>/g, '');
    });
  }

  private refineGamesData(rawData: string[][], year: number): TGameSchedule {
    const groupedData: TGameSchedule = [];
    let currentDate: string = '';

    rawData.forEach((entry) => {
      let date, time, game, review, highlight, channel, empty1, stadium, status;

      // 배열의 길이에 따라 다르게 처리 (날짜가 포함된 배열의 경우 : 길이 9)
      if (entry.length === 9) {
        [
          date,
          time,
          game,
          review,
          highlight,
          channel,
          empty1,
          stadium,
          status,
        ] = entry;
      } else if (entry.length === 8) {
        [
          time,
          game,
          review,
          highlight,
          channel,
          empty1,
          stadium,
          status
        ] = entry;
      } else {
        return; // 예상하지 못한 형식의 데이터는 무시
      }

      //  객체에 날짜 키 추가하기
      if (date && isNotTimeFormat(date)) {
        currentDate = `${year}-${convertDateFormat(date)}`;
      }

      // 해당 날짜에 경기 넣어주기
      if (currentDate) {
        const { homeTeam, awayTeam } = this.getTeamAndScore(game);
        const gameData: IGameData = {
          id: currentDate.replaceAll('-', '') + teamNameToTeamId[homeTeam.name] + teamNameToTeamId[awayTeam.name] + '0', 
          date: currentDate,
          time,
          // game,
          homeTeam: homeTeam.name,
          awayTeam: awayTeam.name,
          stadium,
          status,
        };
        // 종료된 경기는 승자팀과 스코어 할당
        if (review === '리뷰') {
          gameData['winner'] =
            homeTeam.score > awayTeam.score ? homeTeam.name : awayTeam.name;
          gameData['homeScore'] = homeTeam.score;
          gameData['awayScore'] = awayTeam.score;
          gameData['status'] = '경기 종료';
        } else if (review === '프리뷰') {
          gameData['status'] = '경기 전';
        }

        groupedData.push(gameData);
      }
    });

    return groupedData;
  }

  private getTeamAndScore(gameString: string): { [team: string]: ITeamAndScore } {
    const [awayTeamString, homeTeamString] = gameString.split('vs');

    if (!awayTeamString || !homeTeamString) {
      return {};
    }

    const splitScoreAndTeam = (teamString: string, isRightSide: boolean) => {
      const match = isRightSide
        ? teamString.match(/(\d+)(\D+)$/) // 오른쪽 팀(홈팀): 점수가 앞에 오고 이름이 뒤에 오는 경우
        : teamString.match(/^(\D+)(\d+)$/); // 왼쪽 팀(어웨이팀): 이름이 앞에 오고 점수가 뒤에 오는 경우

      if (match) {
        // 정규 표현식이 매칭된 경우 팀 이름과 점수를 반환
        return {
          name: (isRightSide ? match[2].trim() : match[1].trim()) as TTeam,
          score: isRightSide ? parseInt(match[1], 10) : parseInt(match[2], 10),
        };
      }
      // 경기 안했다면 팀이름에 그대로 string 넣고 score null
      return { name: teamString as TTeam, score: null };
    };
    const homeTeam = splitScoreAndTeam(homeTeamString.trim(), true);
    const awayTeam = splitScoreAndTeam(awayTeamString.trim(), false);

    return { homeTeam, awayTeam };
  }
}
