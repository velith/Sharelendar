import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import type { CalendarEvent } from '../api/googleCalendar';
import { buildIcs, icsFileName } from './ics';

/** Writes the event to a temporary .ics file and opens the Android share sheet. */
export async function shareEventAsIcs(event: CalendarEvent): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Sharing is not available on this device');
  }

  const file = new File(Paths.cache, icsFileName(event));
  if (file.exists) file.delete();
  file.create();
  file.write(buildIcs(event));

  await Sharing.shareAsync(file.uri, {
    mimeType: 'text/calendar',
    dialogTitle: 'Share event',
    UTI: 'com.apple.ical.ics',
  });
}

