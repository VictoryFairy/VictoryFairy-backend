import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Stadium } from './stadium.entity';

@Entity()
@Unique(['name'])
export class ParkingInfo {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column('double precision')
  latitude: number;

  @Column('double precision')
  longitude: number;

  @Column()
  address: string;

  @Column()
  link: string;

  @ManyToOne(() => Stadium)
  stadium: Stadium;
}
