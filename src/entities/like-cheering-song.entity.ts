import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';
import { CheeringSong } from './cheering-song.entity';

@Entity()
export class LikeCheeringSong {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user) => user.likeCheeringSongs)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(
    () => CheeringSong,
    (cheeringSong) => cheeringSong.likeCheeringSongs,
  )
  @JoinColumn({ name: 'cheering_song_id' })
  cheeringSong: CheeringSong;
}
