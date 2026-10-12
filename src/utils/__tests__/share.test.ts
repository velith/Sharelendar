import * as Sharing from 'expo-sharing';
import { File } from 'expo-file-system';

import { shareEventAsIcs } from '../share';
import { buildIcs } from '../ics';
import { makeEvent } from '../../test-utils/fixtures';

const mockFile = {
  exists: false,
  uri: '',
  delete: jest.fn(),
  create: jest.fn(),
  write: jest.fn(),
};

jest.mock('expo-file-system', () => ({
  Paths: { cache: 'CACHE_DIR' },
  File: jest.fn().mockImplementation((_dir: string, name: string) => {
    mockFile.uri = `file:///cache/${name}`;
    return mockFile;
  }),
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(async () => true),
  shareAsync: jest.fn(async () => undefined),
}));

jest.mock('../ics', () => ({
  ...jest.requireActual('../ics'),
  buildIcs: jest.fn(() => 'BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n'),
}));

beforeEach(() => {
  mockFile.exists = false;
});

describe('shareEventAsIcs', () => {
  it('writes the .ics into the cache directory and opens the share sheet', async () => {
    const event = makeEvent();
    await shareEventAsIcs(event);

    expect(File).toHaveBeenCalledWith('CACHE_DIR', 'Team_lunch.ics');
    expect(buildIcs).toHaveBeenCalledWith(event);
    expect(mockFile.create).toHaveBeenCalled();
    expect(mockFile.write).toHaveBeenCalledWith('BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n');
    expect(Sharing.shareAsync).toHaveBeenCalledWith('file:///cache/Team_lunch.ics', {
      mimeType: 'text/calendar',
      dialogTitle: 'Share event',
      UTI: 'com.apple.ical.ics',
    });
  });

  it('replaces a previously written file with the same name', async () => {
    mockFile.exists = true;
    await shareEventAsIcs(makeEvent());

    expect(mockFile.delete).toHaveBeenCalled();
    expect(mockFile.delete.mock.invocationCallOrder[0]).toBeLessThan(
      mockFile.create.mock.invocationCallOrder[0],
    );
  });

  it('does not delete anything when no previous file exists', async () => {
    await shareEventAsIcs(makeEvent());
    expect(mockFile.delete).not.toHaveBeenCalled();
  });

  it('throws without writing when sharing is unavailable', async () => {
    jest.mocked(Sharing.isAvailableAsync).mockResolvedValueOnce(false);

    await expect(shareEventAsIcs(makeEvent())).rejects.toThrow('Sharing is not available on this device');
    expect(mockFile.write).not.toHaveBeenCalled();
    expect(Sharing.shareAsync).not.toHaveBeenCalled();
  });
});

