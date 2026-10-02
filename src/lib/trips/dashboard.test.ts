import fc from 'fast-check'
import { describe, expect, it } from 'vitest'

import {
  collapseQuietRuns,
  dashboardFor,
  perPersonCents,
  QUIET_RUN,
  spendingByDay,
} from './dashboard'
import type { ExpenseType, ParticipantBalance, TripExpense, TripSummary } from './queries'

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

type DayExpense = Pick<TripExpense, 'spentOn' | 'amountCents' | 'type'>

const expense = (
  spentOn: string,
  amountCents: number,
  type: ExpenseType = 'shared',
): DayExpense => ({
  spentOn,
  amountCents,
  type,
})

// The twelve expenses of the sample trip in supabase/seed.sql.
const sampleExpenses = [
  expense('2026-12-18', 80000, 'contribution'),
  expense('2026-12-18', 21000),
  expense('2026-12-18', 11570),
  expense('2026-12-18', 8733),
  expense('2026-12-19', 13240),
  expense('2026-12-19', 2650),
  expense('2026-12-19', 3900),
  expense('2026-12-20', 7600),
  expense('2026-12-20', 2200),
  expense('2026-12-20', 4372),
  expense('2026-12-21', 5500),
  expense('2026-12-21', 9500, 'contribution'),
]

describe('spendingByDay', () => {
  it('adds up the sample trip day by day, oldest first', () => {
    expect(spendingByDay(sampleExpenses)).toEqual([
      { day: '2026-12-18', totalCents: 121303, sharedCents: 41303, contributedCents: 80000 },
      { day: '2026-12-19', totalCents: 19790, sharedCents: 19790, contributedCents: 0 },
      { day: '2026-12-20', totalCents: 14172, sharedCents: 14172, contributedCents: 0 },
      { day: '2026-12-21', totalCents: 15000, sharedCents: 5500, contributedCents: 9500 },
    ])
  })

  it('reconciles the days of the sample trip with its total', () => {
    const days = spendingByDay(sampleExpenses)

    expect(days.reduce((sum, day) => sum + day.totalCents, 0)).toBe(sampleTrip.totalCents)
    expect(days.reduce((sum, day) => sum + day.sharedCents, 0)).toBe(sampleTrip.sharedCents)
    expect(days.reduce((sum, day) => sum + day.contributedCents, 0)).toBe(
      sampleTrip.contributedCents,
    )
  })

  it('shows a quiet day between two others at zero', () => {
    const days = spendingByDay([expense('2026-12-21', 500), expense('2026-12-18', 1000)])

    expect(days.map((day) => [day.day, day.totalCents])).toEqual([
      ['2026-12-18', 1000],
      ['2026-12-19', 0],
      ['2026-12-20', 0],
      ['2026-12-21', 500],
    ])
  })

  it('walks across the change of clocks without repeating or skipping a day', () => {
    const days = spendingByDay([expense('2026-10-24', 100), expense('2026-10-27', 100)])

    expect(days.map((day) => day.day)).toEqual([
      '2026-10-24',
      '2026-10-25',
      '2026-10-26',
      '2026-10-27',
    ])
  })

  it('has no days for a trip with no expenses', () => {
    expect(spendingByDay([])).toEqual([])
  })

  it('always reconciles with the total, over consecutive days', () => {
    const anyExpense = fc.record({
      spentOn: fc
        .integer({ min: 0, max: 60 })
        .map((offset) =>
          new Date(Date.UTC(2026, 11, 1) + offset * 86_400_000).toISOString().slice(0, 10),
        ),
      amountCents: fc.integer({ min: 1, max: 500_000 }),
      type: fc.constantFrom<ExpenseType>('shared', 'contribution'),
    })

    fc.assert(
      fc.property(fc.array(anyExpense, { minLength: 1, maxLength: 40 }), (expenses) => {
        const days = spendingByDay(expenses)
        const total = expenses.reduce((sum, item) => sum + item.amountCents, 0)

        expect(days.reduce((sum, day) => sum + day.totalCents, 0)).toBe(total)
        for (const day of days) {
          expect(day.sharedCents + day.contributedCents).toBe(day.totalCents)
        }
        days.slice(1).forEach((day, index) => {
          expect(Date.parse(day.day) - Date.parse(days[index]?.day ?? '')).toBe(86_400_000)
        })
      }),
    )
  })
})

describe('collapseQuietRuns', () => {
  const day = (date: string, totalCents: number) => ({
    day: date,
    totalCents,
    sharedCents: totalCents,
    contributedCents: 0,
  })

  it('folds a long stretch of empty days into one row', () => {
    const rows = collapseQuietRuns(
      spendingByDay([expense('2026-12-02', 64516), expense('2026-12-16', 17612)]),
    )

    expect(rows).toEqual([
      { kind: 'day', ...day('2026-12-02', 64516) },
      { kind: 'quiet', from: '2026-12-03', to: '2026-12-15', days: 13 },
      { kind: 'day', ...day('2026-12-16', 17612) },
    ])
  })

  it('keeps a quiet day or two in the middle of the trip day by day', () => {
    const rows = collapseQuietRuns([
      day('2026-12-18', 1000),
      day('2026-12-19', 0),
      day('2026-12-20', 0),
      day('2026-12-21', 500),
    ])

    expect(rows.map((row) => row.kind)).toEqual(['day', 'day', 'day', 'day'])
  })

  it('folds a stretch of exactly the threshold', () => {
    const rows = collapseQuietRuns([
      day('2026-12-18', 1000),
      day('2026-12-19', 0),
      day('2026-12-20', 0),
      day('2026-12-21', 0),
      day('2026-12-22', 500),
    ])

    expect(rows[1]).toEqual({ kind: 'quiet', from: '2026-12-19', to: '2026-12-21', days: 3 })
    expect(rows).toHaveLength(3)
  })

  it('leaves a trip with no quiet days as it is', () => {
    const rows = collapseQuietRuns(spendingByDay(sampleExpenses))

    expect(rows.every((row) => row.kind === 'day')).toBe(true)
    expect(rows).toHaveLength(4)
  })

  it('has no rows for a trip with no expenses', () => {
    expect(collapseQuietRuns([])).toEqual([])
  })

  it('accounts for every day and every cent of the calendar it folds', () => {
    const anyExpense = fc.record({
      spentOn: fc
        .integer({ min: 0, max: 60 })
        .map((offset) =>
          new Date(Date.UTC(2026, 11, 1) + offset * 86_400_000).toISOString().slice(0, 10),
        ),
      amountCents: fc.integer({ min: 1, max: 500_000 }),
      type: fc.constantFrom<ExpenseType>('shared', 'contribution'),
    })

    fc.assert(
      fc.property(fc.array(anyExpense, { minLength: 1, maxLength: 20 }), (expenses) => {
        const days = spendingByDay(expenses)
        const rows = collapseQuietRuns(days)

        const covered = rows.reduce((sum, row) => sum + (row.kind === 'quiet' ? row.days : 1), 0)
        const cents = rows.reduce((sum, row) => sum + (row.kind === 'day' ? row.totalCents : 0), 0)
        expect(covered).toBe(days.length)
        expect(cents).toBe(expenses.reduce((sum, item) => sum + item.amountCents, 0))
        for (const row of rows) {
          if (row.kind === 'quiet') expect(row.days).toBeGreaterThanOrEqual(QUIET_RUN)
        }
      }),
    )
  })
})
