import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Stadium {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  full_name: string;

  @Column()
  latitude: number;

  @Column()
  longitude: number;
}
