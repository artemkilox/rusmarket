import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatPeriodLabel, getPeriod, movePeriod } from '../src/schedule/calendar';
import { applyChanges, cellKey, getDropEffect, shiftDragType, shiftMinutes, templateDragType, type ShiftValue } from '../src/schedule/types';

const night: ShiftValue = { templateId: null, startTime: '22:30', endTime: '06:00' };

test('неделя начинается в понедельник и корректно пересекает год', () => {
  const period = getPeriod('2027-01-01', 'week');
  assert.equal(period.from, '2026-12-28');
  assert.equal(period.to, '2027-01-03');
  assert.equal(period.dates.length, 7);
});

test('переход с 31-го числа открывает следующий месяц, включая високосный февраль', () => {
  const next = movePeriod('2028-01-31', 'month', 1);
  assert.equal(next, '2028-02-01');
  const february = getPeriod(next, 'month');
  assert.equal(february.dates.length, 29);
  assert.equal(february.to, '2028-02-29');
});

test('подпись периода выделяет границы месяца и года обычными пробелами', () => {
  assert.equal(formatPeriodLabel('2026-11-23', '2026-11-29', 'week'), '23–29 нояб. 2026');
  assert.equal(formatPeriodLabel('2026-11-30', '2026-12-06', 'week'), '30 нояб. – 6 дек. 2026');
  assert.equal(formatPeriodLabel('2026-12-28', '2027-01-03', 'week'), '28 дек. 2026 – 3 янв. 2027');
  assert.equal(formatPeriodLabel('2028-02-01', '2028-02-29', 'month'), 'февраль 2028');
});

test('перенос убирает исходную смену и добавляет её в целевую ячейку', () => {
  const source = { employeeId: 1, date: '2026-11-23' };
  const target = { employeeId: 2, date: '2026-11-24' };
  const original = [{ ...source, ...night }];
  const shifts = applyChanges(original, [{ ...source, shift: null }, { ...target, shift: night }]);
  assert.equal(shifts.has(cellKey(source)), false);
  assert.deepEqual(shifts.get(cellKey(target)), { ...target, ...night });
  assert.equal(original.length, 1);
  assert.equal(shiftMinutes(night), 450);
});

test('шаблон копируется в ячейку, а назначенная смена переносится только в пустую', () => {
  assert.equal(getDropEffect([templateDragType], true, false), 'copy');
  assert.equal(getDropEffect([shiftDragType], false, false), 'move');
  assert.equal(getDropEffect([shiftDragType], true, false), undefined);
  assert.equal(getDropEffect([templateDragType], false, true), undefined);
  assert.equal(getDropEffect(['text/plain'], false, false), undefined);
});
