import { Column, Entity, ManyToOne, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { Team } from "./team.entity";
import { Stadium } from "./stadium.entity";

@Entity()
export class Game {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('date')
  date: string;

  @Column('time')
  time: string;

  @Column()
  status: string;

  @Column()
  home_team_score: number;

  @Column()
  away_team_score: number;

  @ManyToOne(type => Team)
  home_team: Team;

  @ManyToOne(type => Team)
  away_team: Team;

  @ManyToOne(type => Team)
  winning_team: Team;

  @OneToOne(type => Stadium)
  stadium: Stadium;
}