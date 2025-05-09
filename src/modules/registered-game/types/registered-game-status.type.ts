export const RegisteredGameStatus = {
  Win: 'Win',
  Lose: 'Lose',
  Tie: 'Tie',
  NoGame: 'No game',
} as const;

export type RegisteredGameStatus =
  (typeof RegisteredGameStatus)[keyof typeof RegisteredGameStatus];
