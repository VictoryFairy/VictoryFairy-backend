import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  Unique,
} from 'typeorm';
import { Team } from '../../team/entities/team.entity';
import { Stadium } from '../../stadium/entities/stadium.entity';
import { RegisteredGame } from '../../registered-game/entities/registered-game.entity';
import { TGameStatus } from 'src/modules/scheduling/crawling-game.type';

@Entity()
@Unique(['date', 'time', 'stadium'])
export class Game {
  @PrimaryColumn()
  id: string;

  @Index()
  @Column('date')
  date: string;

  @Column('time')
  time: string;

  @Column()
  status: string;

  @Column({ nullable: true })
  home_team_score?: number | null;

  @Column({ nullable: true })
  away_team_score?: number | null;

  @ManyToOne(() => Team)
  @JoinColumn({ name: 'home_team_id' })
  home_team: Team;

  @ManyToOne(() => Team)
  @JoinColumn({ name: 'away_team_id' })
  away_team: Team;

  @ManyToOne(() => Team, { nullable: true })
  @JoinColumn({ name: 'winning_team_id' })
  winning_team?: Team | null;

  @ManyToOne(() => Stadium)
  @JoinColumn({ name: 'stadium_id' })
  stadium: Stadium;

  @OneToMany(() => RegisteredGame, (registeredGame) => registeredGame.game)
  registeredGames: RegisteredGame[];

  private constructor() {}

  static create(props: {
    id: string;
    date: string;
    time: string;
    status: TGameStatus;
    homeTeamScore: number | null;
    awayTeamScore: number | null;
    homeTeam: Team;
    awayTeam: Team;
    stadium: Stadium;
  }): Game {
    const game = new Game();
    game.id = props.id;
    game.date = props.date;
    game.time = props.time;
    game.home_team = props.homeTeam;
    game.away_team = props.awayTeam;
    game.stadium = props.stadium;

    game.updateStatus(props.status);
    game.updateScore(props.homeTeamScore, props.awayTeamScore);
    game.determineWinner(); // 승리팀 결정
    game.validateDomain();
    return game;
  }
  public updateFinishedMatch(props: {
    status: string;
    homeScore: number;
    awayScore: number;
  }): void {
    this.updateStatus(props.status);
    this.updateScore(props.homeScore, props.awayScore);
    this.determineWinner();
    this.validateDomain();
  }

  public updateInProgressMatch(props: {
    status: string;
    homeScore: number;
    awayScore: number;
  }): void {
    this.updateStatus(props.status);
    this.updateScore(props.homeScore, props.awayScore);
  }

  public updateScore(homeScore: number, awayScore: number): void {
    this.home_team_score = homeScore;
    this.away_team_score = awayScore;
  }

  public hasMatchingTeams(props: {
    homeTeamId: number;
    awayTeamId: number;
  }): boolean {
    return (
      this.home_team.id === props.homeTeamId &&
      this.away_team.id === props.awayTeamId
    );
  }

  private updateStatus(status: string | null): void {
    if (!status || status === this.status) return;
    this.status = status;
  }

  private determineWinner(): void {
    if (this.status !== '경기종료') {
      return;
    }
    const hasScores =
      this.home_team_score !== null && this.away_team_score !== null;

    // 점수가 둘 다 존재하고, 동점이 아닌 경우
    if (hasScores && this.home_team_score !== this.away_team_score) {
      this.winning_team =
        this.home_team_score! > this.away_team_score!
          ? this.home_team
          : this.away_team;
    } else {
      // 동점이거나, 점수가 아직 없거나, 둘 중 하나만 있는 모든 경우
      this.winning_team = null;
    }
  }

  private validateDomain(): void {
    if (this.home_team.id === this.away_team.id) {
      throw new Error('홈 팀과 원정 팀은 같을 수 없습니다.');
    }
    if (this.status === '경기전' && Boolean(this.winning_team)) {
      throw new Error(
        `경기 전 상태에서는 승리 팀이 반드시 없어야 합니다. ${this.id} ${this.winning_team} `,
      );
    }
    if (
      this.status === '경기종료' &&
      this.home_team_score !== null &&
      this.away_team_score !== null &&
      this.home_team_score !== this.away_team_score &&
      !this.winning_team
    ) {
      throw new Error(
        '경기 종료 상태이고 동점이 아니면 승리 팀이 반드시 존재해야 합니다.',
      );
    }

    if (
      this.status === '경기종료' &&
      this.home_team_score === null &&
      this.away_team_score === null &&
      this.home_team_score === this.away_team_score &&
      this.winning_team
    ) {
      throw new Error(
        '경기 종료 상태이고 동점이면 승리 팀이 반드시 없어야 합니다.',
      );
    }
  }
}
