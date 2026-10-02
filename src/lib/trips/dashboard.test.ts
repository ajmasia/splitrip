import { describe, expect, it } from 'vitest'

import { dashboardFor, perPersonCents } from './dashboard'
import type { ParticipantBalance, TripSummary } from './queries'

function trip(overrides: Partial<TripSummary> = {}): TripSummary {
  return {
    id: 'trip',
    name: 'Rocadragón está en Bizkaia',
    status: 'open',
    startDate: null,
    endDate: null,
    totalCents: 0,
    sharedCents: 0,
    contributedCents: 0,
    expenseCount: 0,
    participantCount: 0,
    yourRole: 'admin',
    ...overrides,
  }
}

function balance(
  displayName: string,
  paidCents: number,
  contributedCents: number,
  chargedCents: number,
  netCents: number,
): ParticipantBalance {
  return {
    participantId: displayName.toLowerCase(),
    displayName,
    isYou: false,
    paidCents,
    contributedCents,
    chargedCents,
    netCents,
  }
}

// The sample trip in supabase/seed.sql, with the figures the README works out for it by hand.
const sampleTrip = trip({
  totalCents: 170265,
  sharedCents: 80765,
  contributedCents: 89500,
  expenseCount: 12,
  participantCount: 5,
})

const sampleBalances = [
  balance('Arya', 21973, 0, 15120, 16853),
  balance('Brienne', 32500, 0, 16922, 15578),
  balance('Daenerys', 4372, 80000, 16923, -27551),
  balance('Jon', 13770, 0, 17655, -3885),
  balance('Tyrion', 8150, 9500, 14145, -995),
]

describe('dashboardFor', () => {
  it('reads the headline figures of the sample trip', () => {
    const dashboard = dashboardFor(sampleTrip, sampleBalances)

    expect(dashboard).toMatchObject({
      totalCents: 170265,
      sharedCents: 80765,
      contributedCents: 89500,
      expenseCount: 12,
      perPersonCents: 16153,
    })
  })

  it('splits the total into whole percentages that always read 100', () => {
    const dashboard = dashboardFor(sampleTrip, sampleBalances)

    expect(dashboard.sharedPercent).toBe(47)
    expect(dashboard.contributedPercent).toBe(53)
  })

  it('makes every row add up by hand through what its payments settled', () => {
    const { rows } = dashboardFor(sampleTrip, sampleBalances)

    expect(rows.map((row) => [row.displayName, row.settledCents])).toEqual([
      ['Arya', 10000],
      ['Brienne', 0],
      ['Daenerys', -15000],
      ['Jon', 0],
      ['Tyrion', 5000],
    ])
    for (const row of rows) {
      expect(row.paidCents - row.chargedCents + row.settledCents).toBe(row.netCents)
    }
  })

  it('closes the table with totals in which paid equals charged and the balances sum to zero', () => {
    const { totals } = dashboardFor(sampleTrip, sampleBalances)

    expect(totals).toEqual({
      paidCents: 80765,
      contributedCents: 89500,
      chargedCents: 80765,
      settledCents: 0,
      netCents: 0,
    })
  })

  it('keeps the participants in the order it was given', () => {
    const { rows } = dashboardFor(sampleTrip, sampleBalances)

    expect(rows.map((row) => row.displayName)).toEqual([
      'Arya',
      'Brienne',
      'Daenerys',
      'Jon',
      'Tyrion',
    ])
  })

  it('reads a trip with no expenses as zeros, with no share of a total that is not there', () => {
    const dashboard = dashboardFor(trip({ participantCount: 3 }), [
      balance('Ana', 0, 0, 0, 0),
      balance('Beto', 0, 0, 0, 0),
      balance('Carla', 0, 0, 0, 0),
    ])

    expect(dashboard).toMatchObject({
      totalCents: 0,
      sharedCents: 0,
      contributedCents: 0,
      sharedPercent: null,
      contributedPercent: null,
      expenseCount: 0,
      perPersonCents: 0,
      totals: { paidCents: 0, contributedCents: 0, chargedCents: 0, settledCents: 0, netCents: 0 },
    })
  })

  it('reads a trip of nothing but contributions as wholly contributed', () => {
    const dashboard = dashboardFor(
      trip({ totalCents: 30000, contributedCents: 30000, expenseCount: 1, participantCount: 2 }),
      [balance('Ana', 0, 30000, 0, 0), balance('Beto', 0, 0, 0, 0)],
    )

    expect(dashboard.sharedPercent).toBe(0)
    expect(dashboard.contributedPercent).toBe(100)
    expect(dashboard.perPersonCents).toBe(0)
  })
})

describe('perPersonCents', () => {
  it('rounds to the nearest cent', () => {
    expect(perPersonCents(trip({ sharedCents: 1000, participantCount: 3 }))).toBe(333)
    expect(perPersonCents(trip({ sharedCents: 2000, participantCount: 3 }))).toBe(667)
  })

  it('is zero for a trip with nobody in it rather than a division by zero', () => {
    expect(perPersonCents(trip({ sharedCents: 1000, participantCount: 0 }))).toBe(0)
  })
})
