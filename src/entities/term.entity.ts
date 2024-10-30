import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserTerm } from './user-term.entity';

export enum TermType {
  SERVICE_TERMS = 'SERVICE_TERMS',
  PRIVACY_POLICY = 'PRIVACY_POLICY',
}

@Entity()
export class Term {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'varchar' })
  type: TermType;

  @Column()
  version: string;

  @Column()
  is_required: boolean;

  @Column()
  is_active: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @OneToMany(() => UserTerm, (userTerm) => userTerm.term)
  users: UserTerm[];
}
