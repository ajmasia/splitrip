import { describe, expect, it } from 'vitest'

import {
  DEFAULT_FILTER,
  filterExpenses,
  filterQuery,
  readExpenseFilter,
  sortedBy,
  type ExpenseFilter,
} from './expense-filter'
import type { ExpenseType, TripExpense } from './queries'

function expense(
  id: string,
  spentOn: string,
  amountCents: number,
  paidBy: string,
  type: ExpenseType = 'shared',
): TripExpense {
  return {
    id,
    description: id,
    amountCents,
    type,
    spentOn,
    paidBy,
    paidByName: paidBy[0]?.toUpperCase() + paidBy.slice(1),
    splitCount: type === 'shared' ? 3 : 0,
  }
}

// Newest first, as listExpenses hands them over.
const expenses = [
  expense('farewell-dinner', '2026-12-21', 9500, 'ana', 'contribution'),
  expense('boat', '2026-12-20', 3900, 'beto'),
  expense('lunch', '2026-12-20', 7600, 'ana'),
  expense('wine', '2026-12-19', 2650, 'carla'),
  expense('house', '2026-12-18', 80000, 'beto', 'contribution'),
  expense('van', '2026-12-18', 21000, 'ana'),
]

const filter = (overrides: Partial<ExpenseFilter>): ExpenseFilter => ({
  ...DEFAULT_FILTER,
  ...overrides,
})
const ids = (result: { expenses: TripExpense[] }) => result.expenses.map((item) => item.id)

describe('filterExpenses', () => {
  it('keeps every expense, newest first, when nothing is filtered', () => {
    const result = filterExpenses(expenses, DEFAULT_FILTER)

    expect(ids(result)).toEqual(['farewell-dinner', 'boat', 'lunch', 'wine', 'house', 'van'])
    expect(result.totalCents).toBe(124650)
  })

  it('keeps only what one person paid, with its total', () => {
    const result = filterExpenses(expenses, filter({ payer: 'ana' }))

    expect(ids(result)).toEqual(['farewell-dinner', 'lunch', 'van'])
    expect(result.totalCents).toBe(38100)
  })

  it('keeps only the contributions, with their total', () => {
    const result = filterExpenses(expenses, filter({ type: 'contribution' }))

    expect(ids(result)).toEqual(['farewell-dinner', 'house'])
    expect(result.totalCents).toBe(89500)
  })

  it('combines the two filters', () => {
    const result = filterExpenses(expenses, filter({ payer: 'beto', type: 'shared' }))

    expect(ids(result)).toEqual(['boat'])
    expect(result.totalCents).toBe(3900)
  })

  it('finds nothing for a combination no expense matches, at a total of zero', () => {
    const result = filterExpenses(expenses, filter({ payer: 'carla', type: 'contribution' }))

    expect(result.expenses).toEqual([])
    expect(result.totalCents).toBe(0)
  })

  it('sorts by date oldest first by reversing the newest-first order', () => {
    expect(ids(filterExpenses(expenses, filter({ dir: 'asc' })))).toEqual([
      'van',
      'house',
      'wine',
      'lunch',
      'boat',
      'farewell-dinner',
    ])
  })

  it('sorts by amount both ways', () => {
    expect(ids(filterExpenses(expenses, filter({ sort: 'amount', dir: 'desc' })))).toEqual([
      'house',
      'van',
      'farewell-dinner',
      'lunch',
      'boat',
      'wine',
    ])
    expect(ids(filterExpenses(expenses, filter({ sort: 'amount', dir: 'asc' })))).toEqual([
      'wine',
      'boat',
      'lunch',
      'farewell-dinner',
      'van',
      'house',
    ])
  })

  it('leaves equal amounts newest first', () => {
    const tied = [
      expense('newer', '2026-12-20', 1000, 'ana'),
      expense('older', '2026-12-18', 1000, 'beto'),
    ]

    expect(ids(filterExpenses(tied, filter({ sort: 'amount', dir: 'desc' })))).toEqual([
      'newer',
      'older',
    ])
    expect(ids(filterExpenses(tied, filter({ sort: 'amount', dir: 'asc' })))).toEqual([
      'newer',
      'older',
    ])
  })

  it('does not reorder the list it was given', () => {
    const before = ids({ expenses })
    filterExpenses(expenses, filter({ dir: 'asc' }))
    filterExpenses(expenses, filter({ sort: 'amount' }))

    expect(ids({ expenses })).toEqual(before)
  })
})

describe('readExpenseFilter', () => {
  const payers = ['ana', 'beto', 'carla']

  it('reads a filter a link spells out', () => {
    expect(
      readExpenseFilter(
        { payer: 'beto', type: 'contribution', sort: 'amount', dir: 'asc' },
        payers,
      ),
    ).toEqual({ payer: 'beto', type: 'contribution', sort: 'amount', dir: 'asc' })
  })

  it('falls back to the default for an empty query', () => {
    expect(readExpenseFilter({}, payers)).toEqual(DEFAULT_FILTER)
  })

  it('ignores anything it does not recognise rather than failing', () => {
    expect(
      readExpenseFilter(
        { payer: 'somebody-from-another-trip', type: 'gift', sort: 'description', dir: 'up' },
        payers,
      ),
    ).toEqual(DEFAULT_FILTER)
  })

  it('treats an empty choice as no filter, as a form sends "any"', () => {
    expect(readExpenseFilter({ payer: '', type: '' }, payers)).toEqual(DEFAULT_FILTER)
  })

  it('takes the first of a repeated parameter', () => {
    expect(readExpenseFilter({ payer: ['carla', 'ana'] }, payers).payer).toBe('carla')
  })
})

describe('filterQuery', () => {
  it('is empty for the default filter, so the plain list keeps its plain address', () => {
    expect(filterQuery(DEFAULT_FILTER)).toBe('')
  })

  it('spells out only what differs from the default', () => {
    expect(filterQuery(filter({ type: 'shared', sort: 'amount' }))).toBe('?type=shared&sort=amount')
  })

  it('reads back as the filter it was made from', () => {
    const original = filter({ payer: 'ana', type: 'contribution', sort: 'amount', dir: 'asc' })
    const params = Object.fromEntries(new URLSearchParams(filterQuery(original)))

    expect(readExpenseFilter(params, ['ana'])).toEqual(original)
  })
})

describe('sortedBy', () => {
  it('flips the direction of the column already sorted', () => {
    expect(sortedBy(DEFAULT_FILTER, 'date')).toEqual(filter({ dir: 'asc' }))
    expect(sortedBy(filter({ dir: 'asc' }), 'date')).toEqual(DEFAULT_FILTER)
  })

  it('starts another column from the largest, keeping the filters', () => {
    expect(sortedBy(filter({ payer: 'ana', dir: 'asc' }), 'amount')).toEqual(
      filter({ payer: 'ana', sort: 'amount', dir: 'desc' }),
    )
  })
})
