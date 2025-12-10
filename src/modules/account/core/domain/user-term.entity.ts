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
import { Term } from 'src/modules/term/core/domain/term.entity';
import { User } from 'src/modules/account/core/domain/user.entity';
import { InternalServerErrorException } from '@nestjs/common';

@Entity()
@Unique(['user_id', 'term_id'])
export class UserTerm {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  user_id: number;

  @Column()
  term_id: string;

  @CreateDateColumn({ type: 'timestamptz' })
  agreed_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @ManyToOne(() => User, (user) => user.user_terms, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Term, (term) => term.user_terms)
  @JoinColumn({ name: 'term_id' })
  term: Term;

  private constructor() {}

  static create(termId: string): UserTerm {
    if (!termId) {
      throw new InternalServerErrorException('약관 아이디가 없습니다.');
    }
    const userTerm = new UserTerm();
    userTerm.term_id = termId;
    return userTerm;
  }
}
