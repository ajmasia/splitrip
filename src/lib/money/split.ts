export type Share = {
  participantId: string
  amountCents: number
}

/**
 * Integer division, with the leftover cents handed out one by one in identifier order — the order
 * Postgres gives them too, since the database applies this same rule when it writes the shares.
 * Sorting rather than luck is what lets the same expense be split twice and charge the same people
 * the same cents.
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

export function totalOf(shares: readonly Share[]): number {
  return shares.reduce((total, share) => total + share.amountCents, 0)
}
