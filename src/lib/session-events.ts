// Puente independiente de React para respuestas 401 de recursos protegidos.
const listeners = new Set<() => void>()
export function notifySessionExpired() {
  for (const listener of listeners) listener()
}
export function onSessionExpired(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
