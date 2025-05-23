export const getGameType = (id: string) => {
  if (id.endsWith('1')) {
    return 1;
  } else if (id.endsWith('2')) {
    return 2;
  }
  return 0;
};
