import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { User } from './user.entity';
import { RegisteredGame } from './registered-game.entity';

@Entity()
export class CheeringSong {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column('longtext')
  lyric: string;

  @Column()
  link: string;
}
