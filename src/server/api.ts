import { Hono } from 'hono';
import { z } from 'zod';
import { addDays } from '../schedule/calendar';
import { cellKey, type Change, type Schedule } from '../schedule/types';

const date = z.iso.date().refine((value) => value >= '1900-01-01' && value <= '9998-12-31');
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const shiftValue = z.strictObject({
  templateId: z.string().min(1).max(50).nullable(),
  startTime: time,
  endTime: time,
}).refine((shift) => shift.startTime !== shift.endTime);

const period = z.object({ from: date, to: date })
  .refine(({ from, to }) => from <= to && to <= addDays(from, 30));

const saveBody = z.strictObject({
  revision: z.number().int().min(0).max(2147483646),
  publish: z.boolean().default(false),
  changes: z.array(z.strictObject({
    employeeId: z.number().int().positive().max(2147483647),
    date,
    shift: shiftValue.nullable(),
  })).max(1000),
}).refine(({ changes, publish }) =>
  (publish || changes.length > 0) && new Set(changes.map(cellKey)).size === changes.length,
);

export interface ScheduleStore {
  load(from: string, to: string): Promise<Schedule>;
  save(revision: number, changes: Change[], publish: boolean): Promise<number | 'conflict' | 'invalid-reference'>;
}

export function createApi(store: ScheduleStore) {
  const api = new Hono().basePath('/api');

  api.get('/schedule', async (context) => {
    const range = period.safeParse(context.req.query());
    if (!range.success) return context.json({ message: 'Укажите период не длиннее 31 дня.' }, 400);
    context.header('Cache-Control', 'no-store');
    return context.json(await store.load(range.data.from, range.data.to));
  });

  api.patch('/schedule', async (context) => {
    const body = saveBody.safeParse(await context.req.json().catch(() => null));
    if (!body.success) return context.json({ message: 'Проверьте даты, время и список изменений.' }, 400);

    const result = await store.save(body.data.revision, body.data.changes, body.data.publish);
    if (result === 'conflict') {
      return context.json({ message: 'График уже изменился. Обновите данные и проверьте правки.' }, 409);
    }
    if (result === 'invalid-reference') {
      return context.json({ message: 'Проверьте сотрудника, шаблон и время из шаблона.' }, 422);
    }
    return context.json({ revision: result });
  });

  api.onError((error, context) => {
    console.error('Schedule API:', error.message);
    return context.json({ message: 'Не удалось обратиться к расписанию. Попробуйте ещё раз.' }, 500);
  });

  return api;
}
