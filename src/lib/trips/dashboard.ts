import type { ParticipantBalance, TripExpense, TripSummary } from '@/lib/trips/queries'

export type DaySpending = {
  /** The calendar date, `YYYY-MM-DD`, as an expense carries it. */
  day: string
  totalCents: number
  sharedCents: number
  contributedCents: number
}

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * What the trip spent on each day, from the first day anything was spent to the last, oldest first.
 *
 * A day in between with nothing recorded is there at zero: a quiet day is part of the story, and
 * leaving it out would draw two days apart as if they were consecutive.
 *
 * The calendar is walked in UTC. An expense's date is a date, not a moment, and stepping through
 * local midnights would repeat or skip a day where the clocks change.
 */
export function spendingByDay(
  expenses: readonly Pick<TripExpense, 'spentOn' | 'amountCents' | 'type'>[],
): DaySpending[] {
  if (expenses.length === 0) return []

  const byDay = new Map<string, DaySpending>()
  for (const expense of expenses) {
    const day = byDay.get(expense.spentOn) ?? {
      day: expense.spentOn,
      totalCents: 0,
      sharedCents: 0,
      contributedCents: 0,
    }
    day.totalCents += expense.amountCents
    if (expense.type === 'shared') day.sharedCents += expense.amountCents
    else day.contributedCents += expense.amountCents
    byDay.set(expense.spentOn, day)
  }

  const days = [...byDay.keys()].sort()
  const first = Date.parse(`${days[0]}T00:00:00Z`)
  const last = Date.parse(`${days[days.length - 1]}T00:00:00Z`)
  const calendar: DaySpending[] = []

  for (let moment = first; moment <= last; moment += DAY_MS) {
    const day = new Date(moment).toISOString().slice(0, 10)
    calendar.push(byDay.get(day) ?? { day, totalCents: 0, sharedCents: 0, contributedCents: 0 })
  }

  return calendar
}

export type QuietRun = {
  /** First and last day of a stretch with nothing spent, both `YYYY-MM-DD`. */
  from: string
  to: string
  days: number
}

export type DailyRow = ({ kind: 'day' } & DaySpending) | ({ kind: 'quiet' } & QuietRun)

/** The shortest stretch of empty days that is folded into one row. */
export const QUIET_RUN = 3

/**
 * The calendar as a chart reads it: a stretch of `QUIET_RUN` or more days with nothing spent becomes
 * one row, and a shorter one stays day by day.
 *
 * A booking made weeks before departure would otherwise push the trip itself under a column of
 * zeros. A quiet day or two in the middle of the trip is part of how it went, and stays visible.
 */
export function collapseQuietRuns(days: readonly DaySpending[]): DailyRow[] {
  const rows: DailyRow[] = []
  let quiet: DaySpending[] = []

  const flush = () => {
    const [first] = quiet
    const last = quiet[quiet.length - 1]
    if (first && last && quiet.length >= QUIET_RUN) {
      rows.push({ kind: 'quiet', from: first.day, to: last.day, days: quiet.length })
    } else {
      rows.push(...quiet.map((day) => ({ kind: 'day' as const, ...day })))
    }
    quiet = []
  }

  for (const day of days) {
    if (day.totalCents === 0) {
      quiet.push(day)
      continue
    }
    flush()
    rows.push({ kind: 'day', ...day })
  }
  flush()

  return rows
}

export type DashboardRow = ParticipantBalance & {
  /**
   * What their settlement payments have moved: what they sent minus what they received. It is the
   * column that makes a row add up by hand — paid, minus charged, plus this, is the balance.
   */
  settledCents: number
}

export type Dashboard = {
  totalCents: number
  sharedCents: number
  contributedCents: number
  /**
   * Whole percentages of the total, the second derived from the first so the two always read 100.
   * Null on a trip with nothing spent, where a share of nothing is not zero but meaningless.
   */
  sharedPercent: number | null
  contributedPercent: number | null
  expenseCount: number
  perPersonCents: number
  rows: DashboardRow[]
  totals: Omit<DashboardRow, 'participantId' | 'displayName' | 'isYou'>
}

/**
 * The shared spending divided among everyone, to the nearest cent. A contribution charges nobody,
 * so counting it would report a cost per person that nobody is ever going to be asked for.
 */
export function perPersonCents(trip: TripSummary): number {
  return trip.participantCount === 0 ? 0 : Math.round(trip.sharedCents / trip.participantCount)
}

/**
 * The organiser's view of a trip, put together from figures the database has already worked out.
 * Nothing here is a second opinion about the money: the totals are the trip's, the balances are the
 * view's, and the one derived column is the difference those two already imply.
 */
export function dashboardFor(
  trip: TripSummary,
  balances: readonly ParticipantBalance[],
): Dashboard {
  const rows = balances.map((balance) => ({
    ...balance,
    settledCents: balance.netCents - balance.paidCents + balance.chargedCents,
  }))
  const sum = (pick: (row: DashboardRow) => number) =>
    rows.reduce((total, row) => total + pick(row), 0)
  const sharedPercent =
    trip.totalCents === 0 ? null : Math.round((trip.sharedCents / trip.totalCents) * 100)

  return {
    totalCents: trip.totalCents,
    sharedCents: trip.sharedCents,
    contributedCents: trip.contributedCents,
    sharedPercent,
    contributedPercent: sharedPercent === null ? null : 100 - sharedPercent,
    expenseCount: trip.expenseCount,
    perPersonCents: perPersonCents(trip),
    rows,
    totals: {
      paidCents: sum((row) => row.paidCents),
      contributedCents: sum((row) => row.contributedCents),
      chargedCents: sum((row) => row.chargedCents),
      settledCents: sum((row) => row.settledCents),
      netCents: sum((row) => row.netCents),
    },
  }
}
