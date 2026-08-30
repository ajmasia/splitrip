/**
 * Whether the trip on screen is receiving live changes.
 *
 * It is a module-level value rather than a context because of who needs it: the subscription lives
 * on a trip screen and the notice lives in the shell, on the other side of the document, and a
 * provider wrapping the whole application to carry one boolean between them would be ceremony for
 * its own sake.
 *
 * The default is `true` — a screen with no subscription at all is not "disconnected", it simply has
 * nothing to be connected to, and saying otherwise would put a warning on the sign-in page.
 */
let live = true

const listeners = new Set<() => void>()

export function setLiveConnection(next: boolean): void {
  if (next === live) return
  live = next
  for (const listener of listeners) listener()
}

export function subscribeToLiveConnection(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getLiveConnection(): boolean {
  return live
}

/** The server renders before any socket exists, and it must not disagree with the first paint. */
export function getLiveConnectionOnServer(): boolean {
  return true
}
