export interface IJwtPayload {
  id: number;
  email: string;
  type: 'ac' | 'rf';
}

export type SocialFlowType = 'login' | 'link';
