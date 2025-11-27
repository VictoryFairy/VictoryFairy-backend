export class RankScoreVo {
  private static readonly BASE_SCORE = 1000;
  private static readonly SCORE_MULTIPLIER = 10;
  private static readonly SCALE_FACTOR = 10000;
  private readonly win: number;
  private readonly lose: number;
  private readonly tie: number;
  private readonly cancel: number;

  private constructor(win: number, lose: number, tie: number, cancel: number) {
    this.win = win || 0;
    this.lose = lose || 0;
    this.tie = tie || 0;
    this.cancel = cancel || 0;
  }

  static from(stats: {
    win: number;
    lose: number;
    tie: number;
    cancel: number;
  }) {
    return new RankScoreVo(stats.win, stats.lose, stats.tie, stats.cancel);
  }

  static toDisplayScore(storedScore: number | string): number {
    const scoreNum =
      typeof storedScore === 'string' ? parseInt(storedScore, 10) : storedScore;
    return Math.floor(scoreNum / this.SCALE_FACTOR);
  }

  add(...others: RankScoreVo[]): RankScoreVo {
    let [newWin, newLose, newTie, newCancel] = [
      this.win,
      this.lose,
      this.tie,
      this.cancel,
    ];

    for (const other of others) {
      newWin += other.win;
      newLose += other.lose;
      newTie += other.tie;
      newCancel += other.cancel;
    }

    return new RankScoreVo(newWin, newLose, newTie, newCancel);
  }

  getIntegerScoreForRedis(): number {
    const rawScore =
      RankScoreVo.BASE_SCORE +
      (this.win - this.lose) * RankScoreVo.SCORE_MULTIPLIER;

    const scaledScore = rawScore * RankScoreVo.SCALE_FACTOR;

    const totalGames = this.getTotalCount();

    return scaledScore + totalGames;
  }

  getTotalCount() {
    return this.win + this.lose + this.tie + this.cancel;
  }

  getWinCount() {
    return this.win;
  }
}
