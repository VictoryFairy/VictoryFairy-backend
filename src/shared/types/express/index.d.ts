import { Request } from 'express';
import { ISocialUserInfo, SocialFlowType } from '../../../modules/auth/types/auth.type';

declare module 'express' {
  interface Request {
    extractedIp: string;
    userAgent: string;
    socialAuthError?: boolean;
    flowType?: SocialFlowType;
    pid?: string;
    socialUserInfo?: ISocialUserInfo;
  }
}
