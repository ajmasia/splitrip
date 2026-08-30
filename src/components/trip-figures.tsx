import { intlLocale, type Locale, type Translate } from '@/lib/i18n'
import { formatAmount } from '@/lib/money/amount'
import type { TripSummary } from '@/lib/trips/queries'

function Figure({ label, amount }: { label: string; amount: string }) {
  return (
    <div className="flex flex-col justify-between gap-1 rounded-card border border-rule bg-surface p-3 wide:p-4">
      <p className="font-mono text-[0.625rem] tracking-widest text-ink-faint uppercase wide:text-xs">
        {label}
      </p>
      <p className="tabular text-xl font-semibold wide:text-2xl">{amount}</p>
    </div>
  )
}

/**
 * What the trip has cost, in the three figures that answer it: everything spent, what that works
 * out at per person, and the part nobody has to pay back.
 *
 * The average divides the shared spending rather than the total. A contribution charges nobody, so
 * counting it here would report a cost per person that nobody is ever going to be asked for — and
 * it is precisely the figure somebody would use to decide whether the trip is going over budget.
 */
export function TripFigures({
  trip,
  locale,
  t,
}: {
  trip: TripSummary
  locale: Locale
  t: Translate
}) {
  const amount = (cents: number) => formatAmount(cents, intlLocale(locale))
  const perPerson =
    trip.participantCount === 0 ? 0 : Math.round(trip.sharedCents / trip.participantCount)

  return (
    <div className="grid grid-cols-3 gap-2 wide:gap-3">
      <Figure label={t('trips.column.spent')} amount={amount(trip.totalCents)} />
      <Figure label={t('trip.figure.perPerson')} amount={amount(perPerson)} />
      <Figure label={t('trip.figure.unsplit')} amount={amount(trip.contributedCents)} />
    </div>
  )
}
