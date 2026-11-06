import { create } from 'zustand';

export interface ToastProps {
  title: string;
  description?: string;
  variant?: 'info' | 'success' | 'warning' | 'error';
}

interface UIState {
  sidebarOpen: boolean;
  toasts: (ToastProps & { id: number })[];
  pendingRequests: number;
  apiErrors: Record<string, string>;
  startRequest: () => void;
  finishRequest: () => void;
  setApiError: (path: string, error: string | null) => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  addToast: (toast: Omit<ToastProps, 'isOpen' | 'onClose'>) => void;
  removeToast: (id: number) => void;
}

let nextToastId = 0;

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  toasts: [],
  pendingRequests: 0,
  apiErrors: {},
  startRequest: () => set((state) => ({ pendingRequests: state.pendingRequests + 1 })),
  finishRequest: () => set((state) => ({ pendingRequests: Math.max(0, state.pendingRequests - 1) })),
  setApiError: (path, error) => set((state) => {
    const apiErrors = { ...state.apiErrors };
    if (error) apiErrors[path] = error;
    else delete apiErrors[path];
    return { apiErrors };
  }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  addToast: (toast) => {
    const id = ++nextToastId;
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));
    setTimeout(() => set((state) => ({ toasts: state.toasts.filter((item) => item.id !== id) })), 5000);
  },
  removeToast: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
}));
