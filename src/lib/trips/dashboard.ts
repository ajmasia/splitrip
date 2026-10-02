import type { ParticipantBalance, TripSummary } from '@/lib/trips/queries'

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
