import Link from 'next/link'

import { Pill } from '@/components/pill'
import { intlLocale, type Locale, type Translate } from '@/lib/i18n'
import { formatShortDate } from '@/lib/i18n/format'
import { formatAmount } from '@/lib/money/amount'
import {
  filterQuery,
  sortedBy,
  type ExpenseFilter,
  type ExpenseSort,
} from '@/lib/trips/expense-filter'
import type { TripExpense } from '@/lib/trips/queries'

function kind(expense: TripExpense, t: Translate) {
  return t(expense.type === 'shared' ? 'expenses.type.shared' : 'expenses.type.contribution')
}

function split(expense: TripExpense, t: Translate) {
  if (expense.type === 'contribution') return t('expenses.split.none')
  return expense.splitCount === 1
    ? t('trips.people.one')
    : t('trips.people.other', { count: expense.splitCount })
}

/**
 * A column that can be sorted. It is a link, not a button, because the order lives in the address:
 * it survives a reload, can be shared, and works before any JavaScript arrives. The arrow says which
 * way it runs, and `aria-sort` says the same to a screen reader.
 */
function SortHeader({
  column,
  label,
  filter,
  basePath,
  align,
  t,
}: {
  column: ExpenseSort
  label: string
  filter: ExpenseFilter
  basePath: string
  align: 'left' | 'right'
  t: Translate
}) {
  const active = filter.sort === column
  const arrow = active ? (filter.dir === 'desc' ? '↓' : '↑') : ''

  return (
    <th
      scope="col"
      aria-sort={active ? (filter.dir === 'desc' ? 'descending' : 'ascending') : 'none'}
      className={`py-2 font-medium ${align === 'right' ? 'pl-3 text-right' : 'pr-3'}`}
    >
      <Link
        href={`${basePath}${filterQuery(sortedBy(filter, column))}`}
        aria-label={t('detail.sort.by', { column: label })}
        className={`inline-flex items-center gap-1 ${active ? 'text-ink' : ''}`}
      >
        {label}
        <span aria-hidden="true" className="inline-block w-2">
          {arrow}
        </span>
      </Link>
    </th>
  )
}

/**
 * The filtered expenses, stacked for a thumb and tabular for a desk, both in the document with CSS
 * choosing between them. On a phone the two orders are a pair of links above the cards; on a desk
 * they are the column headers themselves. The total of what is listed closes both.
 */
export function ExpenseDetail({
  expenses,
  totalCents,
  filter,
  basePath,
  tripId,
  locale,
  t,
}: {
  expenses: TripExpense[]
  totalCents: number
  filter: ExpenseFilter
  basePath: string
  tripId: string
  locale: Locale
  t: Translate
}) {
  const amount = (cents: number) => formatAmount(cents, intlLocale(locale))
  const day = (spentOn: string) => formatShortDate(spentOn, locale)
  const sortLink = (column: ExpenseSort, label: string) => {
    const active = filter.sort === column

    return (
      <Link
        href={`${basePath}${filterQuery(sortedBy(filter, column))}`}
        aria-label={t('detail.sort.by', { column: label })}
        aria-current={active ? 'true' : undefined}
        className={`flex min-h-touch items-center gap-1 px-2 ${active ? 'font-semibold text-ink' : ''}`}
      >
        {label}
        {active ? <span aria-hidden="true">{filter.dir === 'desc' ? '↓' : '↑'}</span> : null}
      </Link>
    )
  }

  return (
    <>
      <div className="flex flex-col gap-3 wide:hidden">
        <div className="flex items-center gap-1 text-sm text-ink-soft">
          <span>{t('detail.sort')}:</span>
          {sortLink('date', t('expenses.column.date'))}
          {sortLink('amount', t('expenses.column.amount'))}
        </div>
        <ul className="flex flex-col gap-3">
          {expenses.map((expense) => (
            <li key={expense.id}>
              <Link
                href={`/trips/${tripId}/expenses/${expense.id}`}
                className="flex flex-col gap-1 rounded-card border border-rule bg-surface p-3"
              >
                <span className="flex items-baseline justify-between gap-3">
                  <span className="font-semibold">{expense.description}</span>
                  <span className="tabular font-semibold">{amount(expense.amountCents)}</span>
                </span>
                <span className="text-sm text-ink-soft">
                  {day(expense.spentOn)} · {expense.paidByName} · {split(expense, t)}
                </span>
                {expense.type === 'contribution' ? (
                  <span className="pt-1">
                    <Pill tone="accent">{kind(expense, t)}</Pill>
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
          <li className="flex items-baseline justify-between gap-3 rule-double pt-2">
            <span className="font-mono text-xs tracking-widest text-ink-faint uppercase">
              {t('balances.total')}
            </span>
            <span className="tabular font-semibold">{amount(totalCents)}</span>
          </li>
        </ul>
      </div>

      <div className="hidden overflow-x-auto wide:block">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-rule-strong text-left font-mono text-[0.6875rem] tracking-widest text-ink-faint uppercase">
              <SortHeader
                column="date"
                label={t('expenses.column.date')}
                filter={filter}
                basePath={basePath}
                align="left"
                t={t}
              />
              <th scope="col" className="px-3 py-2 font-medium">
                {t('expenses.column.description')}
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                {t('expenses.column.payer')}
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                {t('expenses.column.type')}
              </th>
              <th scope="col" className="px-3 py-2 text-right font-medium">
                {t('expenses.column.split')}
              </th>
              <SortHeader
                column="amount"
                label={t('expenses.column.amount')}
                filter={filter}
                basePath={basePath}
                align="right"
                t={t}
              />
            </tr>
          </thead>
          <tbody>
            {expenses.map((expense) => (
              <tr key={expense.id} className="border-b border-rule">
                <td className="tabular py-2 pr-3 whitespace-nowrap text-ink-soft">
                  {day(expense.spentOn)}
                </td>
                <td className="px-3 py-2 font-medium">
                  <Link href={`/trips/${tripId}/expenses/${expense.id}`} className="text-accent">
                    {expense.description}
                  </Link>
                </td>
                <td className="px-3 py-2">{expense.paidByName}</td>
                <td className="px-3 py-2 text-ink-soft">{kind(expense, t)}</td>
                <td className="tabular px-3 py-2 text-right text-ink-soft">
                  {expense.type === 'contribution' ? '—' : expense.splitCount}
                </td>
                <td className="tabular py-2 pl-3 text-right font-medium">
                  {amount(expense.amountCents)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="rule-double">
              <td
                colSpan={5}
                className="py-2 pr-3 font-mono text-[0.6875rem] tracking-widest text-ink-faint uppercase"
              >
                {t('balances.total')}
              </td>
              <td className="tabular py-2 pl-3 text-right text-base font-semibold">
                {amount(totalCents)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </>
  )
}
