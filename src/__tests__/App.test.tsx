import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

import App from '../App';
import { shareEventAsIcs } from '../utils/share';
import { jsonResponse, makeEvent, testUser } from '../test-utils/fixtures';

jest.mock('../utils/share', () => ({ shareEventAsIcs: jest.fn(async () => undefined) }));

const gs = jest.mocked(GoogleSignin);
const fetchMock = jest.fn();

beforeAll(() => {
  global.fetch = fetchMock as unknown as typeof fetch;
});

afterEach(() => fetchMock.mockReset());

/**
 * End-to-end flow through real navigation: sign in → list → detail → share.
 * Only the native boundaries (Google Sign-In, fetch, file sharing) are mocked.
 */
describe('App', () => {
  it('shows the sign-in screen when there is no previous session', async () => {
    await render(<App />);
    expect(await screen.findByText('Sign in with Google')).toBeOnTheScreen();
  });

  it('goes from sign-in to the event list to the detail view and shares', async () => {
    const event = makeEvent();
    gs.signIn.mockResolvedValueOnce({ type: 'success', data: testUser });
    fetchMock.mockResolvedValueOnce(jsonResponse({ items: [event] }));

    await render(<App />);
    await fireEvent.press(await screen.findByText('Sign in with Google'));

    await fireEvent.press(await screen.findByText('Team lunch'));
    expect(await screen.findByText('Cafe Central')).toBeOnTheScreen();

    await fireEvent.press(screen.getByText('Share'));
    expect(shareEventAsIcs).toHaveBeenCalledWith(event);
  });

  it('skips sign-in when a previous session is restored', async () => {
    gs.hasPreviousSignIn.mockReturnValueOnce(true);
    gs.signInSilently.mockResolvedValueOnce({ type: 'success', data: testUser });
    fetchMock.mockResolvedValueOnce(jsonResponse({ items: [makeEvent({ summary: 'Restored' })] }));

    await render(<App />);

    expect(await screen.findByText('Restored')).toBeOnTheScreen();
    expect(screen.queryByText('Sign in with Google')).toBeNull();
  });
});

