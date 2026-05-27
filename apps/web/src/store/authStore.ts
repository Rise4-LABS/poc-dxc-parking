import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: { id: string; name: string; role: string } | null;
  setTokens: (access: string, refresh: string) => void;
  setUser: (user: AuthState['user']) => void;
  logout: () => void;
  refreshTokens: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
      setUser: (user) => set({ user }),
      logout: () => {
        const rt = get().refreshToken;
        if (rt) void fetch('/api/auth/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken: rt }) });
        set({ accessToken: null, refreshToken: null, user: null });
      },
      refreshTokens: async () => {
        const rt = get().refreshToken;
        if (!rt) return false;
        try {
          const res = await fetch('/api/auth/refresh', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken: rt }) });
          if (!res.ok) return false;
          const data = await res.json() as { accessToken: string; refreshToken: string };
          set({ accessToken: data.accessToken, refreshToken: data.refreshToken });
          return true;
        } catch { return false; }
      },
    }),
    { name: 'dxc-auth', partialize: (s) => ({ refreshToken: s.refreshToken, user: s.user }) },
  ),
);
