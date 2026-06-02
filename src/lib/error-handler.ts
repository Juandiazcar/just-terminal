import { useNotificationStore } from "@/store/notification.store"

export function handleCommandError(context: string, error: unknown): void {
  const message = typeof error === "string" ? error : "Unknown error"
  console.error(`[${context}] ${message}`)
  useNotificationStore.getState().push({ type: "error", message: `${context}: ${message}` })
}

export function handleCommandWarn(context: string, message: string): void {
  console.warn(`[${context}] ${message}`)
  useNotificationStore.getState().push({ type: "warn", message: `${context}: ${message}` })
}
