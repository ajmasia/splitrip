import Link from 'next/link'

import { intlLocale, type Locale } from '@/lib/i18n'
import { formatShortDate } from '@/lib/i18n/format'
import { formatAmount } from '@/lib/money/amount'
import type { StatementLine } from '@/lib/trips/queries'

/**
 * One block of a statement, set the way a bill sets a column of figures: the concept, the dotted
 * run, the amount, and a rule above the total that closes it.
 *
 * Every line links to the expense it came from where there is one to link to, which is what makes
 * the total checkable rather than merely stated: the reader can follow any figure down to the
 * screen that shows who else was in that split and what each of them was charged.
 */
export function StatementSection({
  title,
  note,
  lines,
  totalCents,
  empty,
  tripId,
  locale,
}: {
  title: string
  note: string
  lines: StatementLine[]
  totalCents: number
  empty: string
  /** Absent for settlements, which are payments between people rather than expenses to open. */
  tripId?: string
  locale: Locale
}) {
  const amount = (cents: number) => formatAmount(cents, intlLocale(locale))

  return (
    <section className="flex max-w-prose flex-col gap-2">
      <h2 className="font-mono text-xs tracking-widest text-ink-faint uppercase">{title}</h2>
      <p className="text-sm text-ink-soft">{note}</p>

      {/*
        In a list the whole row is the target, not the words in it: a link inside a line of prose
        cannot be made thumb-sized without wrecking the line, and on a phone this is a list to tap
        down rather than a paragraph to read.
      */}
      {lines.length === 0 ? (
        <p className="text-ink-soft">{empty}</p>
      ) : (
        <ul className="flex flex-col pt-1">
          {lines.map((line) => {
            const row = (
              <>
                <span>
                  {line.description}
                  <span className="tabular pl-2 text-sm text-ink-faint">
                    {formatShortDate(line.spentOn, locale)}
                  </span>
                </span>
                <span className="leader" aria-hidden="true" />
                <span className="tabular whitespace-nowrap">{amount(line.amountCents)}</span>
              </>
            )

            return (
              <li key={line.id}>
                {tripId === undefined ? (
                  <span className="flex min-h-touch flex-wrap items-baseline gap-x-2 py-1">
                    {row}
                  </span>
                ) : (
                  <Link
                    href={`/trips/${tripId}/expenses/${line.id}`}
                    className="flex min-h-touch flex-wrap items-baseline gap-x-2 py-1 text-accent"
                  >
                    {row}
                  </Link>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <div className="rule-double flex items-baseline justify-between gap-3 pt-2">
        <span className="font-mono text-xs tracking-widest text-ink-faint uppercase">{title}</span>
        <span className="tabular font-semibold">{amount(totalCents)}</span>
      </div>
    </section>
  )
}
