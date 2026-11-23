import { Pool } from 'pg';
import type { Change, Schedule } from '../schedule/types';
import type { ScheduleStore } from './api';

let pool: Pool | undefined;

function database() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  return pool ??= new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000 });
}

export const scheduleStore: ScheduleStore = {
  async load(from, to) {
    const { rows } = await database().query<Schedule>(`
      SELECT revision, (SELECT revision FROM schedule_publication WHERE singleton) AS "publishedRevision",
        (SELECT COALESCE(jsonb_agg(to_jsonb(e) ORDER BY e.id), '[]') FROM employees e) AS employees,
        (SELECT COALESCE(jsonb_agg(jsonb_build_object(
          'id', id, 'name', name,
          'startTime', left(start_time::text, 5), 'endTime', left(end_time::text, 5)
        ) ORDER BY position), '[]') FROM shift_templates) AS templates,
        (SELECT COALESCE(jsonb_agg(jsonb_build_object(
          'employeeId', employee_id, 'date', to_char(date, 'YYYY-MM-DD'), 'templateId', template_id,
          'startTime', left(start_time::text, 5), 'endTime', left(end_time::text, 5)
        )), '[]') FROM shifts WHERE date BETWEEN $1::date AND $2::date) AS shifts
      FROM schedule_version WHERE singleton
    `, [from, to]);
    return rows[0];
  },

  async save(revision, changes, publish) {
    const client = await database().connect();
    try {
      await client.query('BEGIN');
      const version = await client.query<{ revision: number }>(`
        UPDATE schedule_version SET revision = revision + 1
        WHERE singleton AND revision = $1 RETURNING revision
      `, [revision]);
      if (!version.rowCount) {
        await client.query('ROLLBACK');
        return 'conflict';
      }

      const input = JSON.stringify(changes.map(toDatabaseChange));
      const { rows: [validation] } = await client.query<{ invalid: boolean }>(`
        SELECT EXISTS (
          SELECT 1 FROM jsonb_to_recordset($1::jsonb)
            AS c(employee_id integer, template_id text, start_time time, end_time time)
          LEFT JOIN employees e ON e.id = c.employee_id
          LEFT JOIN shift_templates t ON t.id = c.template_id
          WHERE e.id IS NULL OR (c.template_id IS NOT NULL AND
            (t.id IS NULL OR t.start_time <> c.start_time OR t.end_time <> c.end_time))
        ) AS invalid
      `, [input]);
      if (validation.invalid) {
        await client.query('ROLLBACK');
        return 'invalid-reference';
      }

      await client.query(`
        DELETE FROM shifts s USING jsonb_to_recordset($1::jsonb)
          AS c(employee_id integer, date date, start_time time)
        WHERE c.start_time IS NULL AND s.employee_id = c.employee_id AND s.date = c.date
      `, [input]);
      await client.query(`
        INSERT INTO shifts (employee_id, date, template_id, start_time, end_time)
        SELECT employee_id, date, template_id, start_time, end_time
        FROM jsonb_to_recordset($1::jsonb)
          AS c(employee_id integer, date date, template_id text, start_time time, end_time time)
        WHERE start_time IS NOT NULL
        ON CONFLICT (employee_id, date) DO UPDATE SET
          template_id = EXCLUDED.template_id,
          start_time = EXCLUDED.start_time,
          end_time = EXCLUDED.end_time
      `, [input]);
      const nextRevision = version.rows[0].revision;
      if (publish) {
        await client.query(`
          INSERT INTO schedule_publication (revision, shifts)
          SELECT $1, COALESCE(jsonb_agg(to_jsonb(s)), '[]') FROM shifts s WHERE true
          ON CONFLICT (singleton) DO UPDATE SET
            revision = EXCLUDED.revision, shifts = EXCLUDED.shifts, published_at = now()
        `, [nextRevision]);
      }
      await client.query('COMMIT');
      return nextRevision;
    } catch (error) {
      await client.query('ROLLBACK');
      if (typeof error === 'object' && error && 'code' in error && error.code === '23503') {
        return 'invalid-reference';
      }
      throw error;
    } finally {
      client.release();
    }
  },
};

function toDatabaseChange({ employeeId, date, shift }: Change) {
  return {
    employee_id: employeeId,
    date,
    template_id: shift?.templateId ?? null,
    start_time: shift?.startTime ?? null,
    end_time: shift?.endTime ?? null,
  };
}
