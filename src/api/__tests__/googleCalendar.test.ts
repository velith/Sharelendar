import { listEvents } from '../googleCalendar';
import { jsonResponse, makeEvent } from '../../test-utils/fixtures';

const NOW = Date.parse('2026-10-12T05:00:00Z');
const fetchMock = jest.fn();

beforeAll(() => {
  global.fetch = fetchMock as unknown as typeof fetch;
});

beforeEach(() => {
  jest.spyOn(Date, 'now').mockReturnValue(NOW);
});

afterEach(() => {
  jest.restoreAllMocks();
  fetchMock.mockReset();
});

const requestedUrl = (call = 0) => new URL(fetchMock.mock.calls[call][0] as string);

describe('listEvents', () => {
  it('requests the primary calendar with expanded, ordered events', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ items: [] }));
    await listEvents('tok');

    const url = requestedUrl();
    expect(url.origin + url.pathname).toBe('https://www.googleapis.com/calendar/v3/calendars/primary/events');
    expect(url.searchParams.get('singleEvents')).toBe('true');
    expect(url.searchParams.get('orderBy')).toBe('startTime');
    expect(url.searchParams.get('maxResults')).toBe('250');
    expect(url.searchParams.get('pageToken')).toBeNull();
  });

  it('defaults timeMin to 30 days ago and honours daysBack', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ items: [] }));
    await listEvents('tok');
    await listEvents('tok', { daysBack: 1 });

    expect(requestedUrl(0).searchParams.get('timeMin')).toBe('2026-09-12T05:00:00.000Z');
    expect(requestedUrl(1).searchParams.get('timeMin')).toBe('2026-10-11T05:00:00.000Z');
  });

  it('sends the access token as a Bearer header', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ items: [] }));
    await listEvents('secret-token');

    expect(fetchMock.mock.calls[0][1]).toEqual({ headers: { Authorization: 'Bearer secret-token' } });
  });

  it('URL-encodes custom calendar IDs', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ items: [] }));
    await listEvents('tok', { calendarId: 'team cal@group.calendar.google.com' });

    expect(requestedUrl().pathname).toBe('/calendar/v3/calendars/team%20cal%40group.calendar.google.com/events');
  });

  it('returns events and filters out cancelled ones', async () => {
    const a = makeEvent({ id: 'a' });
    const b = makeEvent({ id: 'b', status: 'cancelled' });
    const c = makeEvent({ id: 'c' });
    fetchMock.mockResolvedValueOnce(jsonResponse({ items: [a, b, c] }));

    expect((await listEvents('tok')).map((e) => e.id)).toEqual(['a', 'c']);
  });

  it('handles a response without items', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({}));
    await expect(listEvents('tok')).resolves.toEqual([]);
  });

  it('follows nextPageToken and concatenates pages', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ items: [makeEvent({ id: '1' })], nextPageToken: 'p2' }))
      .mockResolvedValueOnce(jsonResponse({ items: [makeEvent({ id: '2' })] }));

    const events = await listEvents('tok');

    expect(events.map((e) => e.id)).toEqual(['1', '2']);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(requestedUrl(1).searchParams.get('pageToken')).toBe('p2');
  });

  it('stops after 5 pages to bound the request count', async () => {
    fetchMock.mockImplementation(async () => jsonResponse({ items: [makeEvent()], nextPageToken: 'more' }));

    const events = await listEvents('tok');

    expect(fetchMock).toHaveBeenCalledTimes(5);
    expect(events).toHaveLength(5);
  });

  it('throws with status and body on HTTP errors', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse('Invalid Credentials', { ok: false, status: 401 }));
    await expect(listEvents('tok')).rejects.toThrow('Calendar API error 401: Invalid Credentials');
  });
});

