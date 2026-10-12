import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  GoogleSignin,
  isErrorWithCode,
  statusCodes,
  type User,
} from '@react-native-google-signin/google-signin';

export const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.readonly';

GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  scopes: [CALENDAR_SCOPE],
});

type AuthContextValue = {
  user: User | null;
  initializing: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  /** Returns a fresh OAuth access token (refreshed by Google Play services if needed). */
  getAccessToken: () => Promise<string>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);

  // Restore a previous session on app start.
  useEffect(() => {
    (async () => {
      try {
        if (GoogleSignin.hasPreviousSignIn()) {
          const res = await GoogleSignin.signInSilently();
          if (res.type === 'success') setUser(res.data);
        }
      } catch (e) {
        console.warn('Silent sign-in failed', e);
      } finally {
        setInitializing(false);
      }
    })();
  }, []);

  const signIn = useCallback(async () => {
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const res = await GoogleSignin.signIn();
      if (res.type === 'success') setUser(res.data);
    } catch (e) {
      if (isErrorWithCode(e) && e.code === statusCodes.IN_PROGRESS) return;
      throw e;
    }
  }, []);

  const signOut = useCallback(async () => {
    await GoogleSignin.signOut();
    setUser(null);
  }, []);

  const getAccessToken = useCallback(async () => {
    const { accessToken } = await GoogleSignin.getTokens();
    return accessToken;
  }, []);

  const value = useMemo(
    () => ({ user, initializing, signIn, signOut, getAccessToken }),
    [user, initializing, signIn, signOut, getAccessToken],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

