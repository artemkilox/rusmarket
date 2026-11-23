import { CirclePlus } from 'lucide-react';
import { type DragEvent } from 'react';
import { utcDate, type CalendarMode } from '../schedule/calendar';
import { cellKey, getDropEffect, shiftMinutes, type Cell, type Employee, type Shift } from '../schedule/types';
import { Avatar } from './assets';

const weekday = new Intl.DateTimeFormat('ru', { weekday: 'short', timeZone: 'UTC' });
export const dayLabel = new Intl.DateTimeFormat('ru', { day: 'numeric', month: 'long', timeZone: 'UTC' });
const hours = new Intl.NumberFormat('ru', { maximumFractionDigits: 2 });

interface GridProps {
  mode: CalendarMode;
  dates: string[];
  today: string;
  employees: Employee[];
  shifts: ReadonlyMap<string, Shift>;
  selected: ReadonlyMap<string, Cell>;
  disabled: boolean;
  onSelect: (cell: Cell, range: boolean) => void;
  onDate: (date: string) => void;
  onShiftDrag: (event: DragEvent, cell: Cell) => void;
  onDrop: (event: DragEvent, cell: Cell) => void;
}

function acceptDrag(event: DragEvent, occupied: boolean, disabled: boolean) {
  const effect = getDropEffect(event.dataTransfer.types, occupied, disabled);
  if (!effect) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = effect;
}

export function ScheduleGrid(props: GridProps) {
  const { mode, dates, today, employees, shifts, selected, disabled } = props;
  const totals = new Map<number, number>();
  const coverage = new Map<string, number>();
  for (const shift of shifts.values()) {
    totals.set(shift.employeeId, (totals.get(shift.employeeId) ?? 0) + shiftMinutes(shift));
    coverage.set(shift.date, (coverage.get(shift.date) ?? 0) + 1);
  }

  return <div className="grid-scroll" tabIndex={0} aria-label="Таблица графика смен">
    <table className={`schedule-grid ${mode}`}>
      <thead>
        <tr>
          <th scope="col" className="employee-column">Сотрудник</th>
          {dates.map((date) => <th key={date} scope="col">
            <button className="date-heading" disabled={disabled} aria-current={date === today ? 'date' : undefined}
              aria-label={`Быстрое назначение на ${dayLabel.format(utcDate(date))}`}
              onClick={() => props.onDate(date)}>
              <span>{weekday.format(utcDate(date))}</span> <strong>{Number(date.slice(-2))}</strong>
            </button>
          </th>)}
        </tr>
      </thead>
      <tbody>
        {employees.map((employee) => <tr key={employee.id}>
          <th scope="row" className="employee-column">
            <div className="employee">
              <Avatar id={employee.id} name={employee.name} />
              <span><strong>{employee.name}</strong>
                <small>{employee.role} · {hours.format((totals.get(employee.id) ?? 0) / 60)} ч</small>
              </span>
            </div>
          </th>
          {dates.map((date) => {
            const cell = { employeeId: employee.id, date };
            const key = cellKey(cell);
            const shift = shifts.get(key);
            const active = selected.has(key);
            return <td key={date} className={active ? 'selected-cell' : undefined}>
              <button type="button" className={`shift-cell ${shift ? 'occupied' : 'empty'}`}
                data-tone={shift?.templateId ?? (shift ? 'custom' : undefined)}
                disabled={disabled} aria-pressed={active}
                title={shift ? `${shift.startTime}–${shift.endTime}` : undefined}
                aria-label={`${employee.name}, ${dayLabel.format(utcDate(date))}, ${shift ? `${shift.startTime}–${shift.endTime}` : 'смена не назначена'}`}
                draggable={!!shift && !disabled}
                onClick={(event) => props.onSelect(cell, event.shiftKey)}
                onDragStart={(event) => props.onShiftDrag(event, cell)}
                onDragEnter={(event) => acceptDrag(event, !!shift, disabled)}
                onDragOver={(event) => acceptDrag(event, !!shift, disabled)}
                onDrop={(event) => props.onDrop(event, cell)}>
                {shift
                  ? <><span className="shift-time">{shift.startTime}–{shift.endTime}</span><small>{hours.format(shiftMinutes(shift) / 60)} ч</small></>
                  : <CirclePlus size={20} className="cell-plus" aria-hidden="true" />}
              </button>
            </td>;
          })}
        </tr>)}
      </tbody>
      <tfoot>
        <tr><th scope="row" className="employee-column">Покрытие</th>
          {dates.map((date) => {
            const count = coverage.get(date) ?? 0;
            return <td key={date} className={count ? 'covered' : undefined}>{count}</td>;
          })}
        </tr>
      </tfoot>
    </table>
  </div>;
}
