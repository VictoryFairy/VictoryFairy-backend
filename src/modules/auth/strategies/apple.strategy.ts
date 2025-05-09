import { Injectable, UnauthorizedException } from '@nestjs/common';
import { SocialProvider, TFlowType } from 'src/modules/auth/const/auth.const';
import { ConfigService } from '@nestjs/config';
import * as jwksClient from 'jwks-rsa';
import * as jwt from 'jsonwebtoken';
import {
  IOAuthStrategy,
  ISocialUserInfo,
  IAppleTokenResponse,
  IAppleDecodedPayload,
} from 'src/modules/auth/strategies/interface/oauth.interface';

@Injectable()
export class AppleOAuthStrategy implements IOAuthStrategy {
  public readonly provider: SocialProvider = SocialProvider.APPLE;
  private readonly authUrl = 'https://appleid.apple.com/auth/authorize';
  private readonly tokenUrl = 'https://appleid.apple.com/auth/token';
  private readonly scope = ['email', 'name'];
  private readonly serviceId: string;
  private readonly teamId: string;
  private readonly keyId: string;
  private readonly privateKey: string;
  private readonly jwksClient: jwksClient.JwksClient;
  constructor(private readonly configService: ConfigService) {
    this.serviceId = this.configService.get<string>('APPLE_SERVICE_ID');
    this.teamId = this.configService.get<string>('APPLE_TEAM_ID');
    this.keyId = this.configService.get<string>('APPLE_KEY_ID');
    this.privateKey = Buffer.from(
      this.configService.get<string>('APPLE_PRIVATE_KEY_BASE64') || '',
      'base64',
    ).toString('utf-8');
    this.jwksClient = jwksClient({
      jwksUri: `https://appleid.apple.com/auth/keys`,
    });
  }

  getCodeAuthUrl(flowType: TFlowType, state: string): string {
    const url = new URL(this.authUrl);
    const callbackUri = this.getCallbackUri(flowType);

    const params = new URLSearchParams({
      client_id: this.serviceId,
      redirect_uri: callbackUri,
      response_type: 'code',
      response_mode: 'form_post',
      scope: this.scope.join(' '),
      state,
    });

    url.search = params.toString();
    return url.href;
  }

  async validateAndGetUserInfo(
    code: string,
    flowType: TFlowType,
  ): Promise<ISocialUserInfo> {
    const tokenData: IAppleTokenResponse = await this.fetchAppleToken(
      code,
      flowType,
    );

    const decoded = jwt.decode(tokenData.id_token, {
      complete: true, // 헤더, 페이로드, 서명 모두 포함하도록 설정
    });
    if (!decoded?.header?.kid) {
      throw new UnauthorizedException('JWT 헤더에 kid 없음');
    }
    const kid = decoded.header.kid;
    const publicKey = await this.getApplePublicKey(kid);

    try {
      const appleData: IAppleDecodedPayload = jwt.verify(
        tokenData.id_token,
        publicKey,
        { algorithms: ['RS256'] },
      ) as IAppleDecodedPayload;
      return { sub: appleData.sub, email: appleData.email };
    } catch (error) {
      throw new UnauthorizedException('Apple 인증 실패');
    }
  }

  private getCallbackUri(flowType: TFlowType): string {
    return new URL(
      `auth/${flowType}/${this.provider}/callback`,
      this.configService.get<string>('BACK_END_URL'),
    ).href;
  }

  private generateClientSecret(): string {
    const now = Math.floor(Date.now() / 1000);
    const fiveMinutes = 2592000;
    const header = {
      alg: 'ES256',
      kid: this.keyId,
    };
    const payload = {
      iss: this.teamId,
      iat: now,
      exp: now + fiveMinutes,
      aud: 'https://appleid.apple.com',
      sub: this.serviceId,
    };

    const token = jwt.sign(payload, this.privateKey, {
      header,
      algorithm: 'ES256',
    });

    return token;
  }

  private async fetchAppleToken(code: string, flowType: TFlowType) {
    const callbackUri = this.getCallbackUri(flowType);
    const clientSecret = this.generateClientSecret();
    const tokenResponse = await fetch(this.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.serviceId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: callbackUri,
      }),
    });
    if (!tokenResponse.ok) {
      throw new UnauthorizedException(`애플 토큰 요청 실패 `);
    }

    const tokenData: IAppleTokenResponse = await tokenResponse.json();

    if (!tokenData.id_token) {
      throw new UnauthorizedException('id_token 발급 실패');
    }

    return tokenData;
  }

  private async getApplePublicKey(kid: string): Promise<string> {
    try {
      const key = await this.jwksClient.getSigningKey(kid);
      const publicKey = key.getPublicKey();
      return publicKey;
    } catch (error) {
      throw new UnauthorizedException('애플 공개 키 가져오기 실패');
    }
  }
}
