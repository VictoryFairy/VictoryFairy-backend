import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from 'typeorm';
import { User } from './user.entity';

@Entity()
export class LocalAuth {
  @PrimaryColumn()
  user_id: number;

  @Column()
  password: string;

  @OneToOne(() => User, (user) => user.local_auth, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
