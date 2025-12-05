import { EntityManager } from 'typeorm';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Term } from 'src/modules/term/entities/term.entity';
import { UserTerm } from '../core/domain/user-term.entity';
import { InjectEntityManager } from '@nestjs/typeorm';
import { User } from '../core/domain/user.entity';
import { UserWithTeamDto } from '../dto/internal/user-with-team.dto';
import { UserMeResDto } from '../dto/response/res-user-me.dto';
import { UserMyPageDto } from '../dto/response/res-user-mypage.dto';
import { rankScoreWithDecimal } from 'src/common/utils/calculateRankScore.util';
import { ResOverallOppTeamDto } from 'src/modules/rank/dto/response/res-overall-opp-team.dto';
import { RegisteredGameStatus } from 'src/modules/registered-game/types/registered-game-status.type';

@Injectable()
export class AccountApplicationQueryService {
  constructor(
    @InjectEntityManager()
    private readonly em: EntityManager,
  ) {}

  async getNotAgreedRequiredTermIds(userId: number): Promise<string[]> {
    const notAgreedTerms = await this.em
      .createQueryBuilder(Term, 'term')
      .leftJoin(
        UserTerm,
        'user_term',
        'user_term.term_id = term.id AND user_term.user_id = :userId',
        { userId },
      )
      .where('term.is_required = :isRequired', { isRequired: true })
      .andWhere('user_term.id IS NULL')
      .select('term.id', 'id')
      .getRawMany<{ id: string }>();

    return notAgreedTerms.map((row) => row.id);
  }

  async isExistEmail(email: string): Promise<{
    isExist: boolean;
    initialSignUpType: 'local' | 'social' | null;
  }> {
    const user = await this.em.findOne(User, {
      relations: { local_auth: true },
      where: { email },
      select: { id: true, local_auth: { user_id: true } },
    });
    const isExist = user ? true : false;
    let initialSignUpType: 'local' | 'social' | null = null;

    if (isExist) {
      initialSignUpType = user.local_auth ? 'local' : 'social';
    }

    return { isExist, initialSignUpType };
  }

  async isExistNickname(nickname: string): Promise<boolean> {
    const user = await this.em.findOne(User, {
      where: { nickname },
      select: { id: true },
    });
    const isExist = user ? true : false;
    return isExist;
  }

  async getUserWithSupportTeam(userId: number): Promise<UserWithTeamDto> {
    const user = await this.em.findOne(User, {
      relations: { support_team: true },
      where: { id: userId },
    });
    if (!user) throw new BadRequestException('존재하지 않는 유저입니다.');
    return await UserWithTeamDto.createAndValidate(user);
  }

  /**
   * 유저 마이페이지 정보를 단일 쿼리로 조회
   */
  async getUserMyPageInfo(userId: number): Promise<UserMyPageDto> {
    const { entities, raw } = await this.em
      .createQueryBuilder(User, 'user')
      .leftJoinAndSelect('user.social_auths', 'social_auth')
      .leftJoin(
        (qb) =>
          qb
            .select('r.user_id', 'user_id')
            .addSelect('COALESCE(SUM(r.win), 0)', 'win')
            .addSelect('COALESCE(SUM(r.lose), 0)', 'lose')
            .addSelect('COALESCE(SUM(r.tie), 0)', 'tie')
            .addSelect('COALESCE(SUM(r.cancel), 0)', 'cancel')
            .from('rank', 'r')
            .groupBy('r.user_id'),
        'rank_stat',
        'rank_stat.user_id = user.id',
      )
      .addSelect('rank_stat.win', 'win')
      .addSelect('rank_stat.lose', 'lose')
      .addSelect('rank_stat.tie', 'tie')
      .addSelect('rank_stat.cancel', 'cancel')
      .where('user.id = :userId', { userId })
      .getRawAndEntities();

    const user = entities[0];

    if (!user) {
      throw new NotFoundException('존재하지 않는 유저입니다.');
    }

    const rawData = raw[0] || {};
    const win = parseInt(rawData['win'] || '0', 10);
    const lose = parseInt(rawData['lose'] || '0', 10);
    const tie = parseInt(rawData['tie'] || '0', 10);
    const cancel = parseInt(rawData['cancel'] || '0', 10);
    const total = win + lose + tie + cancel;

    const record = {
      win,
      lose,
      tie,
      cancel,
      total,
      score: Math.floor(rankScoreWithDecimal({ win, lose, tie, cancel })),
    };

    const userMeResDto = new UserMeResDto(user, user.social_auths);
    return new UserMyPageDto(userMeResDto, record);
  }

  async getUserVersusTeamStats(userId: number): Promise<ResOverallOppTeamDto> {
    try {
      const games = await this.em
        .createQueryBuilder()
        .select([
          'game.winning_team_id AS win_id',
          'game.home_team_id AS home_id',
          'game.away_team_id AS away_id',
          'registered_game.status AS status',
          'cheering_team.id AS sup_id',
        ])
        .from('registered_game', 'registered_game')
        .innerJoin('registered_game.game', 'game')
        .innerJoin('registered_game.cheering_team', 'cheering_team')
        .where('registered_game.user_id = :userId', { userId })
        .getRawMany<{
          win_id: number;
          home_id: number;
          away_id: number;
          sup_id: number;
          status: RegisteredGameStatus;
        }>();

      let homeWin = 0;
      let totalWin = 0;
      const oppTeam: Record<string, { total: number; win: number }> = {};

      for (const game of games) {
        const { status, home_id, away_id, sup_id } = game;

        if (status === 'No game') continue;

        const isHomeGame = home_id === sup_id;
        const oppId = isHomeGame ? away_id : home_id;

        if (!oppTeam[oppId]) {
          oppTeam[oppId] = { total: 0, win: 0 };
        }

        oppTeam[oppId].total++;

        if (status === 'Win') {
          totalWin++;
          oppTeam[oppId].win++;

          if (isHomeGame) {
            homeWin++;
          }
        }
      }

      return { totalWin, homeWin, oppTeam };
    } catch (error) {
      throw new InternalServerErrorException(
        '데이터 조회 중 문제가 발생했습니다.',
      );
    }
  }
}
