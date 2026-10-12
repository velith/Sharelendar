/**
 * Minimal Google Calendar REST v3 client.
 * Docs: https://developers.google.com/calendar/api/v3/reference/events/list
 */

export type EventDateTime = {
  /** RFC3339 timestamp for timed events. */
  dateTime?: string;
  /** YYYY-MM-DD for all-day events. */
  date?: string;
  timeZone?: string;
};

export type CalendarEvent = {
  id: string;
  iCalUID?: string;
  status?: string;
  summary?: string;
  description?: string;
  location?: string;
  htmlLink?: string;
  start: EventDateTime;
  end: EventDateTime;
  organizer?: { email?: string; displayName?: string };
};

type EventsListResponse = {
  items?: CalendarEvent[];
  nextPageToken?: string;
};

const BASE_URL = 'https://www.googleapis.com/calendar/v3';
const MAX_PAGES = 5; // up to 1250 events

/**
 * Lists events from the user's primary calendar, starting `daysBack` days ago,
 * with recurring events expanded into individual instances.
 */
export async function listEvents(
  accessToken: string,
  { calendarId = 'primary', daysBack = 30 }: { calendarId?: string; daysBack?: number } = {},
): Promise<CalendarEvent[]> {
  const timeMin = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString();
  const events: CalendarEvent[] = [];
  let pageToken: string | undefined;

  for (let page = 0; page < MAX_PAGES; page++) {
    const params = new URLSearchParams({
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '250',
      timeMin,
    });
    if (pageToken) params.set('pageToken', pageToken);

    const res = await fetch(
      `${BASE_URL}/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!res.ok) {
      throw new Error(`Calendar API error ${res.status}: ${await res.text()}`);
    }

    const json = (await res.json()) as EventsListResponse;
    events.push(...(json.items ?? []).filter((e) => e.status !== 'cancelled'));
    pageToken = json.nextPageToken;
    if (!pageToken) break;
  }

  return events;
}

