import { Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../../account/core/domain/user.entity';
import { CheeringSong } from './cheering-song.entity';

@Entity()
export class LikeCheeringSong {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user) => user.likeCheeringSongs, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(
    () => CheeringSong,
    (cheeringSong) => cheeringSong.likeCheeringSongs,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'cheering_song_id' })
  cheeringSong: CheeringSong;
}
