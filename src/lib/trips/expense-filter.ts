import type { ExpenseType, TripExpense } from '@/lib/trips/queries'

export type ExpenseSort = 'date' | 'amount'
export type SortDirection = 'asc' | 'desc'

export type ExpenseFilter = {
  /** The participant who paid, or null for anybody. */
  payer: string | null
  type: ExpenseType | null
  sort: ExpenseSort
  dir: SortDirection
}

/** Newest first, the order every other list of expenses in the application already uses. */
export const DEFAULT_FILTER: ExpenseFilter = { payer: null, type: null, sort: 'date', dir: 'desc' }

type SearchParams = Record<string, string | string[] | undefined>

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)

/**
 * The filter a URL asks for, keeping only what makes sense for this trip.
 *
 * The query string is typed by whoever holds the link, so anything it does not recognise — a payer
 * from another trip, a type that does not exist, a column nobody sorts by — falls back to the
 * default rather than to an error: a stale or mangled link still opens the list.
 */
export function readExpenseFilter(
  params: SearchParams,
  payerIds: readonly string[],
): ExpenseFilter {
  const payer = one(params.payer)
  const type = one(params.type)
  const sort = one(params.sort)
  const dir = one(params.dir)

  return {
    payer: payer !== undefined && payerIds.includes(payer) ? payer : DEFAULT_FILTER.payer,
    type: type === 'shared' || type === 'contribution' ? type : DEFAULT_FILTER.type,
    sort: sort === 'date' || sort === 'amount' ? sort : DEFAULT_FILTER.sort,
    dir: dir === 'asc' || dir === 'desc' ? dir : DEFAULT_FILTER.dir,
  }
}

/**
 * The query string for a filter, leaving out whatever is at its default so the plain list keeps its
 * plain address. Empty when nothing is set.
 */
export function filterQuery(filter: ExpenseFilter): string {
  const params = new URLSearchParams()
  if (filter.payer !== null) params.set('payer', filter.payer)
  if (filter.type !== null) params.set('type', filter.type)
  if (filter.sort !== DEFAULT_FILTER.sort) params.set('sort', filter.sort)
  if (filter.dir !== DEFAULT_FILTER.dir) params.set('dir', filter.dir)
  const query = params.toString()

  return query === '' ? '' : `?${query}`
}

/**
 * Where a column header leads: the same column again flips its direction, another column starts
 * from the largest or the newest, which is what somebody reaching for it usually wants first.
 */
export function sortedBy(filter: ExpenseFilter, column: ExpenseSort): ExpenseFilter {
  if (filter.sort === column) return { ...filter, dir: filter.dir === 'desc' ? 'asc' : 'desc' }
  return { ...filter, sort: column, dir: 'desc' }
}

/**
 * The expenses a filter keeps, in the order it asks for, and what they add up to.
 *
 * The input arrives newest first with its ties already settled, so ordering by date is that order or
 * its reverse, and ordering by amount is a stable sort that leaves equal amounts newest first.
 */
export function filterExpenses(
  expenses: readonly TripExpense[],
  filter: ExpenseFilter,
): { expenses: TripExpense[]; totalCents: number } {
  const kept = expenses.filter(
    (expense) =>
      (filter.payer === null || expense.paidBy === filter.payer) &&
      (filter.type === null || expense.type === filter.type),
  )

  const ordered =
    filter.sort === 'date'
      ? filter.dir === 'desc'
        ? kept
        : [...kept].reverse()
      : [...kept].sort((a, b) =>
          filter.dir === 'desc' ? b.amountCents - a.amountCents : a.amountCents - b.amountCents,
        )

  return {
    expenses: ordered,
    totalCents: ordered.reduce((sum, expense) => sum + expense.amountCents, 0),
  }
}
