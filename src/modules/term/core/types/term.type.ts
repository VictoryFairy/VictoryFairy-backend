import { Term } from 'src/modules/term/entities/term.entity';

export type CachedTermList = {
  required: Pick<Term, 'id'>[];
  optional: Pick<Term, 'id'>[];
};
