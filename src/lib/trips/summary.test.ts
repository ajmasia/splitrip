import { describe, expect, it } from 'vitest'

import { readClosingSummary } from './summary'

const person = (
  id: string,
  name: string,
  paid: number,
  contributed: number,
  charged: number,
  sent: number,
  received: number,
  net: number,
  role = 'participant',
) => ({
  participant_id: id,
  display_name: name,
  role,
  paid_cents: paid,
  contributed_cents: contributed,
  charged_cents: charged,
  settlements_paid_cents: sent,
  settlements_received_cents: received,
  net_cents: net,
})

// What trip_summary freezes for the sample trip in supabase/seed.sql.
const snapshot = {
  trip_id: 'aa15ac1a',
  name: 'Rocadragón está en Bizkaia',
  currency: 'EUR',
  start_date: '2026-12-18',
  end_date: '2026-12-22',
  participant_count: 5,
  expense_count: 12,
  total_cents: 170265,
  shared_cents: 80765,
  contributions_cents: 89500,
  cost_per_person_cents: 16153,
  participants: [
    person('arya', 'Arya', 21973, 0, 15120, 10000, 0, 16853),
    person('brienne', 'Brienne', 32500, 0, 16922, 0, 0, 15578),
    person('daenerys', 'Daenerys', 4372, 80000, 16923, 0, 15000, -27551),
    person('jon', 'Jon', 13770, 0, 17655, 0, 0, -3885),
    person('tyrion', 'Tyrion', 8150, 9500, 14145, 5000, 0, -995, 'admin'),
  ],
  contributions: [
    {
      expense_id: 'house',
      description: 'Caserío en Bakio, invita Daenerys',
      amount_cents: 80000,
      spent_on: '2026-12-18',
      paid_by: 'daenerys',
      payer_name: 'Daenerys',
    },
    {
      expense_id: 'farewell',
      description: 'Cena de despedida, invita Tyrion',
      amount_cents: 9500,
      spent_on: '2026-12-21',
      paid_by: 'tyrion',
      payer_name: 'Tyrion',
    },
  ],
  payments: [
    {
      payment_id: 'p1',
      from_participant_id: 'arya',
      from_name: 'Arya',
      to_participant_id: 'daenerys',
      to_name: 'Daenerys',
      amount_cents: 10000,
      paid_on: '2026-12-22',
      voided: false,
    },
    {
      payment_id: 'p2',
      from_participant_id: 'tyrion',
      from_name: 'Tyrion',
      to_participant_id: 'daenerys',
      to_name: 'Daenerys',
      amount_cents: 5000,
      paid_on: '2026-12-22',
      voided: true,
    },
  ],
}

describe('readClosingSummary', () => {
  it('reads the frozen figures of the trip', () => {
    expect(readClosingSummary(snapshot, null)).toMatchObject({
      name: 'Rocadragón está en Bizkaia',
      startDate: '2026-12-18',
      endDate: '2026-12-22',
      participantCount: 5,
      expenseCount: 12,
      totalCents: 170265,
      sharedCents: 80765,
      contributionsCents: 89500,
      costPerPersonCents: 16153,
    })
  })

  it('reads every participant with what they put in and where they ended', () => {
    const { participants } = readClosingSummary(snapshot, null)

    expect(participants.map((row) => [row.displayName, row.role, row.netCents])).toEqual([
      ['Arya', 'participant', 16853],
      ['Brienne', 'participant', 15578],
      ['Daenerys', 'participant', -27551],
      ['Jon', 'participant', -3885],
      ['Tyrion', 'admin', -995],
    ])
    expect(participants.reduce((sum, row) => sum + row.netCents, 0)).toBe(0)
  })

  it('names the contributions nobody shared, with who made them', () => {
    expect(
      readClosingSummary(snapshot, null).contributions.map((row) => [
        row.payerName,
        row.amountCents,
      ]),
    ).toEqual([
      ['Daenerys', 80000],
      ['Tyrion', 9500],
    ])
  })

  it('keeps the state of every payment, voided ones included', () => {
    expect(
      readClosingSummary(snapshot, null).payments.map((row) => [row.paymentId, row.voided]),
    ).toEqual([
      ['p1', false],
      ['p2', true],
    ])
  })

  it('works out the settlement the README proposes from the frozen balances', () => {
    expect(
      readClosingSummary(snapshot, null).plan.map((line) => [
        line.fromName,
        line.toName,
        line.amountCents,
      ]),
    ).toEqual([
      ['Daenerys', 'Arya', 16853],
      ['Daenerys', 'Brienne', 10698],
      ['Jon', 'Brienne', 3885],
      ['Tyrion', 'Brienne', 995],
    ])
  })

  it('reads the same every time, as a closed trip must', () => {
    expect(readClosingSummary(snapshot, 'jon')).toEqual(readClosingSummary(snapshot, 'jon'))
  })

  it('marks the reader, in the table and in the transfers they are party to', () => {
    const summary = readClosingSummary(snapshot, 'jon')

    expect(summary.participants.filter((row) => row.isYou).map((row) => row.displayName)).toEqual([
      'Jon',
    ])
    expect(summary.plan.map((line) => line.yours)).toEqual([null, null, 'pay', null])
  })

  it('reads amounts that arrive as strings', () => {
    const summary = readClosingSummary(
      { ...snapshot, total_cents: '170265', cost_per_person_cents: '16153' },
      null,
    )

    expect(summary.totalCents).toBe(170265)
    expect(summary.costPerPersonCents).toBe(16153)
  })

  it('reads a trip closed with nothing in it as zeros and empty lists', () => {
    expect(
      readClosingSummary(
        {
          name: 'Empty',
          participant_count: 1,
          expense_count: 0,
          total_cents: 0,
          shared_cents: 0,
          contributions_cents: 0,
          cost_per_person_cents: 0,
          participants: [person('ana', 'Ana', 0, 0, 0, 0, 0, 0, 'admin')],
          contributions: [],
          payments: [],
        },
        null,
      ),
    ).toMatchObject({ totalCents: 0, contributions: [], payments: [], plan: [] })
  })
})
