import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Stadium } from "./stadium.entity";

@Entity()
export class ParkingInfo {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  is_free: boolean;

  @Column()
  latitude: number;

  @Column()
  longitude: number;

  @Column()
  address: string;

  @ManyToOne(type => Stadium)
  stadium: Stadium;
}
