import { create } from 'zustand';
import type { User } from '@/features/auth/schema';
type AuthState = { user: User | null; status: 'loading' | 'authenticated' | 'anonymous' | 'error'; error: string | null; setUser: (user: User) => void; clear: () => void; fail: (error: string) => void };
// Tokens and identities are intentionally never persisted to browser storage.
export const useAuthStore = create<AuthState>((set) => ({
  user: null, status: 'loading', error: null,
  setUser: (user) => set({ user, status: 'authenticated', error: null }),
  clear: () => set({ user: null, status: 'anonymous', error: null }),
  fail: (error) => set({ user: null, status: 'error', error }),
}));
