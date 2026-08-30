import { describe, expect, it } from 'vitest'

import type { Balance, Transfer } from './settle'
import { settle } from './settle'

/** What the balances look like once the proposed transfers have actually been made. */
function apply(balances: readonly Balance[], transfers: readonly Transfer[]): Balance[] {
  const after = new Map(balances.map((balance) => [balance.participantId, balance.netCents]))

  for (const transfer of transfers) {
    after.set(
      transfer.fromParticipantId,
      after.get(transfer.fromParticipantId)! + transfer.amountCents,
    )
    after.set(transfer.toParticipantId, after.get(transfer.toParticipantId)! - transfer.amountCents)
  }

  return [...after].map(([participantId, netCents]) => ({ participantId, netCents }))
}

const outstanding = (balances: readonly Balance[]): number =>
  balances.filter((balance) => balance.netCents !== 0).length

describe('settle', () => {
  it('settles the case in the specification', () => {
    const balances: Balance[] = [
      { participantId: 'ana', netCents: 6000 },
      { participantId: 'beto', netCents: -4000 },
      { participantId: 'carla', netCents: -2000 },
    ]

    expect(settle(balances)).toEqual([
      { fromParticipantId: 'beto', toParticipantId: 'ana', amountCents: 4000 },
      { fromParticipantId: 'carla', toParticipantId: 'ana', amountCents: 2000 },
    ])
  })

  it('proposes nothing when nobody owes anybody', () => {
    expect(
      settle([
        { participantId: 'ana', netCents: 0 },
        { participantId: 'beto', netCents: 0 },
      ]),
    ).toEqual([])
  })

  it('proposes nothing for a trip with no expenses at all', () => {
    expect(settle([])).toEqual([])
  })

  it('clears a debt that matches its credit exactly with one transfer', () => {
    expect(
      settle([
        { participantId: 'ana', netCents: 4000 },
        { participantId: 'beto', netCents: -4000 },
      ]),
    ).toEqual([{ fromParticipantId: 'beto', toParticipantId: 'ana', amountCents: 4000 }])
  })

  it('settles the trip to Alsace', () => {
    // The balances the sample trip in `supabase/seed.sql` produces.
    const balances: Balance[] = [
      { participantId: 'marta', netCents: 16853 },
      { participantId: 'yvonne', netCents: 15578 },
      { participantId: 'sonia', netCents: -995 },
      { participantId: 'virginia', netCents: -3885 },
      { participantId: 'francisca', netCents: -27551 },
    ]

    const transfers = settle(balances)

    expect(transfers).toEqual([
      { fromParticipantId: 'francisca', toParticipantId: 'marta', amountCents: 16853 },
      { fromParticipantId: 'francisca', toParticipantId: 'yvonne', amountCents: 10698 },
      { fromParticipantId: 'virginia', toParticipantId: 'yvonne', amountCents: 3885 },
      { fromParticipantId: 'sonia', toParticipantId: 'yvonne', amountCents: 995 },
    ])
    expect(transfers.length).toBeLessThanOrEqual(outstanding(balances) - 1)
    expect(apply(balances, transfers).every((balance) => balance.netCents === 0)).toBe(true)
  })

  it('leaves everybody at zero, and never proposes more transfers than it may', () => {
    const cases: Balance[][] = [
      [
        { participantId: 'a', netCents: 1 },
        { participantId: 'b', netCents: -1 },
      ],
      [
        { participantId: 'a', netCents: 10000 },
        { participantId: 'b', netCents: -2500 },
        { participantId: 'c', netCents: -2500 },
        { participantId: 'd', netCents: -2500 },
        { participantId: 'e', netCents: -2500 },
      ],
      [
        { participantId: 'a', netCents: 3333 },
        { participantId: 'b', netCents: 3333 },
        { participantId: 'c', netCents: 3334 },
        { participantId: 'd', netCents: -10000 },
      ],
      [
        { participantId: 'a', netCents: 5 },
        { participantId: 'b', netCents: -1 },
        { participantId: 'c', netCents: -1 },
        { participantId: 'd', netCents: -1 },
        { participantId: 'e', netCents: -1 },
        { participantId: 'f', netCents: -1 },
      ],
    ]

    for (const balances of cases) {
      const transfers = settle(balances)

      expect(apply(balances, transfers).every((balance) => balance.netCents === 0)).toBe(true)
      expect(transfers.length).toBeLessThanOrEqual(outstanding(balances) - 1)
      expect(transfers.every((transfer) => transfer.amountCents > 0)).toBe(true)
      expect(
        transfers.every((transfer) => transfer.fromParticipantId !== transfer.toParticipantId),
      ).toBe(true)
    }
  })

  it('proposes the same transfers however the balances arrive', () => {
    const balances: Balance[] = [
      { participantId: 'ana', netCents: 6000 },
      { participantId: 'beto', netCents: -4000 },
      { participantId: 'carla', netCents: -2000 },
    ]

    expect(settle([...balances].reverse())).toEqual(settle(balances))
  })

  it('breaks a tie by identifier rather than by iteration order', () => {
    const balances: Balance[] = [
      { participantId: 'zoe', netCents: -1000 },
      { participantId: 'ana', netCents: -1000 },
      { participantId: 'beto', netCents: 2000 },
    ]

    expect(settle(balances)[0]?.fromParticipantId).toBe('ana')
    expect(settle([...balances].reverse())).toEqual(settle(balances))
  })

  it('leaves out those who owe and are owed nothing', () => {
    const transfers = settle([
      { participantId: 'ana', netCents: 1000 },
      { participantId: 'beto', netCents: -1000 },
      { participantId: 'carla', netCents: 0 },
    ])

    expect(transfers.flatMap((t) => [t.fromParticipantId, t.toParticipantId])).not.toContain(
      'carla',
    )
  })

  it('refuses balances that do not add up to zero', () => {
    expect(() =>
      settle([
        { participantId: 'ana', netCents: 1000 },
        { participantId: 'beto', netCents: -900 },
      ]),
    ).toThrow(RangeError)
  })

  it('refuses a balance that is not a whole number of cents', () => {
    expect(() =>
      settle([
        { participantId: 'ana', netCents: 10.5 },
        { participantId: 'beto', netCents: -10.5 },
      ]),
    ).toThrow(TypeError)
  })
})
