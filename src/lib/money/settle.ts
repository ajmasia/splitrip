export type Balance = {
  participantId: string
  /** Positive means the group owes them; negative, that they owe the group. */
  netCents: number
}

export type Transfer = {
  fromParticipantId: string
  toParticipantId: string
  amountCents: number
}

/**
 * Greedy: whoever owes the most hands money to whoever is owed the most, as much as clears one of
 * the two. Every step settles somebody, so the proposal never holds more than one transfer fewer
 * than the number of people with something outstanding. Not always the shortest possible list —
 * that problem is NP-hard — but for a group of this size the difference is imperceptible.
 *
 * Ties go by identifier: the closing summary freezes this list, and it must not reshuffle itself
 * between two readings.
 */
export function settle(balances: readonly Balance[]): Transfer[] {
  for (const balance of balances) {
    if (!Number.isInteger(balance.netCents)) {
      throw new TypeError(
        `A balance must be a whole number of cents, got ${balance.netCents} for ${balance.participantId}`,
      )
    }
  }

  const total = balances.reduce((sum, balance) => sum + balance.netCents, 0)
  if (total !== 0) {
    throw new RangeError(`Balances must add up to zero, they add up to ${total}`)
  }

  const owed = new Map(
    balances.filter((balance) => balance.netCents !== 0).map((b) => [b.participantId, b.netCents]),
  )
  const transfers: Transfer[] = []

  for (;;) {
    const debtor = furthestFromZero(owed, -1)
    const creditor = furthestFromZero(owed, 1)
    if (debtor === undefined || creditor === undefined) break

    const amountCents = Math.min(-owed.get(debtor)!, owed.get(creditor)!)
    transfers.push({ fromParticipantId: debtor, toParticipantId: creditor, amountCents })

    settleBy(owed, debtor, amountCents)
    settleBy(owed, creditor, -amountCents)
  }

  return transfers
}

function furthestFromZero(owed: Map<string, number>, sign: 1 | -1): string | undefined {
  let found: string | undefined
  let bestAmount = 0

  for (const [participantId, netCents] of owed) {
    const amount = netCents * sign
    if (amount <= 0) continue
    if (amount > bestAmount || (amount === bestAmount && participantId < found!)) {
      found = participantId
      bestAmount = amount
    }
  }

  return found
}

function settleBy(owed: Map<string, number>, participantId: string, amountCents: number): void {
  const remaining = owed.get(participantId)! + amountCents
  if (remaining === 0) {
    owed.delete(participantId)
  } else {
    owed.set(participantId, remaining)
  }
}
