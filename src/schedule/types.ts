export type Employee = { id: number; name: string; role: string };
export type ShiftTemplate = { id: string; name: string; startTime: string; endTime: string };
export type Cell = { employeeId: number; date: string };
export type ShiftValue = { templateId: string | null; startTime: string; endTime: string };
export type Shift = Cell & ShiftValue;
export type Change = Cell & { shift: ShiftValue | null };
export type Schedule = {
  revision: number;
  publishedRevision: number | null;
  employees: Employee[];
  templates: ShiftTemplate[];
  shifts: Shift[];
};

export const shiftDragType = 'application/x-rusmarket-shift';
export const templateDragType = 'application/x-rusmarket-template';

export function getDropEffect(types: readonly string[], occupied: boolean, disabled: boolean) {
  if (disabled) return;
  if (types.includes(templateDragType)) return 'copy';
  if (!occupied && types.includes(shiftDragType)) return 'move';
}

export function shiftMinutes({ startTime, endTime }: ShiftValue) {
  const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
  return (minutes(endTime) - minutes(startTime) + 1440) % 1440;
}

export function cellKey(cell: Cell) {
  return `${cell.employeeId}/${cell.date}`;
}

export function applyChanges(shifts: Shift[], changes: Iterable<Change>) {
  const result = new Map(shifts.map((shift) => [cellKey(shift), shift]));
  for (const { employeeId, date, shift } of changes) {
    const cell = { employeeId, date };
    if (shift) result.set(cellKey(cell), { ...cell, ...shift });
    else result.delete(cellKey(cell));
  }
  return result;
}
