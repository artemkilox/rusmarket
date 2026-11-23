import { ScheduleEditor } from '../src/ui/schedule-editor';

export const dynamic = 'force-dynamic';

export default function Page() {
  const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Moscow' }).format(new Date());
  return <ScheduleEditor today={today} />;
}
