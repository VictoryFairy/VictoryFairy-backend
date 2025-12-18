import { RankScoreVo } from '../domain/vo/rank-score.vo';

/** insertRankIfAbsent 메서드 입력 데이터 */
export interface InsertRankInput {
  teamId: number;
  userId: number;
  activeYear: number;
}

/** getRefinedRankDataFromRedis 리턴 타입 */
export interface RefinedRankData {
  rank: number;
  userId: number;
  score: number;
}

/** concatRankDataWithUserProfile 리턴 타입 */
export interface RefinedRankDataWithProfile {
  rank: number;
  score: number;
  nickname: string;
  profileImage: string;
  userId: number;
}

/** aggregateRankStatsByUserId 리턴 타입 */
export type AggregatedRankStats = Record<string | 'total', RankScoreVo>;

