import { create } from "zustand"

export interface Notification {
  id: string
  type: "error" | "warn" | "info"
  message: string
}

interface NotificationState {
  notifications: Notification[]
  push: (n: Omit<Notification, "id">) => void
  dismiss: (id: string) => void
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],

  push: (n) => {
    const id = crypto.randomUUID()
    set((state) => ({ notifications: [...state.notifications, { ...n, id }] }))
    setTimeout(() => {
      set((state) => ({
        notifications: state.notifications.filter((x) => x.id !== id),
      }))
    }, 5000)
  },

  dismiss: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),
}))
