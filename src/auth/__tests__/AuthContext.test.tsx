import React from 'react';
import { act, renderHook } from '@testing-library/react-native';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

import { AuthProvider, CALENDAR_SCOPE, useAuth } from '../AuthContext';
import { testUser } from '../../test-utils/fixtures';

// configure() runs at import time; capture it before clearMocks wipes the call log.
const configureCalls = [...jest.mocked(GoogleSignin.configure).mock.calls];

const gs = jest.mocked(GoogleSignin);
const wrapper = ({ children }: { children: React.ReactNode }) => <AuthProvider>{children}</AuthProvider>;

async function renderAuth() {
  const hook = await renderHook(() => useAuth(), { wrapper });
  // Let the silent sign-in effect settle.
  await act(async () => {});
  return hook;
}

describe('AuthContext', () => {
  it('configures Google Sign-In with the read-only Calendar scope', () => {
    expect(configureCalls).toHaveLength(1);
    expect(configureCalls[0][0]).toEqual(expect.objectContaining({ scopes: [CALENDAR_SCOPE] }));
    expect(CALENDAR_SCOPE).toBe('https://www.googleapis.com/auth/calendar.readonly');
  });

  it('finishes initializing signed out when there is no previous session', async () => {
    gs.hasPreviousSignIn.mockReturnValueOnce(false);
    const { result } = await renderAuth();

    expect(result.current.initializing).toBe(false);
    expect(result.current.user).toBeNull();
    expect(gs.signInSilently).not.toHaveBeenCalled();
  });

  it('restores a previous session silently', async () => {
    gs.hasPreviousSignIn.mockReturnValueOnce(true);
    gs.signInSilently.mockResolvedValueOnce({ type: 'success', data: testUser });
    const { result } = await renderAuth();

    expect(result.current.initializing).toBe(false);
    expect(result.current.user).toEqual(testUser);
  });

  it('stays signed out if silent sign-in throws', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    gs.hasPreviousSignIn.mockReturnValueOnce(true);
    gs.signInSilently.mockRejectedValueOnce(new Error('network'));
    const { result } = await renderAuth();

    expect(result.current.initializing).toBe(false);
    expect(result.current.user).toBeNull();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('signIn checks Play services and stores the user on success', async () => {
    gs.signIn.mockResolvedValueOnce({ type: 'success', data: testUser });
    const { result } = await renderAuth();

    await act(() => result.current.signIn());

    expect(gs.hasPlayServices).toHaveBeenCalledWith({ showPlayServicesUpdateDialog: true });
    expect(result.current.user).toEqual(testUser);
  });

  it('signIn leaves the user signed out when cancelled', async () => {
    gs.signIn.mockResolvedValueOnce({ type: 'cancelled', data: null });
    const { result } = await renderAuth();

    await act(() => result.current.signIn());

    expect(result.current.user).toBeNull();
  });

  it('signIn ignores IN_PROGRESS errors', async () => {
    gs.signIn.mockRejectedValueOnce(Object.assign(new Error('busy'), { code: 'IN_PROGRESS' }));
    const { result } = await renderAuth();

    await expect(act(() => result.current.signIn())).resolves.toBeUndefined();
  });

  it('signIn rethrows other errors', async () => {
    gs.signIn.mockRejectedValueOnce(Object.assign(new Error('no play services'), { code: 'PLAY_SERVICES_NOT_AVAILABLE' }));
    const { result } = await renderAuth();

    await expect(act(() => result.current.signIn())).rejects.toThrow('no play services');
  });

  it('signOut clears the user', async () => {
    gs.hasPreviousSignIn.mockReturnValueOnce(true);
    gs.signInSilently.mockResolvedValueOnce({ type: 'success', data: testUser });
    const { result } = await renderAuth();
    expect(result.current.user).not.toBeNull();

    await act(() => result.current.signOut());

    expect(gs.signOut).toHaveBeenCalled();
    expect(result.current.user).toBeNull();
  });

  it('getAccessToken returns the current access token', async () => {
    gs.getTokens.mockResolvedValueOnce({ accessToken: 'fresh-token', idToken: 'id' });
    const { result } = await renderAuth();

    await expect(result.current.getAccessToken()).resolves.toBe('fresh-token');
  });

  it('useAuth throws outside of an AuthProvider', async () => {
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(renderHook(() => useAuth())).rejects.toThrow('useAuth must be used inside <AuthProvider>');
    error.mockRestore();
  });
});

