import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

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
  updated_date: Date;
}
