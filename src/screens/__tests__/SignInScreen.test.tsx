import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';

import SignInScreen from '../SignInScreen';
import { useAuth } from '../../auth/AuthContext';

jest.mock('../../auth/AuthContext', () => ({ useAuth: jest.fn() }));

const signIn = jest.fn();

beforeEach(() => {
  jest.mocked(useAuth).mockReturnValue({
    user: null,
    initializing: false,
    signIn,
    signOut: jest.fn(),
    getAccessToken: jest.fn(),
  });
});

describe('SignInScreen', () => {
  it('shows the app name and a sign-in button', async () => {
    await render(<SignInScreen />);
    expect(screen.getByText('ShareLendar')).toBeOnTheScreen();
    expect(screen.getByText('Sign in with Google')).toBeOnTheScreen();
  });

  it('calls signIn when the button is pressed', async () => {
    signIn.mockResolvedValueOnce(undefined);
    await render(<SignInScreen />);

    await fireEvent.press(screen.getByText('Sign in with Google'));

    expect(signIn).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Sign in with Google')).toBeOnTheScreen(); // spinner gone again
  });

  it('shows an alert when sign-in fails', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    signIn.mockRejectedValueOnce(new Error('DEVELOPER_ERROR'));
    await render(<SignInScreen />);

    await fireEvent.press(screen.getByText('Sign in with Google'));

    expect(alert).toHaveBeenCalledWith('Sign-in failed', 'DEVELOPER_ERROR');
    alert.mockRestore();
  });
});

