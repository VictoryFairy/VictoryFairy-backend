export const createRandomCode = (length: number): string => {
  const len = Math.pow(10, length);
  const number = Math.floor(Math.random() * len);
  return number.toString().padStart(length, '0');
};
