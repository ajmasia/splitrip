import Link from 'next/link'

import { Pill } from '@/components/pill'
import { intlLocale, type Locale, type Translate } from '@/lib/i18n'
import { formatShortDate } from '@/lib/i18n/format'
import { formatAmount } from '@/lib/money/amount'
import type { TripExpense } from '@/lib/trips/queries'

function split(expense: TripExpense, t: Translate) {
  if (expense.type === 'contribution') return t('expenses.split.none')
  return expense.splitCount === 1
    ? t('trips.people.one')
    : t('trips.people.other', { count: expense.splitCount })
}

function kind(expense: TripExpense, t: Translate) {
  return t(expense.type === 'shared' ? 'expenses.type.shared' : 'expenses.type.contribution')
}

/**
 * The same expenses twice over, as `TripList` does it: stacked for a thumb, tabular for a desk,
 * both in the document with CSS choosing between them, so the server and the browser never disagree
 * about which one the first paint should have contained.
 */
export function ExpenseList({
  expenses,
  tripId,
  locale,
  t,
}: {
  expenses: TripExpense[]
  tripId: string
  locale: Locale
  t: Translate
}) {
  const amount = (cents: number) => formatAmount(cents, intlLocale(locale))
  const day = (spentOn: string) => formatShortDate(spentOn, locale)

  return (
    <>
      <ul className="flex flex-col gap-3 wide:hidden">
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
      </ul>

      <div className="hidden overflow-x-auto wide:block">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-rule-strong text-left font-mono text-[0.6875rem] tracking-widest text-ink-faint uppercase">
              <th scope="col" className="py-2 pr-3 font-medium">
                {t('expenses.column.date')}
              </th>
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
              <th scope="col" className="py-2 pl-3 text-right font-medium">
                {t('expenses.column.amount')}
              </th>
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
        </table>
      </div>
    </>
  )
}
