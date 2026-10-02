import { intlLocale, type Locale, type Translate } from '@/lib/i18n'
import { formatShortDate, formatShortDateRange } from '@/lib/i18n/format'
import { formatAmount } from '@/lib/money/amount'
import { collapseQuietRuns, type DaySpending } from '@/lib/trips/dashboard'

function Key({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span aria-hidden="true" className={`size-2.5 rounded-[2px] ${swatch}`} />
      {label}
    </span>
  )
}

/**
 * What the trip spent each day, as one bar per day measured against the busiest one.
 *
 * Each bar is what was split, in the chart's green, followed after a two-pixel gap by what somebody
 * treated the group to, in grey: the split part is the figure, the treat is context. The total is
 * written at the end of every bar and the treat under it whenever there is one, so no value is
 * left to the colour — the grey is quiet against the surface by design. Hovering or focusing a day
 * spells out its split, and the table under the chart carries every number in plain columns.
 *
 * A long stretch with nothing spent is one quiet row rather than a column of zeros, so a booking
 * made weeks ahead does not push the trip itself down the page.
 *
 * Rendered on the server with no script: the hover layer is CSS, so the figure costs nothing to
 * hydrate and reads the same before any JavaScript arrives.
 */
export function DailySpending({
  days,
  locale,
  t,
}: {
  days: DaySpending[]
  locale: Locale
  t: Translate
}) {
  const amount = (cents: number) => formatAmount(cents, intlLocale(locale))
  const busiest = Math.max(...days.map((day) => day.totalCents), 1)
  const share = (cents: number) => `${(cents / busiest) * 100}%`
  const sum = (pick: (day: DaySpending) => number) =>
    days.reduce((total, day) => total + pick(day), 0)
  const rows = collapseQuietRuns(days)

  return (
    <figure className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-soft">
        <Key swatch="bg-chart-figure" label={t('dashboard.figure.shared')} />
        <Key swatch="bg-chart-context" label={t('trip.figure.unsplit')} />
      </div>

      <ol className="flex flex-col">
        {rows.map((day) => {
          if (day.kind === 'quiet') {
            return (
              <li
                key={day.from}
                className="grid grid-cols-[6.5rem_1fr] items-center gap-x-3 px-1 py-1.5 text-sm"
              >
                <span className="text-ink-soft">
                  {formatShortDateRange(day.from, day.to, locale)}
                </span>
                <span className="text-ink-faint">
                  {t('dashboard.daily.quiet', { days: day.days })}
                </span>
              </li>
            )
          }

          const label = t('dashboard.daily.row', {
            day: formatShortDate(day.day, locale),
            total: amount(day.totalCents),
            shared: amount(day.sharedCents),
            contributed: amount(day.contributedCents),
          })

          return (
            <li
              key={day.day}
              tabIndex={0}
              aria-label={label}
              className="group relative grid grid-cols-[6.5rem_1fr_auto] items-center gap-x-3 rounded-card px-1 py-1.5 outline-offset-0 hover:bg-surface-2 focus-visible:bg-surface-2"
            >
              <span className="text-sm text-ink-soft">{formatShortDate(day.day, locale)}</span>

              <span aria-hidden="true" className="flex h-3 items-center gap-[2px]">
                {day.sharedCents > 0 ? (
                  <span
                    className={`h-full bg-chart-figure ${day.contributedCents > 0 ? '' : 'rounded-r-[4px]'}`}
                    style={{ width: share(day.sharedCents) }}
                  />
                ) : null}
                {day.contributedCents > 0 ? (
                  <span
                    className="h-full rounded-r-[4px] bg-chart-context"
                    style={{ width: share(day.contributedCents) }}
                  />
                ) : null}
              </span>

              <span className="flex flex-col items-end text-right">
                <span
                  className={`tabular text-sm font-semibold ${day.totalCents === 0 ? 'text-ink-faint' : ''}`}
                >
                  {amount(day.totalCents)}
                </span>
                {day.contributedCents > 0 ? (
                  <span className="tabular text-xs text-ink-soft">
                    {t('trip.figure.unsplit')} {amount(day.contributedCents)}
                  </span>
                ) : null}
              </span>

              <span
                aria-hidden="true"
                className="pointer-events-none absolute top-full right-1 z-10 hidden rounded-card border border-rule bg-surface px-3 py-2 text-xs shadow-sm group-hover:block group-focus-visible:block"
              >
                <span className="flex items-baseline justify-between gap-4">
                  <span className="tabular font-semibold">{amount(day.sharedCents)}</span>
                  <span className="text-ink-soft">{t('dashboard.figure.shared')}</span>
                </span>
                <span className="flex items-baseline justify-between gap-4">
                  <span className="tabular font-semibold">{amount(day.contributedCents)}</span>
                  <span className="text-ink-soft">{t('trip.figure.unsplit')}</span>
                </span>
              </span>
            </li>
          )
        })}
      </ol>

      <details className="text-sm">
        <summary className="flex min-h-touch w-fit cursor-pointer items-center text-ink-soft">
          {t('dashboard.daily.table')}
        </summary>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-rule-strong text-left font-mono text-[0.6875rem] tracking-widest text-ink-faint uppercase">
                <th scope="col" className="py-2 pr-3 font-medium">
                  {t('dashboard.daily.column.day')}
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  {t('dashboard.figure.shared')}
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  {t('trip.figure.unsplit')}
                </th>
                <th scope="col" className="py-2 pl-3 text-right font-medium">
                  {t('trips.column.spent')}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((day) =>
                day.kind === 'quiet' ? (
                  <tr key={day.from} className="border-b border-rule">
                    <th scope="row" className="py-2 pr-3 text-left font-normal text-ink-soft">
                      {formatShortDateRange(day.from, day.to, locale)}
                    </th>
                    <td colSpan={3} className="py-2 pl-3 text-right text-ink-faint">
                      {t('dashboard.daily.quiet', { days: day.days })}
                    </td>
                  </tr>
                ) : (
                  <tr key={day.day} className="border-b border-rule">
                    <th scope="row" className="py-2 pr-3 text-left font-normal text-ink-soft">
                      {formatShortDate(day.day, locale)}
                    </th>
                    <td className="tabular px-3 py-2 text-right">{amount(day.sharedCents)}</td>
                    <td className="tabular px-3 py-2 text-right">{amount(day.contributedCents)}</td>
                    <td className="tabular py-2 pl-3 text-right font-semibold">
                      {amount(day.totalCents)}
                    </td>
                  </tr>
                ),
              )}
            </tbody>
            <tfoot>
              <tr className="rule-double">
                <th
                  scope="row"
                  className="py-2 pr-3 text-left font-mono text-[0.6875rem] font-medium tracking-widest text-ink-faint uppercase"
                >
                  {t('balances.total')}
                </th>
                <td className="tabular px-3 py-2 text-right font-semibold">
                  {amount(sum((day) => day.sharedCents))}
                </td>
                <td className="tabular px-3 py-2 text-right font-semibold">
                  {amount(sum((day) => day.contributedCents))}
                </td>
                <td className="tabular py-2 pl-3 text-right font-semibold">
                  {amount(sum((day) => day.totalCents))}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </details>
    </figure>
  )
}
