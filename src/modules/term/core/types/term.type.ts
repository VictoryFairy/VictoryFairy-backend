import { Term } from 'src/modules/term/core/domain/term.entity';

export type CachedTermList = {
  required: Pick<Term, 'id'>[];
  optional: Pick<Term, 'id'>[];
};
