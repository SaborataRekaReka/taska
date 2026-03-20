import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string | null;
  provider: 'LOCAL' | 'GOOGLE';
  avatarUrl: string | null;
  givenName: string | null;
  familyName: string | null;
  emailVerified: boolean;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  setAuth: (user: AuthUser, accessToken: string, refreshToken: string) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      setAuth: (user, accessToken, refreshToken) =>
        set({ user, accessToken, refreshToken }),
      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken }),
      logout: () => set({ user: null, accessToken: null, refreshToken: null }),
    }),
    {
      name: 'taska-auth',
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<AuthState> | undefined;

        // Prevent late hydration from overwriting a fresh in-memory auth session
        // (can happen right after OAuth callback on first load).
        if (currentState.user || currentState.accessToken || currentState.refreshToken) {
          return { ...persisted, ...currentState };
        }

        return { ...currentState, ...persisted };
      },
    },
  ),
);
