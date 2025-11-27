import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { BadRequestException } from '@nestjs/common';
import { GameResultColumnMap } from '../types/game-result-column-map.type';
import { User } from 'src/modules/account/core/domain/user.entity';

@Entity()
@Unique(['team_id', 'user', 'active_year'])
export class Rank {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user) => user.id, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  team_id: number;

  @Column({ default: 0 })
  win: number;

  @Column({ default: 0 })
  lose: number;

  @Column({ default: 0 })
  tie: number;

  @Column({ default: 0 })
  cancel: number;

  @Column()
  active_year: number;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  private constructor() {}

  static create(props: {
    teamId: number;
    userId: number;
    activeYear: number;
    records?: {
      win: number;
      lose: number;
      tie: number;
      cancel: number;
    };
  }): Rank {
    const { teamId, userId, activeYear, records } = props;
    const rank = new Rank();
    rank.team_id = teamId;
    rank.user = { id: userId } as User;
    rank.active_year = activeYear;

    rank.validateDomain();

    rank.win = records?.win || 0;
    rank.lose = records?.lose || 0;
    rank.tie = records?.tie || 0;
    rank.cancel = records?.cancel || 0;
    return rank;
  }

  public adjustRecord(column: GameResultColumnMap, isAdd: boolean) {
    const amount = isAdd ? 1 : -1;
    if (!isAdd && this[column] === 0) {
      throw new BadRequestException('유효하지 않은 요청입니다.');
    }
    this[column] += amount;
  }

  public getTotalCount() {
    return this.win + this.lose + this.tie + this.cancel;
  }

  public getScore(withDecimal: boolean = false): number {
    if (withDecimal) {
      return (this.win - this.lose) * 10 + this.getTotalCount() / 1000;
    }
    return (this.win - this.lose) * 10;
  }

  private validateDomain() {
    if (!this.team_id || this.team_id === 0 || this.team_id > 10) {
      throw new BadRequestException('유효하지 않은 팀 ID입니다.');
    }
    if (!this.user || this.user.id === 0) {
      throw new BadRequestException('유효하지 않은 유저 ID입니다.');
    }
    if (!this.active_year || this.active_year === 0) {
      throw new BadRequestException('유효하지 않은 활성 연도입니다.');
    }
  }
}
