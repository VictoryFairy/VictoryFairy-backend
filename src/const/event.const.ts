export const EventName = {
  REDIS_CONNECT: 'redis-connected',
  CACHED_USERS: 'user-warmed',
} as const;

export type EventName = (typeof EventName)[keyof typeof EventName];
