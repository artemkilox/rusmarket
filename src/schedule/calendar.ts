export type CalendarMode = 'week' | 'month';

const months = [
  'январь', 'февраль', 'март', 'апрель', 'май', 'июнь',
  'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь',
];
const shortMonths = [
  'янв.', 'февр.', 'мар.', 'апр.', 'мая', 'июн.',
  'июл.', 'авг.', 'сент.', 'окт.', 'нояб.', 'дек.',
];

export function utcDate(date: string) {
  return new Date(`${date}T00:00:00Z`);
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function addDays(date: string, days: number) {
  const result = utcDate(date);
  result.setUTCDate(result.getUTCDate() + days);
  return dateKey(result);
}

export function getPeriod(anchor: string, mode: CalendarMode) {
  const date = utcDate(anchor);
  const monthStart = `${anchor.slice(0, 7)}-01`;
  const from = mode === 'week' ? addDays(anchor, -((date.getUTCDay() + 6) % 7)) : monthStart;
  const days = mode === 'week' ? 7 : new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  return {
    from,
    to: addDays(from, days - 1),
    dates: Array.from({ length: days }, (_, index) => addDays(from, index)),
  };
}

export function movePeriod(anchor: string, mode: CalendarMode, direction: -1 | 1) {
  if (mode === 'week') return addDays(anchor, 7 * direction);
  const date = utcDate(anchor);
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + direction);
  return dateKey(date);
}

export function formatPeriodLabel(from: string, to: string, mode: CalendarMode) {
  const [startYear, startMonth, startDay] = from.split('-').map(Number);
  const [endYear, endMonth, endDay] = to.split('-').map(Number);
  if (mode === 'month') return `${months[startMonth - 1]} ${startYear}`;

  const end = `${endDay} ${shortMonths[endMonth - 1]} ${endYear}`;
  if (startYear !== endYear) return `${startDay} ${shortMonths[startMonth - 1]} ${startYear} – ${end}`;
  if (startMonth !== endMonth) return `${startDay} ${shortMonths[startMonth - 1]} – ${end}`;
  return `${startDay}–${end}`;
}
