import { Term } from 'src/entities/term.entity';

export type CachedTermList = {
  required: Pick<Term, 'id'>[];
  optional: Pick<Term, 'id'>[];
};
