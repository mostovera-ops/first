import { create } from 'zustand';

interface UIState {
  accountOpen: boolean;
  openAccount: () => void;
  closeAccount: () => void;
}

export const useUI = create<UIState>((set) => ({
  accountOpen: false,
  openAccount: () => set({ accountOpen: true }),
  closeAccount: () => set({ accountOpen: false }),
}));
