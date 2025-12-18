import { User } from 'src/modules/account/core/domain/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import * as bcrypt from 'bcrypt';
import { HASH_ROUND } from 'src/modules/account/core/const/user.const';

@Entity()
export class LocalAuth {
  @PrimaryColumn()
  user_id: number;

  @Column()
  password: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @OneToOne(() => User, (user) => user.local_auth, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  private constructor() {}

  static async create(password: string): Promise<LocalAuth> {
    const hashedPassword = await this.hashPassword(password);

    const localAuth = new LocalAuth();
    localAuth.password = hashedPassword;
    return localAuth;
  }

  static async hashPassword(password: string): Promise<string> {
    const hashedPassword = await bcrypt.hash(password, HASH_ROUND);
    return hashedPassword;
  }

  async changePassword(newPassword: string) {
    this.password = await LocalAuth.hashPassword(newPassword);
  }

  async validatePassword(inputPassword: string): Promise<boolean> {
    return bcrypt.compare(inputPassword, this.password);
  }
}
