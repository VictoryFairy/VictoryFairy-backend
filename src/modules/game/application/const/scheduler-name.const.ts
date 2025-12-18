export const SCHEDULER_NAME = {
  CRAWLING_JOB_1AM: 'crawling-job-1am',
  GAME_TRIGGER: 'game-trigger',
  UPDATE_GAME_SCORE: 'update-game-score',
} as const;

export type SCHEDULER_NAME =
  (typeof SCHEDULER_NAME)[keyof typeof SCHEDULER_NAME];
