export const FEEDBACK_KINDS = ['bug', 'idea', 'other'] as const

export type FeedbackKind = (typeof FEEDBACK_KINDS)[number]

/** The same limit the database enforces; the form says it, the database is what holds it. */
export const FEEDBACK_MAX_LENGTH = 2000

const MAX_PATH_LENGTH = 512

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isFeedbackKind(candidate: string): candidate is FeedbackKind {
  return (FEEDBACK_KINDS as readonly string[]).includes(candidate)
}

/**
 * A screen of ours, or nothing. Whatever arrives in `from` was put there by a browser, so it is kept
 * only when it is a path within the application: `//host` and `/\host` look like one and are read
 * by browsers as another site.
 */
export function applicationPath(candidate: string | null | undefined): string | null {
  if (typeof candidate !== 'string' || candidate.length > MAX_PATH_LENGTH) return null
  if (!candidate.startsWith('/') || candidate.startsWith('//') || candidate.startsWith('/\\')) {
    return null
  }

  return candidate
}

/** The trip a screen belongs to, read from its path: `/trips/<id>` and everything under it. */
export function tripIdFromPath(path: string): string | null {
  const [, first, second] = path.split('/')
  return first === 'trips' && second !== undefined && UUID.test(second) ? second : null
}

/** A trip identifier as the form sent it, or nothing when it is not one. */
export function tripIdOrNull(candidate: string | null | undefined): string | null {
  return typeof candidate === 'string' && UUID.test(candidate) ? candidate : null
}

/** Where the feedback link leads from a given screen. */
export function feedbackHref(path: string): string {
  const query = new URLSearchParams({ from: path })
  const tripId = tripIdFromPath(path)
  if (tripId !== null) query.set('trip', tripId)

  return `/feedback?${query.toString()}`
}
