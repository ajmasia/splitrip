/**
 * Splitting an amount of money between people, in whole cents.
 *
 * Money is never divided in floating point here: an amount is an integer number of cents from the
 * moment it is parsed until the moment it is displayed. What this module solves is the part that
 * integer arithmetic does not solve on its own — where the cents that do not divide evenly go.
 */

export type Share = {
  participantId: string
  amountCents: number
}

/**
 * Splits `amountCents` equally between the given participants.
 *
 * The rule: integer division, and the leftover cents handed out one by one to the first
 * participants in identifier order. Ordering rather than chance is what makes the split
 * reproducible — the same expense split twice charges the same people the same cents — and it is
 * why the shares are persisted rather than recomputed on the fly.
 *
 * Sorting is lexicographic on the identifier, which for canonical lowercase UUIDs is the same order
 * Postgres gives them. The database applies this same rule when it writes the shares, and the two
 * have to agree to the cent.
 *
 * The shares always add up to exactly `amountCents`. A share may legitimately be zero: one cent
 * between three people charges one of them a cent and the other two nothing.
 */
export function splitAmount(amountCents: number, participantIds: readonly string[]): Share[] {
  if (!Number.isInteger(amountCents)) {
    throw new TypeError(`An amount must be a whole number of cents, got ${amountCents}`)
  }
  if (amountCents <= 0) {
    throw new RangeError(`An amount must be greater than zero, got ${amountCents}`)
  }
  if (participantIds.length === 0) {
    throw new RangeError('An expense must be split between at least one participant')
  }
  if (new Set(participantIds).size !== participantIds.length) {
    throw new RangeError('An expense cannot charge the same participant twice')
  }

  const ordered = [...participantIds].sort()
  const base = Math.floor(amountCents / ordered.length)
  const leftover = amountCents - base * ordered.length

  return ordered.map((participantId, position) => ({
    participantId,
    amountCents: base + (position < leftover ? 1 : 0),
  }))
}

/** What a split charges in total. Equal to the expense amount, always. */
export function totalOf(shares: readonly Share[]): number {
  return shares.reduce((total, share) => total + share.amountCents, 0)
}
