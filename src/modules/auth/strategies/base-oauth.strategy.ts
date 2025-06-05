import { SocialProvider, TFlowType } from 'src/modules/auth/const/auth.const';
import {
  IOAuthStrategy,
  ISocialUserInfo,
} from 'src/modules/auth/strategies/interface/oauth.interface';
import { ConfigService } from '@nestjs/config';
import { IDotenv } from 'src/core/config/dotenv.interface';

export abstract class BaseOAuthStrategy implements IOAuthStrategy {
  protected clientId: string;
  protected clientSecret: string;

  constructor(
    public readonly provider: SocialProvider,
    protected configService: ConfigService<IDotenv>,
    protected authUrl: string,
    protected tokenUrl: string,
    protected userInfoUrl: string,
    public readonly scope: string[],
  ) {
    this.clientId = this.configService.get<string>(
      `${provider.toUpperCase()}_CLIENT_ID`,
      { infer: true },
    );
    this.clientSecret = this.configService.get<string>(
      `${provider.toUpperCase()}_CLIENT_SECRET`,
      { infer: true },
    );
    this.scope = scope;
  }

  abstract validateAndGetUserInfo(
    code: string,
    flowType: TFlowType,
  ): Promise<ISocialUserInfo>;

  abstract getCodeAuthUrl(flowType: TFlowType, state: string): string;
}
