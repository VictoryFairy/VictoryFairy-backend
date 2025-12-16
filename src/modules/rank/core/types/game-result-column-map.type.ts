export const GameResultColumnMap = {
  Win: 'win',
  Lose: 'lose',
  Tie: 'tie',
  'No game': 'cancel',
} as const;

export type GameResultColumnMap =
  (typeof GameResultColumnMap)[keyof typeof GameResultColumnMap];

