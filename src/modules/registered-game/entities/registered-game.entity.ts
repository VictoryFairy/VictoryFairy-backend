import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Team } from '../../team/entities/team.entity';
import { RegisteredGameStatus } from 'src/modules/registered-game/types/registered-game-status.type';
import { Game } from '../../game/entities/game.entity';
import { User } from 'src/modules/account/core/domain/user.entity';

@Entity()
@Unique(['game', 'user'])
export class RegisteredGame {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  image?: string;

  @Column()
  seat: string;

  @Column('text')
  review: string;

  @Column({ nullable: true })
  status?: RegisteredGameStatus;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @ManyToOne(() => Game, (game) => game.registeredGames)
  @JoinColumn({ name: 'game_id' })
  game: Game;

  @ManyToOne(() => User, (user) => user.registeredGames, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Team, (cheering_team) => cheering_team.registeredGames)
  @JoinColumn({ name: 'cheering_team_id' })
  cheering_team: Team;

  private constructor() {}

  static create(props: {
    image: string | null;
    seat: string;
    review: string;
    userId: number;
    cheeringTeamId: number;
    gameMetaData: {
      gameId: string;
      homeTeamId: number;
      awayTeamId: number;
    };
  }) {
    const { gameId, homeTeamId, awayTeamId } = props.gameMetaData;

    const registeredGame = new RegisteredGame();
    registeredGame.image = props.image;
    registeredGame.seat = props.seat;
    registeredGame.review = props.review;

    registeredGame.game = { id: gameId } as Game;
    registeredGame.user = { id: props.userId } as User;
    registeredGame.cheering_team = { id: props.cheeringTeamId } as Team;

    registeredGame.validateDomain();
    registeredGame.validateCheeringTeam({ homeTeamId, awayTeamId });
    return registeredGame;
  }

  updateReviewAndSeat(review: string, seat: string) {
    if (this.review === review && this.seat === seat) {
      return;
    }
    this.review = review;
    this.seat = seat;
  }

  updateImage(image: string): void {
    if (this.image === image) {
      return;
    }
    this.image = image;
  }

  updateCheeringTeam(data: {
    cheeringTeamId: number;
    homeTeamId: number;
    awayTeamId: number;
  }) {
    const { cheeringTeamId, homeTeamId, awayTeamId } = data;
    if (this.cheering_team.id === data.cheeringTeamId) {
      return;
    }
    const previousCheeringTeamId = this.cheering_team.id;
    if (previousCheeringTeamId !== cheeringTeamId) {
      this.cheering_team = { id: cheeringTeamId } as Team;
      this.validateCheeringTeam({ homeTeamId, awayTeamId });
      this.changeStatusWhenCheeringTeamChanged();
    }
  }

  changeStatusWhenCheeringTeamChanged() {
    if (this.status === 'Win') {
      this.status = 'Lose';
    } else if (this.status === 'Lose') {
      this.status = 'Win';
    }
  }

  determineStatus(status: string, winnerTeamId: number | null) {
    if (
      /.*취소$/.test(status) ||
      status === '그라운드사정' ||
      status === '기타'
    ) {
      this.status = 'No game';
      return;
    }
    if (status === '경기종료') {
      if (!winnerTeamId) {
        this.status = 'Tie';
      }
      this.status = winnerTeamId === this.cheering_team.id ? 'Win' : 'Lose';
      return;
    }
    // 경기 중인 경우
    this.status = null;
    return;
  }

  private validateDomain() {
    if (!this.user) {
      throw new Error('User is required');
    }
    if (!this.game) {
      throw new Error('Game is required');
    }
    if (!this.cheering_team.id) {
      throw new Error('Cheering team id is required');
    }
    if (!this.seat) {
      throw new Error('Seat is required');
    }
    if (!this.review) {
      throw new Error('Review is required');
    }
  }

  private validateCheeringTeam(gameData: {
    homeTeamId: number;
    awayTeamId: number;
  }) {
    if (
      this.cheering_team.id !== gameData.homeTeamId &&
      this.cheering_team.id !== gameData.awayTeamId
    ) {
      throw new Error('Cheering team is not the home or away team of the game');
    }
  }
}
