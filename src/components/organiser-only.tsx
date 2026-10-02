import Link from 'next/link'

import type { Translate } from '@/lib/i18n'

/**
 * What a `participant` meets on a screen meant for the organiser: what it is, why it is not theirs,
 * and the door to what they came for, which is almost always the balances.
 *
 * Shown in place rather than through a 403 page, because a 403 page cannot know which trip it was
 * reached from and so could not point at that trip's balances. Somebody outside the trip never gets
 * this far: they get a plain not-found, which tells them nothing about the trip.
 */
export function OrganiserOnly({
  tripId,
  tripName,
  t,
}: {
  tripId: string
  tripName: string
  t: Translate
}) {
  return (
    <div className="flex flex-col gap-4">
      <Link
        href={`/trips/${tripId}`}
        className="flex min-h-touch w-fit items-center font-mono text-xs tracking-widest text-ink-faint uppercase"
      >
        ← {tripName}
      </Link>
      <div className="flex max-w-prose flex-col gap-3 rounded-card border border-rule bg-surface p-4">
        <h1 className="text-xl font-bold">{t('organiser.only.heading')}</h1>
        <p className="text-ink-soft">{t('organiser.only.body')}</p>
        <Link
          href={`/trips/${tripId}/balances`}
          className="flex min-h-touch w-fit items-center rounded-card bg-accent px-4 text-sm font-semibold text-accent-ink"
        >
          {t('trip.balances')}
        </Link>
      </div>
    </div>
  )
}
