export const getNextMonth = (
  year: number,
  month: number,
): { nextYear: number; nextMonth: number } => {
  let nextMonth = month + 1;
  let nextYear = year;

  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear += 1;
  }

  return {
    nextYear,
    nextMonth,
  };
};
