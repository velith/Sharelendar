import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import EventDetailScreen from '../EventDetailScreen';
import { shareEventAsIcs } from '../../utils/share';
import { makeAllDayEvent, makeEvent } from '../../test-utils/fixtures';
import type { CalendarEvent } from '../../api/googleCalendar';
import type { RootStackParamList } from '../../navigation/types';

jest.mock('../../utils/share', () => ({ shareEventAsIcs: jest.fn() }));

type Props = NativeStackScreenProps<RootStackParamList, 'EventDetail'>;

async function renderScreen(event: CalendarEvent) {
  const route = { key: 'EventDetail-1', name: 'EventDetail', params: { event } } as Props['route'];
  await render(<EventDetailScreen navigation={{} as Props['navigation']} route={route} />);
}

describe('EventDetailScreen', () => {
  it('shows all event details', async () => {
    await renderScreen(makeEvent());

    expect(screen.getByText('Team lunch')).toBeOnTheScreen();
    expect(screen.getByText('Date')).toBeOnTheScreen();
    expect(screen.getByText('Time')).toBeOnTheScreen();
    expect(screen.getByText('Cafe Central')).toBeOnTheScreen();
    expect(screen.getByText('The Boss')).toBeOnTheScreen();
    expect(screen.getByText('Bring your appetite')).toBeOnTheScreen();
  });

  it('hides optional fields that are missing', async () => {
    await renderScreen(
      makeAllDayEvent({ location: undefined, description: undefined, organizer: undefined }),
    );

    expect(screen.getByText('All day')).toBeOnTheScreen();
    expect(screen.queryByText('Location')).toBeNull();
    expect(screen.queryByText('Organizer')).toBeNull();
    expect(screen.queryByText('Description')).toBeNull();
  });

  it('falls back to the organizer email when there is no display name', async () => {
    await renderScreen(makeEvent({ organizer: { email: 'boss@example.com' } }));
    expect(screen.getByText('boss@example.com')).toBeOnTheScreen();
  });

  it('shares the event as .ics when Share is pressed', async () => {
    const event = makeEvent();
    jest.mocked(shareEventAsIcs).mockResolvedValueOnce(undefined);
    await renderScreen(event);

    await fireEvent.press(screen.getByText('Share'));

    expect(shareEventAsIcs).toHaveBeenCalledWith(event);
    expect(screen.getByText('Share')).toBeOnTheScreen(); // button restored after sharing
  });

  it('shows an alert when sharing fails', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    jest.mocked(shareEventAsIcs).mockRejectedValueOnce(new Error('Sharing is not available on this device'));
    await renderScreen(makeEvent());

    await fireEvent.press(screen.getByText('Share'));

    expect(alert).toHaveBeenCalledWith('Could not share', 'Sharing is not available on this device');
    alert.mockRestore();
  });
});

