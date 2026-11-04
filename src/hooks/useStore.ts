import { create } from 'zustand';

export interface ToastProps {
  title: string;
  description?: string;
  variant?: 'info' | 'success' | 'warning' | 'error';
}

interface UIState {
  sidebarOpen: boolean;
  toasts: ToastProps[];
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  addToast: (toast: Omit<ToastProps, 'isOpen' | 'onClose'>) => void;
  removeToast: (index: number) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  toasts: [],
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  addToast: (toast) => {
    set((state) => ({ toasts: [...state.toasts, toast] }));
    setTimeout(() => set((state) => ({ toasts: state.toasts.slice(0, -1) })), 5000);
  },
  removeToast: (index) => set((state) => ({ toasts: state.toasts.filter((_, i) => i !== index) })),
}));
