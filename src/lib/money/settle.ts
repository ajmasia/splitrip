/**
 * Turning balances into an answer somebody can act on.
 *
 * Knowing that Virginia is 38.85 short is not useful on its own; knowing that she should hand
 * 38.85 to Marta is. This module does that conversion, and nothing else.
 */

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
 * Proposes the transfers that bring every balance to zero.
 *
 * Greedy: the person who owes the most hands money to the person who is owed the most, as much as
 * clears one of the two, and so on. Every step settles somebody completely, so the proposal never
 * holds more than one transfer fewer than the number of people with something outstanding.
 *
 * This is not guaranteed to be the shortest possible list — finding that is NP-hard — but for a
 * group of this size it is optimal or within a transfer of it, and nobody can perceive the
 * difference between four transfers and the four transfers that a slower algorithm would find.
 *
 * Ties are broken by identifier so that the same balances always produce the same proposal. The
 * closing summary freezes this list, and a proposal that reshuffled itself between two readings
 * would be worse than useless.
 *
 * Balances must add up to zero, which is what the data guarantees: every shared expense is charged
 * in full to somebody and every payment is both sent and received. A set that does not add up is a
 * bug somewhere upstream, and it is reported here rather than quietly settled into nonsense.
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

/**
 * The largest outstanding balance on one side, `1` for the creditors and `-1` for the debtors.
 * Ties go to the lowest identifier, so the choice never depends on iteration order.
 */
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
