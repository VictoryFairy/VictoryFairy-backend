import { User } from 'src/modules/account/core/domain/user.entity';

export interface AggregatedRecordRaw {
  win: string;
  lose: string;
  tie: string;
  cancel: string;
  total: string;
  user_id: number;
  id?: number;
  nickname?: string;
  profile_image?: string;
  email?: string;
}

export class AggregateRecordDto {
  win: number;
  lose: number;
  tie: number;
  cancel: number;
  total: number;

  constructor(data: AggregatedRecordRaw) {
    this.win = Number(data.win);
    this.lose = Number(data.lose);
    this.tie = Number(data.tie);
    this.cancel = Number(data.cancel);
    this.total = Number(data.total);
  }
}

export class AggregateRecordWithUserDto extends AggregateRecordDto {
  user: Pick<User, 'id' | 'email' | 'nickname' | 'profile_image'>;

  constructor(data: AggregatedRecordRaw) {
    super(data);
    this.user = {
      id: data.id,
      email: data.email,
      nickname: data.nickname,
      profile_image: data.profile_image,
    };
  }
}
