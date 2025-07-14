const DEFAULT_SCORE = 1000;
const SCORE_MULTIPLIER = 10;

export const rankScoreWithDecimal = ({
  win = 0,
  lose = 0,
  tie = 0,
  cancel = 0,
}: {
  win?: number;
  lose?: number;
  tie?: number;
  cancel?: number;
}): number => {
  const score =
    DEFAULT_SCORE +
    (win - lose) * SCORE_MULTIPLIER +
    (win + lose + tie + cancel) / 1000;
  return score;
};
