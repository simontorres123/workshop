import { create } from 'zustand';

interface UIState {
  isSidebarOpen: boolean;
  isModalOpen: boolean;
  modalContent: React.ReactNode | null;

  toggleSidebar: () => void;
  openModal: (content: React.ReactNode) => void;
  closeModal: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isSidebarOpen: true,
  isModalOpen: false,
  modalContent: null,

  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

  openModal: (content) => set({ isModalOpen: true, modalContent: content }),

  closeModal: () => set({ isModalOpen: false, modalContent: null }),
}));
