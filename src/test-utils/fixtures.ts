import type { User } from '@react-native-google-signin/google-signin';
import type { CalendarEvent } from '../api/googleCalendar';

export function makeEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: 'evt1',
    iCalUID: 'evt1@google.com',
    status: 'confirmed',
    summary: 'Team lunch',
    description: 'Bring your appetite',
    location: 'Cafe Central',
    htmlLink: 'https://calendar.google.com/event?eid=evt1',
    start: { dateTime: '2026-10-20T12:00:00+02:00' },
    end: { dateTime: '2026-10-20T13:30:00+02:00' },
    organizer: { email: 'boss@example.com', displayName: 'The Boss' },
    ...overrides,
  };
}

export function makeAllDayEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return makeEvent({
    id: 'allday1',
    iCalUID: 'allday1@google.com',
    summary: 'Holiday',
    start: { date: '2026-10-24' },
    end: { date: '2026-10-25' },
    ...overrides,
  });
}

export const testUser = {
  user: {
    id: '123',
    email: 'user@example.com',
    name: 'Test User',
    givenName: 'Test',
    familyName: 'User',
    photo: null,
  },
  idToken: 'id-token',
  serverAuthCode: null,
  scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
} as User;

/** Minimal `fetch` Response stand-in. */
export function jsonResponse(body: unknown, init: { ok?: boolean; status?: number } = {}) {
  const { ok = true, status = 200 } = init;
  return {
    ok,
    status,
    json: async () => body,
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  } as unknown as Response;
}

