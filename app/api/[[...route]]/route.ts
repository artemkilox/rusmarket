import { handle } from 'hono/vercel';
import { createApi } from '../../../src/server/api';
import { scheduleStore } from '../../../src/server/postgres';

export const runtime = 'nodejs';

const api = createApi(scheduleStore);
export const GET = handle(api);
export const PATCH = handle(api);
