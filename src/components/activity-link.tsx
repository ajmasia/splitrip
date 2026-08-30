'use client'

import Link from 'next/link'
import { useSyncExternalStore } from 'react'

import { translator, type Locale } from '@/lib/i18n'
import {
  getUnseenActivity,
  getUnseenActivityOnServer,
  subscribeToActivity,
} from '@/lib/realtime/activity'

/**
 * The way in to the feed, and the only place the trip says there is something new.
 *
 * It is a count on a link somebody was already going to see, deliberately: an indicator that has to
 * be dismissed, or that moves the page under a thumb halfway through typing an amount, has
 * interrupted them — which is the one thing this is not allowed to do.
 */
export function ActivityLink({
  tripId,
  locale,
  className,
}: {
  tripId: string
  locale: Locale
  className: string
}) {
  const t = translator(locale)
  const unseen = useSyncExternalStore(
    subscribeToActivity,
    getUnseenActivity,
    getUnseenActivityOnServer,
  )
  const count = unseen.tripId === tripId ? unseen.count : 0
  const news = count === 1 ? t('activity.unseen.one') : t('activity.unseen.other', { count })

  return (
    <Link
      href={`/trips/${tripId}/activity`}
      aria-label={count > 0 ? `${t('trip.activity')} — ${news}` : undefined}
      className={className}
    >
      {t('trip.activity')}
      {count > 0 ? (
        <span
          aria-hidden="true"
          className="tabular ml-2 inline-flex min-w-5 items-center justify-center rounded-sm bg-accent px-1.5 font-mono text-[0.6875rem] text-accent-ink"
        >
          {count}
        </span>
      ) : null}
    </Link>
  )
}
