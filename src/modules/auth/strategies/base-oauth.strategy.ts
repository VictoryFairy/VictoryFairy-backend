import { SocialProvider, TFlowType } from 'src/modules/auth/const/auth.const';
import { IOAuthStrategy, ISocialUserInfo } from 'src/modules/auth/types/auth.type';
import { ConfigService } from '@nestjs/config';

export abstract class BaseOAuthStrategy implements IOAuthStrategy {
  protected clientId: string;
  protected clientSecret: string;

  constructor(
    public readonly provider: SocialProvider,
    protected configService: ConfigService,
    protected authUrl: string,
    protected tokenUrl: string,
    protected userInfoUrl: string,
    public readonly scope: string[],
  ) {
    this.clientId = this.configService.get<string>(
      `${provider.toUpperCase()}_CLIENT_ID`,
    );
    this.clientSecret = this.configService.get<string>(
      `${provider.toUpperCase()}_CLIENT_SECRET`,
    );
    this.scope = scope;
  }

  abstract validateAndGetUserInfo(
    code: string,
    flowType: TFlowType,
  ): Promise<ISocialUserInfo>;

  abstract getCodeAuthUrl(flowType: TFlowType, state: string): string;
}
