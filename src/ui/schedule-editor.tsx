'use client';

import { ChevronLeft, ChevronRight, CircleHelp, Table2, Trash2, X } from 'lucide-react';
import { useRef, useState, type DragEvent } from 'react';
import { getPeriod, movePeriod, utcDate, type CalendarMode } from '../schedule/calendar';
import { cellKey, shiftMinutes, type Cell, type ShiftTemplate, type ShiftValue } from '../schedule/types';
import { DesignIcon } from './assets';
import { QuickAssign } from './quick-assign';
import { ScheduleGrid, shiftDragType, templateDragType } from './schedule-grid';
import { useSchedule } from './use-schedule';

const monthLabel = new Intl.DateTimeFormat('ru', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const rangeLabel = new Intl.DateTimeFormat('ru', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

function templateValue({ id, startTime, endTime }: ShiftTemplate): ShiftValue {
  return { templateId: id, startTime, endTime };
}

export function ScheduleEditor({ today }: { today: string }) {
  const [anchor, setAnchor] = useState(today);
  const [mode, setMode] = useState<CalendarMode>('week');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(new Map<string, Cell>());
  const [startTime, setStart] = useState('09:00');
  const [endTime, setEnd] = useState('17:00');
  const [quickDate, setQuickDate] = useState<string>();
  const [collapsed, setCollapsed] = useState(false);
  const [list, setList] = useState(false);
  const templatePanel = useRef<HTMLElement>(null);
  const lastCell = useRef<Cell | null>(null);
  const { from, to, dates } = getPeriod(anchor, mode);
  const schedule = useSchedule(from, to);
  const { data, saving, loading, shifts, edit, save, loadError, notice, pending } = schedule;
  const employees = data?.employees.filter(({ name }) =>
    search.trim().toLocaleLowerCase('ru').split(/\s+/).every((part) => name.toLocaleLowerCase('ru').includes(part)),
  ) ?? [];
  const templates = data?.templates ?? [];
  const disabled = !data || saving || !!notice?.conflict;
  const templateCounts = new Map<string, number>();
  for (const { templateId } of shifts.values()) {
    if (templateId) templateCounts.set(templateId, (templateCounts.get(templateId) ?? 0) + 1);
  }

  function clearSelection() {
    setSelected(new Map());
    lastCell.current = null;
  }

  function navigate(date: string, nextMode = mode) {
    if (saving) return;
    clearSelection();
    setAnchor(date);
    setMode(nextMode);
  }

  function select(cell: Cell, range: boolean) {
    const key = cellKey(cell);
    const next = new Map(selected);
    const previous = lastCell.current;
    const row = employees.findIndex(({ id }) => id === cell.employeeId);
    const previousRow = employees.findIndex(({ id }) => id === previous?.employeeId);
    if (range && previous && previousRow >= 0) {
      const column = dates.indexOf(cell.date);
      const previousColumn = dates.indexOf(previous.date);
      for (const employee of employees.slice(Math.min(row, previousRow), Math.max(row, previousRow) + 1)) {
        for (const date of dates.slice(Math.min(column, previousColumn), Math.max(column, previousColumn) + 1)) {
          const inRange = { employeeId: employee.id, date };
          next.set(cellKey(inRange), inRange);
        }
      }
    } else if (next.has(key)) {
      next.delete(key);
    } else {
      next.set(key, cell);
    }
    lastCell.current = cell;
    setSelected(next);
    const [onlyKey] = next.keys();
    const shift = next.size === 1 ? shifts.get(onlyKey) : undefined;
    if (shift) {
      setStart(shift.startTime);
      setEnd(shift.endTime);
    }
  }

  function apply(shift: ShiftValue | null) {
    edit([...selected.values()].map((cell) => ({ ...cell, shift })));
  }

  function drop(event: DragEvent, target: Cell) {
    event.preventDefault();
    if (disabled) return;
    const templateId = event.dataTransfer.getData(templateDragType);
    const template = templates.find(({ id }) => id === templateId);
    if (template) {
      edit([{ ...target, shift: templateValue(template) }]);
      return;
    }
    const source = shifts.get(event.dataTransfer.getData(shiftDragType));
    if (!source || shifts.has(cellKey(target))) return;
    const { employeeId, date, ...shift } = source;
    edit([{ employeeId, date, shift: null }, { ...target, shift }]);
    clearSelection();
  }

  const visibleSelection = [...selected.values()];
  const selectedEmployees = new Set(visibleSelection.map(({ employeeId }) => employeeId)).size;
  const selectedDays = new Set(visibleSelection.map(({ date }) => date)).size;
  const label = mode === 'week' ? rangeLabel.formatRange(utcDate(from), utcDate(to)) : monthLabel.format(utcDate(from));

  return <div className={`app-shell ${collapsed ? 'collapsed' : ''}`}>
    <aside className="sidebar" aria-label="Навигация CRM">
      <div className="sidebar-heading">
        <strong>CRM</strong>
        <details className="notifications">
          <summary className="icon-button" aria-label="Уведомления"><DesignIcon name="imgIconSet1" /></summary>
          <span>Уведомлений нет</span>
        </details>
      </div>
      <nav>
        <button type="button" className="side-link" aria-label="Главная" aria-current={list ? 'page' : undefined}
          onClick={() => setList(true)}><DesignIcon name="imgTypeHome" /><span>Главная</span></button>
        <button type="button" className="side-link" aria-label="Смены" aria-current={!list ? 'page' : undefined}
          onClick={() => setList(false)}><DesignIcon name="imgIconSet2" /><span>Смены</span></button>
      </nav>
      <button type="button" className="side-link sidebar-toggle" aria-label={collapsed ? 'Развернуть меню' : 'Свернуть меню'}
        onClick={() => setCollapsed(!collapsed)}><DesignIcon name="imgIconSet3" /><span>Свернуть меню</span></button>
    </aside>

    <main className="workspace">
      {list ? <><h1>Графики смен</h1><button className="button primary" onClick={() => setList(false)}>Открыть график</button></> : <>
        <button className="back-link" type="button" onClick={() => setList(true)}>
          <span><DesignIcon name="imgChevronLeft" /></span>Графики смен
        </button>
        <header className="page-heading">
          <h1>График</h1>
          <div className="page-actions">
            <button className="button secondary" disabled={disabled || (!pending && data?.publishedRevision === data?.revision)}
              onClick={() => void save(true)}>Опубликовать</button>
            <button className="button primary" disabled={disabled || !pending} onClick={() => void save(false)}>
              {saving ? 'Сохраняем…' : 'Сохранить'}
            </button>
          </div>
        </header>
        {notice && <div className={`notice ${notice.error ? 'notice-error' : ''}`} role={notice.error ? 'alert' : 'status'}>
          {notice.text}
          {notice.conflict && <button className="text-button" onClick={() => { clearSelection(); schedule.reload(true); }}>
            Сбросить правки и обновить
          </button>}
        </div>}
        <div className="schedule-layout">
          <section className="calendar-panel" aria-label="График">
            {selected.size ? <div className="selection-toolbar">
              <div>Выделено: <strong>{selected.size} яч.</strong> {selectedEmployees} сотр. · {selectedDays} дн.</div>
              <div className="selection-actions">
                <button disabled={disabled || !templates.length} onClick={() => {
                  const first = templatePanel.current?.querySelector<HTMLButtonElement>('.template');
                  first?.focus();
                  first?.scrollIntoView({ block: 'nearest' });
                }}><Table2 size={14} /> Применить шаблон</button>
                <button disabled={disabled || !visibleSelection.some((cell) => shifts.has(cellKey(cell)))}
                  onClick={() => apply(null)}><Trash2 size={14} /> Очистить</button>
                <button onClick={clearSelection}><X size={14} /> Снять</button>
              </div>
            </div> : <div className="calendar-toolbar">
              <label className="search"><DesignIcon name="imgIconSet" /><input type="search" aria-label="Поиск по ФИО"
                placeholder="Поиск по ФИО" value={search} onChange={(event) => setSearch(event.target.value)} />
                {search && <button type="button" aria-label="Очистить поиск" onClick={() => setSearch('')}><DesignIcon name="imgTypeX01" /></button>}
              </label>
              <div className="view-tabs" role="group" aria-label="Вид календаря">
                <button disabled={saving} aria-pressed={mode === 'month'} onClick={() => navigate(anchor, 'month')}>Месяц</button>
                <button disabled={saving} aria-pressed={mode === 'week'} onClick={() => navigate(anchor, 'week')}>Неделя</button>
              </div>
            </div>}
            <div className="period-toolbar">
              <div className="period-controls">
                <button className="icon-button" aria-label="Предыдущий период" disabled={saving}
                  onClick={() => navigate(movePeriod(anchor, mode, -1))}><ChevronLeft size={17} /></button>
                <strong>{label}</strong>
                <button className="icon-button" aria-label="Следующий период" disabled={saving}
                  onClick={() => navigate(movePeriod(anchor, mode, 1))}><ChevronRight size={17} /></button>
                <button className="text-button" disabled={saving} onClick={() => navigate(today)}>Сегодня</button>
              </div>
              {pending > 0 && <small>Несохранённые ячейки: {pending}</small>}
            </div>
            {loading && <p className="grid-message" role="status">Загрузка графика…</p>}
            {loadError && <div className="grid-message" role="alert">{loadError}
              <button className="text-button" onClick={() => schedule.reload()}>Повторить</button>
            </div>}
            {data && !employees.length && <p className="grid-message">Сотрудники не найдены.</p>}
            {data && <ScheduleGrid mode={mode} dates={dates} today={today} employees={employees} shifts={shifts}
              selected={selected} disabled={disabled} onSelect={select} onDate={setQuickDate} onDrop={drop}
              onShiftDrag={(event, cell) => {
                event.dataTransfer.setData(shiftDragType, cellKey(cell));
                event.dataTransfer.effectAllowed = 'move';
              }} />}
          </section>
          <aside className="templates-panel" ref={templatePanel} aria-label="Назначение смен">
            <h2>Шаблоны смен</h2>
            <div className="template-list">
              {templates.map((template) => <button key={template.id} className="template" data-tone={template.id}
                draggable={!disabled} disabled={disabled} aria-disabled={!selected.size || disabled}
                onClick={() => { if (selected.size) apply(templateValue(template)); }}
                onDragStart={(event) => {
                  event.dataTransfer.setData(templateDragType, template.id);
                  event.dataTransfer.effectAllowed = 'copy';
                }}>
                <strong>{template.name}</strong>
                <span>{template.startTime} – {template.endTime} · {shiftMinutes(templateValue(template)) / 60} ч</span>
                <small aria-label={`Назначений: ${templateCounts.get(template.id) ?? 0}`}>{templateCounts.get(template.id) ?? 0}</small>
              </button>)}
            </div>
            <form className="custom-form" onSubmit={(event) => {
              event.preventDefault();
              if (selected.size && startTime && endTime && startTime !== endTime) {
                apply({ templateId: null, startTime, endTime });
              }
            }}>
              <h2>Своя смена</h2>
              <div className="time-fields">
                <label>Начало<input type="time" required value={startTime} onChange={(event) => setStart(event.target.value)} /></label>
                <label>Конец<input type="time" required value={endTime} onChange={(event) => setEnd(event.target.value)} /></label>
              </div>
              <button className="button secondary" disabled={disabled || !selected.size || !startTime || !endTime || startTime === endTime}>
                <DesignIcon name="imgIconSet4" />Поставить в выделенные
              </button>
              {startTime && startTime === endTime && <small className="time-error">Начало и конец должны различаться.</small>}
            </form>
            {!selected.size && data && <details className="help">
              <summary><CircleHelp size={16} /> Как назначить смену</summary>
              <p>Выберите одну или несколько ячеек. Shift выделяет прямоугольник. Шаблон можно перетащить в ячейку, а назначенную смену — в свободную.</p>
            </details>}
          </aside>
        </div>
        {quickDate && data && <QuickAssign key={quickDate} date={quickDate} employees={data.employees}
          templates={templates} onClose={() => setQuickDate(undefined)} onApply={(ids, template) => {
            edit(ids.map((employeeId) => ({ employeeId, date: quickDate, shift: templateValue(template) })));
            setQuickDate(undefined);
          }} />}
      </>}
    </main>
  </div>;
}
