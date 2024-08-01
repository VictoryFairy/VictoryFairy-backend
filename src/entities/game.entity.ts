import { Column, Entity, JoinColumn, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn, Unique } from "typeorm";
import { Team } from "./team.entity";
import { Stadium } from "./stadium.entity";

@Entity()
@Unique(['date', 'time', 'stadium'])
export class Game {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('date')
  date: string;

  @Column('time')
  time: string;

  @Column()
  status: string;

  @Column({ nullable: true })
  home_team_score?: number | null;

  @Column({ nullable: true })
  away_team_score?: number | null;

  @ManyToOne(type => Team)
  @JoinColumn({ name: 'home_team_id' })
  home_team: Team;

  @ManyToOne(type => Team)
  @JoinColumn({ name: 'away_team_id' })
  away_team: Team;

  @ManyToOne(type => Team, { nullable: true })
  @JoinColumn({ name: 'winning_team_id' })
  winning_team?: Team | null;
  
  @ManyToOne(type => Stadium)
  @JoinColumn({ name: 'stadium_id' })
  stadium: Stadium;
}
