export interface IDotenv {
  NODE_ENV: string;
  BACK_END_URL: string;
  FRONT_END_URL: string;
  WHITE_LIST_URL: string;
  TZ: string;

  DB_CONTAINER_NAME: string;
  DB_DATABASE_NAME: string;
  DB_TCP_PORT: number;
  DB_MAX_CONNECTIONS: number;

  DB_USER: string;
  DB_PASSWORD: string;

  JWT_ACCESS_SECRET: string;
  JWT_REFRESH_SECRET: string;
  ACCESS_EXPIRE_TIME: string;
  REFRESH_EXPIRE_TIME: string;

  REDIS_CONTAINER: string;
  REDIS_TCP_PORT: number;
  REDIS_PASSWORD: string;

  MAIL_PW: string;
  MAIL_FROM: string;

  AWS_S3_ACCESS_KEY_ID: string;
  AWS_S3_SECRET_ACCESS_KEY: string;
  AWS_S3_REGION: string;
  AWS_S3_BUCKET_NAME: string;

  AWS_SES_ACCESS_KEY: string;
  AWS_SES_SECRET_ACCESS_KEY: string;
  AWS_SES_FROM_ADDRESS: string;

  SWAGGER_USER: string;
  SWAGGER_PW: string;

  SERIES_ID: number;

  SLACK_WEBHOOK_URL: string;
  DISCORD_REPORT_WEBHOOK: string;

  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  KAKAO_CLIENT_ID: string;
  KAKAO_CLIENT_SECRET: string;

  APPLE_SERVICE_ID: string;
  APPLE_TEAM_ID: string;
  APPLE_KEY_ID: string;
  APPLE_PRIVATE_KEY_BASE64: string;

  SENTRY_DSN: string;
}
