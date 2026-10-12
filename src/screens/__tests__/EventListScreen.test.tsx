import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import EventListScreen from '../EventListScreen';
import { useAuth } from '../../auth/AuthContext';
import { listEvents } from '../../api/googleCalendar';
import { makeAllDayEvent, makeEvent } from '../../test-utils/fixtures';
import type { RootStackParamList } from '../../navigation/types';

jest.mock('../../auth/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../../api/googleCalendar', () => ({ listEvents: jest.fn() }));

type Props = NativeStackScreenProps<RootStackParamList, 'EventList'>;

const getAccessToken = jest.fn(async () => 'tok');
const signOut = jest.fn();
const navigation = { navigate: jest.fn(), setOptions: jest.fn() };
const route = { key: 'EventList-1', name: 'EventList' } as Props['route'];

async function renderScreen() {
  await render(<EventListScreen navigation={navigation as unknown as Props['navigation']} route={route} />);
}

beforeEach(() => {
  jest.mocked(useAuth).mockReturnValue({
    user: null,
    initializing: false,
    signIn: jest.fn(),
    signOut,
    getAccessToken,
  });
});

describe('EventListScreen', () => {
  it('loads events with the access token and lists title, date and time', async () => {
    jest.mocked(listEvents).mockResolvedValueOnce([makeEvent(), makeAllDayEvent()]);
    await renderScreen();

    expect(await screen.findByText('Team lunch')).toBeOnTheScreen();
    expect(screen.getByText('Holiday')).toBeOnTheScreen();
    expect(screen.getByText(/All day$/)).toBeOnTheScreen();
    expect(listEvents).toHaveBeenCalledWith('tok');
  });

  it('shows a placeholder for untitled events', async () => {
    jest.mocked(listEvents).mockResolvedValueOnce([makeEvent({ summary: undefined })]);
    await renderScreen();

    expect(await screen.findByText('(No title)')).toBeOnTheScreen();
  });

  it('navigates to the detail screen when an event is tapped', async () => {
    const event = makeEvent();
    jest.mocked(listEvents).mockResolvedValueOnce([event]);
    await renderScreen();

    await fireEvent.press(await screen.findByText('Team lunch'));

    expect(navigation.navigate).toHaveBeenCalledWith('EventDetail', { event });
  });

  it('shows an empty state when there are no events', async () => {
    jest.mocked(listEvents).mockResolvedValueOnce([]);
    await renderScreen();

    expect(await screen.findByText('No events found.')).toBeOnTheScreen();
  });

  it('shows the error message when loading fails', async () => {
    jest.mocked(listEvents).mockRejectedValueOnce(new Error('Calendar API error 403: forbidden'));
    await renderScreen();

    expect(await screen.findByText('Calendar API error 403: forbidden')).toBeOnTheScreen();
  });

  it('reloads events on pull-to-refresh', async () => {
    jest
      .mocked(listEvents)
      .mockResolvedValueOnce([makeEvent({ summary: 'Old event' })])
      .mockResolvedValueOnce([makeEvent({ summary: 'New event' })]);
    await renderScreen();
    await screen.findByText('Old event');

    const scrollView = screen.container.queryAll((node) => node.type === 'RCTScrollView')[0];
    expect(scrollView?.props.refreshControl).toBeDefined();
    await act(async () => {
      await scrollView.props.refreshControl.props.onRefresh();
    });

    expect(screen.getByText('New event')).toBeOnTheScreen();
    expect(screen.queryByText('Old event')).toBeNull();
    expect(listEvents).toHaveBeenCalledTimes(2);
  });

  it('adds a "Sign out" header button that signs the user out', async () => {
    jest.mocked(listEvents).mockResolvedValueOnce([]);
    await renderScreen();

    const { headerRight } = navigation.setOptions.mock.calls[0][0];
    await render(headerRight());
    await fireEvent.press(screen.getByText('Sign out'));

    expect(signOut).toHaveBeenCalled();
  });
});

