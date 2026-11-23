import { useEffect, useState } from 'react';
import { applyChanges, cellKey, type Change, type Schedule, type ShiftValue } from '../schedule/types';

class ScheduleError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new ScheduleError(error?.message || 'Не удалось выполнить запрос.', response.status);
  }
  return response.json();
}

function message(error: unknown) {
  return error instanceof ScheduleError ? error.message : 'Проверьте соединение и повторите попытку.';
}

function sameShift(left: ShiftValue | null | undefined, right: ShiftValue | null) {
  return !left || !right
    ? !left && !right
    : left.templateId === right.templateId && left.startTime === right.startTime && left.endTime === right.endTime;
}

export function useSchedule(from: string, to: string) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ key: string; data: Schedule } | { key: string; error: string }>();
  const [draft, setDraft] = useState<{ revision: number; changes: Map<string, Change> }>();
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ text: string; error?: boolean; conflict?: boolean }>();
  const key = `${from}/${to}/${attempt}`;
  const current = result?.key === key ? result : undefined;
  const data = current && 'data' in current ? current.data : undefined;

  useEffect(() => {
    const abort = new AbortController();
    request<Schedule>(`/api/schedule?from=${from}&to=${to}`, { signal: abort.signal })
      .then((data) => {
        if (!abort.signal.aborted) setResult({ key, data });
      })
      .catch((error: unknown) => {
        if (!abort.signal.aborted) setResult({ key, error: message(error) });
      });
    return () => abort.abort();
  }, [from, to, key]);

  useEffect(() => {
    if (!draft) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [draft]);

  function edit(changes: Change[]) {
    if (!data || saving || notice?.conflict) return;
    const saved = new Map(data.shifts.map((shift) => [cellKey(shift), shift]));
    const next = new Map(draft?.changes);
    for (const change of changes) {
      const id = cellKey(change);
      if (sameShift(saved.get(id), change.shift)) next.delete(id);
      else next.set(id, change);
    }
    if (next.size > 1000) {
      setNotice({ text: 'Сохраните текущие правки перед следующим большим изменением.', error: true });
      return;
    }
    setNotice(undefined);
    setDraft(next.size ? { revision: draft?.revision ?? data.revision, changes: next } : undefined);
  }

  async function save(publish: boolean) {
    if (!data || saving || notice?.conflict || (!publish && !draft)) return;
    setSaving(true);
    setNotice(undefined);
    try {
      const changes = [...(draft?.changes.values() ?? [])];
      const { revision } = await request<{ revision: number }>('/api/schedule', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ revision: draft?.revision ?? data.revision, changes, publish }),
      });
      const visible = changes.filter(({ date }) => date >= from && date <= to);
      setResult({ key, data: {
        ...data,
        revision,
        publishedRevision: publish ? revision : data.publishedRevision,
        shifts: [...applyChanges(data.shifts, visible).values()],
      } });
      setDraft(undefined);
      setNotice({ text: publish ? 'График опубликован.' : 'Изменения сохранены.' });
    } catch (error) {
      setNotice({ text: message(error), error: true, conflict: error instanceof ScheduleError && error.status === 409 });
    } finally {
      setSaving(false);
    }
  }

  function reload(discardDraft = false) {
    if (discardDraft) {
      setDraft(undefined);
      setNotice(undefined);
    }
    setAttempt((previous) => previous + 1);
  }

  const visibleChanges = [...(draft?.changes.values() ?? [])].filter(({ date }) => date >= from && date <= to);
  return {
    data, saving, notice, edit, save, reload,
    loading: !current,
    loadError: current && 'error' in current ? current.error : undefined,
    pending: draft?.changes.size ?? 0,
    shifts: applyChanges(data?.shifts ?? [], visibleChanges),
  };
}
