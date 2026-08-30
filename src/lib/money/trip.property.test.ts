import fc from 'fast-check'
import { describe, expect, it } from 'vitest'

import type { Balance } from './settle'
import { settle } from './settle'
import { splitAmount, totalOf } from './split'

type Expense = {
  type: 'shared' | 'contribution'
  amountCents: number
  paidBy: string
  splitBetween: string[]
}

type Payment = { fromParticipantId: string; toParticipantId: string; amountCents: number }

type Trip = { participantIds: string[]; expenses: Expense[]; payments: Payment[] }

const anyTrip: fc.Arbitrary<Trip> = fc
  .integer({ min: 1, max: 8 })
  .map((heads) => Array.from({ length: heads }, (_, index) => `p${String(index).padStart(2, '0')}`))
  .chain((participantIds) =>
    fc.record({
      participantIds: fc.constant(participantIds),
      expenses: fc.array(
        fc.record({
          type: fc.constantFrom<'shared' | 'contribution'>('shared', 'contribution'),
          amountCents: fc.integer({ min: 1, max: 500_000 }),
          paidBy: fc.constantFrom(...participantIds),
          splitBetween: fc.subarray(participantIds, { minLength: 1 }),
        }),
        { maxLength: 25 },
      ),
      payments:
        participantIds.length < 2
          ? fc.constant([])
          : fc.array(
              fc
                .tuple(
                  fc.subarray(participantIds, { minLength: 2, maxLength: 2 }),
                  fc.integer({ min: 1, max: 200_000 }),
                )
                .map(([[fromParticipantId, toParticipantId], amountCents]) => ({
                  fromParticipantId: fromParticipantId!,
                  toParticipantId: toParticipantId!,
                  amountCents,
                })),
              { maxLength: 15 },
            ),
    }),
  )

function balancesOf({ participantIds, expenses, payments }: Trip): Balance[] {
  const net = new Map(participantIds.map((participantId) => [participantId, 0]))
  const add = (participantId: string, cents: number) =>
    net.set(participantId, net.get(participantId)! + cents)

  for (const expense of expenses) {
    if (expense.type === 'contribution') continue

    add(expense.paidBy, expense.amountCents)
    for (const share of splitAmount(expense.amountCents, expense.splitBetween)) {
      add(share.participantId, -share.amountCents)
    }
  }

  for (const payment of payments) {
    add(payment.fromParticipantId, payment.amountCents)
    add(payment.toParticipantId, -payment.amountCents)
  }

  return [...net].map(([participantId, netCents]) => ({ participantId, netCents }))
}

describe('any trip at all', () => {
  it('charges the shares of an expense to the cent', () => {
    fc.assert(
      fc.property(anyTrip, ({ expenses }) => {
        for (const expense of expenses) {
          expect(totalOf(splitAmount(expense.amountCents, expense.splitBetween))).toBe(
            expense.amountCents,
          )
        }
      }),
    )
  })

  it('leaves the balances adding up to exactly zero', () => {
    fc.assert(
      fc.property(anyTrip, (trip) => {
        const total = balancesOf(trip).reduce((sum, balance) => sum + balance.netCents, 0)

        expect(total).toBe(0)
      }),
    )
  })

  it('can be settled, and settling it leaves nobody owing anybody', () => {
    fc.assert(
      fc.property(anyTrip, (trip) => {
        const balances = balancesOf(trip)
        const transfers = settle(balances)

        const after = new Map(balances.map((b) => [b.participantId, b.netCents]))
        for (const transfer of transfers) {
          after.set(
            transfer.fromParticipantId,
            after.get(transfer.fromParticipantId)! + transfer.amountCents,
          )
          after.set(
            transfer.toParticipantId,
            after.get(transfer.toParticipantId)! - transfer.amountCents,
          )
        }

        expect([...after.values()].every((netCents) => netCents === 0)).toBe(true)
      }),
    )
  })

  it('never proposes more transfers than it is allowed to', () => {
    fc.assert(
      fc.property(anyTrip, (trip) => {
        const balances = balancesOf(trip)
        const outstanding = balances.filter((balance) => balance.netCents !== 0).length

        expect(settle(balances).length).toBeLessThanOrEqual(Math.max(outstanding - 1, 0))
      }),
    )
  })

  it('never proposes a transfer of nothing, or one to oneself', () => {
    fc.assert(
      fc.property(anyTrip, (trip) => {
        for (const transfer of settle(balancesOf(trip))) {
          expect(transfer.amountCents).toBeGreaterThan(0)
          expect(transfer.fromParticipantId).not.toBe(transfer.toParticipantId)
        }
      }),
    )
  })

  it('proposes the same settlement however the balances are ordered', () => {
    fc.assert(
      fc.property(anyTrip, (trip) => {
        const balances = balancesOf(trip)

        expect(settle([...balances].reverse())).toEqual(settle(balances))
      }),
    )
  })
})
