import type { CalendarEvent, EventDateTime } from '../api/googleCalendar';

/**
 * Builds an RFC 5545 iCalendar (.ics) document for a single event.
 * Timed events are emitted in UTC; all-day events use VALUE=DATE.
 */
export function buildIcs(event: CalendarEvent, now: Date = new Date()): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ShareLendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${event.iCalUID ?? `${event.id}@sharelendar`}`,
    `DTSTAMP:${toUtcStamp(now)}`,
    formatDateProp('DTSTART', event.start),
    formatDateProp('DTEND', event.end),
    `SUMMARY:${escapeText(event.summary ?? '(No title)')}`,
  ];
  if (event.location) lines.push(`LOCATION:${escapeText(event.location)}`);
  if (event.description) lines.push(`DESCRIPTION:${escapeText(event.description)}`);
  if (event.htmlLink) lines.push(`URL:${event.htmlLink}`);
  lines.push('END:VEVENT', 'END:VCALENDAR');

  return lines.map(foldLine).join('\r\n') + '\r\n';
}

/** A filesystem-safe file name derived from the event title. */
export function icsFileName(event: CalendarEvent): string {
  const base = (event.summary ?? 'event')
    .replace(/[^\p{L}\p{N}\-_ ]/gu, '')
    .trim()
    .replace(/\s+/g, '_')
    .slice(0, 50);
  return `${base || 'event'}.ics`;
}

function formatDateProp(name: string, dt: EventDateTime): string {
  if (dt.date) {
    // All-day: Google's end date is already exclusive, matching iCalendar semantics.
    return `${name};VALUE=DATE:${dt.date.replace(/-/g, '')}`;
  }
  return `${name}:${toUtcStamp(new Date(dt.dateTime!))}`;
}

function toUtcStamp(d: Date): string {
  // 2026-10-11T18:45:00.000Z -> 20261011T184500Z
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/** Folds lines longer than 75 octets (RFC 5545 §3.1), without splitting UTF-8 characters. */
function foldLine(line: string): string {
  const parts: string[] = [];
  let current = '';
  let bytes = 0;
  for (const ch of line) {
    const len = utf8Length(ch);
    const limit = parts.length === 0 ? 75 : 74; // continuation lines start with a space
    if (bytes + len > limit) {
      parts.push(current);
      current = '';
      bytes = 0;
    }
    current += ch;
    bytes += len;
  }
  parts.push(current);
  return parts.join('\r\n ');
}

function utf8Length(ch: string): number {
  const cp = ch.codePointAt(0)!;
  if (cp < 0x80) return 1;
  if (cp < 0x800) return 2;
  if (cp < 0x10000) return 3;
  return 4;
}

