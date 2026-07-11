import type { MaterialIcons } from '@expo/vector-icons';
import { create } from 'zustand';

type IconName = React.ComponentProps<typeof MaterialIcons>['name'];

interface ToastState {
  message: string | null;
  icon: IconName | null;
  show: (message: string, icon?: IconName) => void;
  hide: () => void;
}

let hideTimer: ReturnType<typeof setTimeout> | null = null;

export const useToastStore = create<ToastState>((set) => ({
  message: null,
  icon: null,
  show: (message, icon = 'check-circle') => {
    if (hideTimer) clearTimeout(hideTimer);
    set({ message, icon });
    hideTimer = setTimeout(() => set({ message: null, icon: null }), 2200);
  },
  hide: () => {
    if (hideTimer) clearTimeout(hideTimer);
    set({ message: null, icon: null });
  },
}));
