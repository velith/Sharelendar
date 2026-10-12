import type { CalendarEvent, EventDateTime } from '../api/googleCalendar';

const dateFmt = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  year: 'numeric',
  month: 'short',
  day: 'numeric',
});
const timeFmt = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' });

export function isAllDay(event: CalendarEvent): boolean {
  return !!event.start.date;
}

/** Parses a Google EventDateTime into a local Date (all-day dates are treated as local midnight). */
export function toDate(dt: EventDateTime): Date {
  if (dt.date) {
    const [y, m, d] = dt.date.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(dt.dateTime!);
}

export function formatEventDate(event: CalendarEvent): string {
  return dateFmt.format(toDate(event.start));
}

export function formatEventTimeRange(event: CalendarEvent): string {
  if (isAllDay(event)) return 'All day';
  const start = toDate(event.start);
  const end = toDate(event.end);
  const sameDay = start.toDateString() === end.toDateString();
  return sameDay
    ? `${timeFmt.format(start)} – ${timeFmt.format(end)}`
    : `${timeFmt.format(start)} – ${dateFmt.format(end)} ${timeFmt.format(end)}`;
}

