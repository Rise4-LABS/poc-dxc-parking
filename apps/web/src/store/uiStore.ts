import { create } from 'zustand';

export type Tab = 'reservation' | 'my-bookings' | 'planning' | 'users' | 'logs';

interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface UiState {
  activeTab: Tab;
  toasts: ToastItem[];
  setActiveTab: (tab: Tab) => void;
  addToast: (message: string, type?: ToastItem['type']) => void;
  removeToast: (id: string) => void;
}

export const useUiStore = create<UiState>((set) => ({
  activeTab: 'reservation',
  toasts: [],
  setActiveTab: (activeTab) => set({ activeTab }),
  addToast: (message, type = 'info') => {
    const id = crypto.randomUUID();
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 5000);
  },
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
