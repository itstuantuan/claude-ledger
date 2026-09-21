import { create } from 'zustand';
import { persist } from 'zustand/middleware';
export const useUiStore = create<{ collapsed: boolean; toggleSidebar: () => void }>()(persist((set) => ({
  collapsed: false, toggleSidebar: () => set((state) => ({ collapsed: !state.collapsed })),
}), { name: 'paint-store-ui-v1', skipHydration: true }));
