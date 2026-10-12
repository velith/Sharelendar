import { formatEventDate, formatEventTimeRange, isAllDay, toDate } from '../format';
import { makeAllDayEvent, makeEvent } from '../../test-utils/fixtures';

// Jest runs with TZ=UTC (see jest.global-setup.js). Expected strings are built with the
// same Intl options as the implementation, so tests pass under any default locale.
const dateFmt = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  year: 'numeric',
  month: 'short',
  day: 'numeric',
});
const timeFmt = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' });

describe('isAllDay', () => {
  it('is true for date-only events and false for timed events', () => {
    expect(isAllDay(makeAllDayEvent())).toBe(true);
    expect(isAllDay(makeEvent())).toBe(false);
  });
});

describe('toDate', () => {
  it('parses all-day dates as local midnight (no UTC day shift)', () => {
    const d = toDate({ date: '2026-10-24' });
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()]).toEqual([
      2026, 9, 24, 0, 0,
    ]);
  });

  it('parses RFC3339 timestamps including offset', () => {
    expect(toDate({ dateTime: '2026-10-20T12:00:00+02:00' }).toISOString()).toBe('2026-10-20T10:00:00.000Z');
  });
});

describe('formatEventDate', () => {
  it('formats the start date', () => {
    expect(formatEventDate(makeEvent())).toBe(dateFmt.format(new Date('2026-10-20T10:00:00Z')));
  });

  it('formats all-day events on the correct calendar day', () => {
    expect(formatEventDate(makeAllDayEvent())).toBe(dateFmt.format(new Date(2026, 9, 24)));
  });
});

describe('formatEventTimeRange', () => {
  it('returns "All day" for all-day events', () => {
    expect(formatEventTimeRange(makeAllDayEvent())).toBe('All day');
  });

  it('shows start – end time for same-day events', () => {
    const start = new Date('2026-10-20T10:00:00Z');
    const end = new Date('2026-10-20T11:30:00Z');
    expect(formatEventTimeRange(makeEvent())).toBe(`${timeFmt.format(start)} – ${timeFmt.format(end)}`);
  });

  it('includes the end date for events spanning multiple days', () => {
    const event = makeEvent({
      start: { dateTime: '2026-10-20T22:00:00Z' },
      end: { dateTime: '2026-10-21T02:00:00Z' },
    });
    const start = new Date('2026-10-20T22:00:00Z');
    const end = new Date('2026-10-21T02:00:00Z');
    expect(formatEventTimeRange(event)).toBe(
      `${timeFmt.format(start)} – ${dateFmt.format(end)} ${timeFmt.format(end)}`,
    );
  });
});

