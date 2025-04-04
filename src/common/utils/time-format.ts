import * as moment from 'moment';

const TIME_FORMAT = 'HH:mm';

export const isNotTimeFormat = (value: string): boolean => {
  return !moment(value, TIME_FORMAT, true).isValid();
};

export const convertDateFormat = (value: string) => {
  const regex = /(\d{2})\.(\d{2})/;
  const matches = value.match(regex);

  if (matches) {
    return `${matches[1]}-${matches[2]}`;
  }
};
