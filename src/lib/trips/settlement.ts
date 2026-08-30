import { settle } from '@/lib/money/settle'
import type { ParticipantBalance } from '@/lib/trips/queries'

export type SettlementLine = {
  fromParticipantId: string
  toParticipantId: string
  fromName: string
  toName: string
  amountCents: number
  /** Whether the reader is one of the two, and on which side. `null` when the line is not theirs. */
  yours: 'pay' | 'collect' | null
}

/**
 * The transfers that clear the trip, with names on them.
 *
 * The arithmetic is `settle`'s and is not repeated here: this only turns identifiers into the
 * people they stand for, and marks the lines the reader is party to, which are the ones they came
 * to the screen for.
 */
export function planFor(balances: readonly ParticipantBalance[]): SettlementLine[] {
  const named = new Map(balances.map((balance) => [balance.participantId, balance]))

  return settle(
    balances.map((balance) => ({
      participantId: balance.participantId,
      netCents: balance.netCents,
    })),
  ).map((transfer) => {
    const from = named.get(transfer.fromParticipantId)
    const to = named.get(transfer.toParticipantId)

    return {
      fromParticipantId: transfer.fromParticipantId,
      toParticipantId: transfer.toParticipantId,
      fromName: from?.displayName ?? '',
      toName: to?.displayName ?? '',
      amountCents: transfer.amountCents,
      yours: from?.isYou ? 'pay' : to?.isYou ? 'collect' : null,
    }
  })
}
