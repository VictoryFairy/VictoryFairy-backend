import { SocialProvider } from 'src/modules/auth/const/auth.const';
import { User } from '../../../core/domain/user.entity';
import { SocialAuth } from '../../../core/domain/social-auth.entity';

export class UserMeResDto {
  id: number;
  email: string;
  nickname: string;
  image: string;
  provider: SocialProvider[];
  primaryProvider: SocialProvider | null;

  constructor(
    user: Pick<User, 'id' | 'email' | 'nickname' | 'profile_image'>,
    socialAuths: SocialAuth[],
  ) {
    this.id = user.id;
    this.email = user.email;
    this.nickname = user.nickname;
    this.image = user.profile_image;
    this.provider = socialAuths.map((socialAuth) => socialAuth.provider);
    this.primaryProvider =
      socialAuths.find((socialAuth) => socialAuth.is_primary === true)
        ?.provider || null;
  }
}
