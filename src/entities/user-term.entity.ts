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
import { User } from './user.entity';
import { Term } from './term.entity';

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
}
