/**
 * How much has happened on the trip that the reader has not looked at.
 *
 * A module-level store for the same reason the live-connection one is: the subscription that counts
 * and the badge that shows the count are on opposite sides of the tree, and the count has to
 * survive a `router.refresh()`, which resets React state but not this.
 */
type Unseen = { tripId: string | null; count: number }

let unseen: Unseen = { tripId: null, count: 0 }

const listeners = new Set<() => void>()

function announce() {
  for (const listener of listeners) listener()
}

/** Opening another trip starts its own count: a badge from the last one would be a lie. */
export function noteActivity(tripId: string): void {
  unseen = unseen.tripId === tripId ? { tripId, count: unseen.count + 1 } : { tripId, count: 1 }
  announce()
}

export function clearActivity(tripId: string): void {
  if (unseen.tripId === tripId && unseen.count === 0) return
  unseen = { tripId, count: 0 }
  announce()
}

export function subscribeToActivity(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getUnseenActivity(): Unseen {
  return unseen
}

const NONE: Unseen = { tripId: null, count: 0 }

/** The server has no idea what this reader has seen, and must not guess on the first paint. */
export function getUnseenActivityOnServer(): Unseen {
  return NONE
}
