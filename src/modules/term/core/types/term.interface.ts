import { Term } from 'src/modules/term/core/domain/term.entity';

/** 캐싱된 약관 목록 */
export interface CachedTermList {
  required: Pick<Term, 'id'>[];
  optional: Pick<Term, 'id'>[];
}

/** getRequiredTermIds 메서드 반환 타입 */
export interface GetRequiredTermIdsResult {
  requiredTermIds: string[];
}
