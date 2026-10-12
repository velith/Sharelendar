import { buildIcs, icsFileName } from '../ics';
import { makeAllDayEvent, makeEvent } from '../../test-utils/fixtures';

const NOW = new Date('2026-10-12T05:00:00Z');

/** Physical lines of the document (without the trailing empty element). */
const physicalLines = (ics: string) => ics.split('\r\n').slice(0, -1);
/** Logical lines after RFC 5545 unfolding. */
const logicalLines = (ics: string) => physicalLines(ics.replace(/\r\n /g, '')).filter(Boolean);
const prop = (ics: string, name: string) =>
  logicalLines(ics).find((l) => l.startsWith(`${name}:`) || l.startsWith(`${name};`));

describe('buildIcs', () => {
  it('produces a well-formed VCALENDAR with a single VEVENT', () => {
    const lines = logicalLines(buildIcs(makeEvent(), NOW));
    expect(lines[0]).toBe('BEGIN:VCALENDAR');
    expect(lines).toContain('VERSION:2.0');
    expect(lines).toContain('PRODID:-//ShareLendar//EN');
    expect(lines).toContain('METHOD:PUBLISH');
    expect(lines.filter((l) => l === 'BEGIN:VEVENT')).toHaveLength(1);
    expect(lines.filter((l) => l === 'END:VEVENT')).toHaveLength(1);
    expect(lines[lines.length - 1]).toBe('END:VCALENDAR');
  });

  it('uses CRLF line endings and ends with CRLF', () => {
    const ics = buildIcs(makeEvent(), NOW);
    expect(ics.endsWith('\r\n')).toBe(true);
    expect(ics.replace(/\r\n/g, '')).not.toMatch(/[\r\n]/);
  });

  it('converts timed events with an offset to UTC', () => {
    const ics = buildIcs(makeEvent(), NOW);
    expect(prop(ics, 'DTSTART')).toBe('DTSTART:20261020T100000Z');
    expect(prop(ics, 'DTEND')).toBe('DTEND:20261020T113000Z');
  });

  it('emits all-day events as VALUE=DATE with exclusive end date', () => {
    const ics = buildIcs(makeAllDayEvent(), NOW);
    expect(prop(ics, 'DTSTART')).toBe('DTSTART;VALUE=DATE:20261024');
    expect(prop(ics, 'DTEND')).toBe('DTEND;VALUE=DATE:20261025');
  });

  it('sets DTSTAMP from the provided clock', () => {
    expect(prop(buildIcs(makeEvent(), NOW), 'DTSTAMP')).toBe('DTSTAMP:20261012T050000Z');
  });

  it('uses iCalUID as UID, falling back to id@sharelendar', () => {
    expect(prop(buildIcs(makeEvent(), NOW), 'UID')).toBe('UID:evt1@google.com');
    expect(prop(buildIcs(makeEvent({ iCalUID: undefined }), NOW), 'UID')).toBe('UID:evt1@sharelendar');
  });

  it('includes summary, location, description and URL', () => {
    const ics = buildIcs(makeEvent(), NOW);
    expect(prop(ics, 'SUMMARY')).toBe('SUMMARY:Team lunch');
    expect(prop(ics, 'LOCATION')).toBe('LOCATION:Cafe Central');
    expect(prop(ics, 'DESCRIPTION')).toBe('DESCRIPTION:Bring your appetite');
    expect(prop(ics, 'URL')).toBe('URL:https://calendar.google.com/event?eid=evt1');
  });

  it('omits optional properties that are missing', () => {
    const ics = buildIcs(
      makeEvent({ location: undefined, description: undefined, htmlLink: undefined }),
      NOW,
    );
    expect(prop(ics, 'LOCATION')).toBeUndefined();
    expect(prop(ics, 'DESCRIPTION')).toBeUndefined();
    expect(prop(ics, 'URL')).toBeUndefined();
  });

  it('uses a placeholder summary when the event has no title', () => {
    expect(prop(buildIcs(makeEvent({ summary: undefined }), NOW), 'SUMMARY')).toBe('SUMMARY:(No title)');
  });

  it('escapes backslashes, semicolons, commas and newlines', () => {
    const ics = buildIcs(makeEvent({ summary: 'a\\b; c, d\ne\r\nf' }), NOW);
    expect(prop(ics, 'SUMMARY')).toBe('SUMMARY:a\\\\b\\; c\\, d\\ne\\nf');
  });

  it('folds long lines to at most 75 octets and unfolds back losslessly', () => {
    const description = 'Lorem ipsum dolor sit amet '.repeat(20).trim();
    const ics = buildIcs(makeEvent({ description }), NOW);

    for (const line of physicalLines(ics)) {
      expect(Buffer.byteLength(line, 'utf8')).toBeLessThanOrEqual(75);
    }
    expect(physicalLines(ics).some((l) => l.startsWith(' '))).toBe(true);
    expect(prop(ics, 'DESCRIPTION')).toBe(`DESCRIPTION:${description}`);
  });

  it('never splits multi-byte UTF-8 characters when folding', () => {
    const description = 'Möte på kontoret 🎉 åäö '.repeat(10);
    const ics = buildIcs(makeEvent({ description }), NOW);

    for (const line of physicalLines(ics)) {
      expect(Buffer.byteLength(line, 'utf8')).toBeLessThanOrEqual(75);
      expect(line).not.toMatch(/[\uD800-\uDBFF]$/); // no dangling high surrogate
    }
    expect(prop(ics, 'DESCRIPTION')).toBe(`DESCRIPTION:${description}`);
  });
});

describe('icsFileName', () => {
  it('replaces whitespace with underscores', () => {
    expect(icsFileName(makeEvent({ summary: '  Team   lunch ' }))).toBe('Team_lunch.ics');
  });

  it('keeps unicode letters and digits but strips punctuation', () => {
    expect(icsFileName(makeEvent({ summary: 'Möte med Åsa: v2/final!' }))).toBe('Möte_med_Åsa_v2final.ics');
  });

  it('truncates long titles to 50 characters', () => {
    const name = icsFileName(makeEvent({ summary: 'x'.repeat(80) }));
    expect(name).toBe(`${'x'.repeat(50)}.ics`);
  });

  it('falls back to "event" when the title is missing or has no usable characters', () => {
    expect(icsFileName(makeEvent({ summary: undefined }))).toBe('event.ics');
    expect(icsFileName(makeEvent({ summary: '🎉🎉 !!' }))).toBe('event.ics');
  });
});

