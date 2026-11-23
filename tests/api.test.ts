import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Change } from '../src/schedule/types';
import { createApi, type ScheduleStore } from '../src/server/api';

const change: Change = {
  employeeId: 1,
  date: '2026-11-23',
  shift: { templateId: 'morning', startTime: '07:00', endTime: '15:00' },
};

function fixture(saveResult: Awaited<ReturnType<ScheduleStore['save']>> = 3) {
  const loads: string[][] = [];
  const saves: Parameters<ScheduleStore['save']>[] = [];
  const api = createApi({
    async load(from, to) {
      loads.push([from, to]);
      return { revision: 2, publishedRevision: null, employees: [], templates: [], shifts: [] };
    },
    async save(...args) {
      saves.push(args);
      return saveResult;
    },
  });
  const patch = (body: object) => api.request('/api/schedule', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { api, patch, loads, saves };
}

test('GET передаёт в хранилище период до 31 дня и запрещает кэширование', async () => {
  const { api, loads } = fixture();
  const response = await api.request('/api/schedule?from=2026-10-01&to=2026-10-31');
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.deepEqual(loads, [['2026-10-01', '2026-10-31']]);
  const invalid = await api.request('/api/schedule?from=2026-02-30&to=2026-03-01');
  assert.equal(invalid.status, 400);
  assert.equal(loads.length, 1);
});

test('PATCH передаёт хранилищу назначение и удаление одним пакетом', async () => {
  const { patch, saves } = fixture();
  const changes = [change, { ...change, date: '2026-11-24', shift: null }];
  const response = await patch({ revision: 2, changes });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { revision: 3 });
  assert.deepEqual(saves, [[2, changes, false]]);
});

test('PATCH отклоняет одинаковые времена и повтор одного сотрудника на дату', async () => {
  const { patch, saves } = fixture();
  const invalid = { ...change, shift: { templateId: null, startTime: '12:00', endTime: '12:00' } };
  assert.equal((await patch({ revision: 2, changes: [invalid] })).status, 400);
  assert.equal((await patch({ revision: 2, changes: [change, change] })).status, 400);
  assert.equal(saves.length, 0);
});

test('PATCH сообщает о конфликте и разрешает публикацию без новых правок', async () => {
  const { patch, saves } = fixture('conflict');
  const response = await patch({ revision: 2, changes: [], publish: true });
  assert.equal(response.status, 409);
  assert.deepEqual(saves, [[2, [], true]]);
});
