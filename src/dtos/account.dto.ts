import { SocialProvider } from 'src/const/auth.const';

export class CreateUserDto {
  email: string;
  image?: string;
  nickname?: string;
  teamId?: number;
}

export class CreateSocialAuthDto {
  sub: string;
  provider: SocialProvider;
  providerEmail: string;
  userId: number;
  isPrimary: boolean;
}
