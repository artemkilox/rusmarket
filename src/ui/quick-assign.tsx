import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { utcDate } from '../schedule/calendar';
import type { Employee, ShiftTemplate } from '../schedule/types';
import { dayLabel } from './schedule-grid';

interface Props {
  date: string;
  employees: Employee[];
  templates: ShiftTemplate[];
  onApply: (employeeIds: number[], template: ShiftTemplate) => void;
  onClose: () => void;
}

export function QuickAssign({ date, employees, templates, onApply, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [checked, setChecked] = useState<number[]>([]);
  const [templateId, setTemplate] = useState(templates[0]?.id ?? '');
  const template = templates.find(({ id }) => id === templateId);
  useEffect(() => { dialog.current?.showModal(); }, []);

  return <dialog ref={dialog} className="quick-dialog" aria-labelledby="quick-title" onClose={onClose}>
    <form onSubmit={(event) => {
      event.preventDefault();
      if (template && checked.length) onApply(checked, template);
    }}>
      <div className="dialog-heading">
        <h2 id="quick-title">Смены на {dayLabel.format(utcDate(date))}</h2>
        <button className="icon-button" aria-label="Закрыть" type="button" onClick={() => dialog.current?.close()}><X size={20} /></button>
      </div>
      <fieldset><legend>Сотрудники</legend>
        {employees.map(({ id, name }) => <label key={id} className="check-row">
          <input type="checkbox" checked={checked.includes(id)} onChange={(event) => setChecked(
            event.target.checked ? [...checked, id] : checked.filter((employeeId) => employeeId !== id),
          )} /> {name}
        </label>)}
      </fieldset>
      <label className="dialog-template">Шаблон смены
        <select value={templateId} onChange={(event) => setTemplate(event.target.value)}>
          {templates.map(({ id, name, startTime, endTime }) => <option key={id} value={id}>{name} · {startTime}–{endTime}</option>)}
        </select>
      </label>
      <button className="button primary" disabled={!checked.length || !template}>Поставить смену</button>
    </form>
  </dialog>;
}
