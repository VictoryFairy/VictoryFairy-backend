import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { map, Observable } from 'rxjs';
import { IGameSchedule, IGameData, ITeamAndScore, TTeam, IRawScheduleList } from 'src/types/crawling-game.type';
import { isNotTimeFormat, convertDateFormat } from 'src/util/time-format';

@Injectable()
export class GameService {
  constructor(
    private readonly httpService: HttpService,
  ) {}

  /** 
   * 크롤링 관련 로직:
   * @author EvansKJ57
   */
  getGamesSchedule(): Observable<unknown> {
    const date = new Date();
    const curYear = date.getFullYear();
    
    return this.httpService.post<IRawScheduleList>(
      'https://www.koreabaseball.com/ws/Schedule.asmx/GetScheduleList',
      {
        leId: 1, // 1 => 1부 | 2 => 퓨쳐스 리그
        srIdList: [0, 9, 6, 3, 4, 5, 7].join(','), // 0 => 프로팀 경기 | 1 => 시범경기 | 3,4,5,7 => 포스트 시즌 | 9 => 올스타전 | 6 => 모름
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
      map(response => {
        const convertRowsToArray = response.data.rows.map(row => 
          this.extractTextFromHtml(row.row)
        );
        // return convertRowsToArray;
        return this.refineGamesData(convertRowsToArray, curYear);
      })
    );
  }

  extractTextFromHtml(data: IRawScheduleList['rows'][number]['row']): string[] {
    return data.map((row) => {
      return row.Text.replace(/<[^>]*>/g, '');
    });
  }

  refineGamesData(rawData: string[][], year: number): IGameSchedule {
    const groupedData: IGameSchedule = {};
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
        groupedData[currentDate] = [];
      }

      // 해당 날짜에 경기 넣어주기
      if (currentDate) {
        const { homeTeam, awayTeam } = this.getTeamAndScore(game);
        const gameData: IGameData = {
          date,
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
            homeTeam.score > awayTeam.score ? 'home' : 'away';
          gameData['homeScore'] = homeTeam.score;
          gameData['awayScore'] = awayTeam.score;
          gameData['status'] = '경기 종료';
        } else if (review === '프리뷰') {
          gameData['status'] = '경기 전';
        }

        groupedData[currentDate].push(gameData);
      }
    });

    return groupedData;
  }

  getTeamAndScore(gameString: string): { [team: string]: ITeamAndScore } {
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
