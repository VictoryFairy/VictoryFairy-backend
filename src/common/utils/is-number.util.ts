/**
 * Based on is-number #36 PR
 * @link https://github.com/jonschlinkert/is-number/pull/36#issuecomment-1975403116
 */
export const isNumber: TIsNumber = (num: any) => {
  switch (true) {
    case typeof num === 'number':
      return num - num === 0;
    case typeof num === 'string':
      for (let i = 0; i < num.length; i++) {
        if (
          num.charCodeAt(i) !== 32 &&
          num.charCodeAt(i) !== 13 &&
          num.charCodeAt(i) !== 10 &&
          num.charCodeAt(i) !== 9
        ) {
          return Number.isFinite ? Number.isFinite(+num) : isFinite(+num);
        }
      }

      return false;

    default:
      return false;
  }
};

type TIsNumber = (num: any) => boolean;
