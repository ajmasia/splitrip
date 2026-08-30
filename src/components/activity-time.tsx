'use client'

import { intlLocale, type Locale } from '@/lib/i18n'

/**
 * When something happened, in the reader's own time zone.
 *
 * An activity entry is an instant, not a civil date like an expense's, so unlike everywhere else in
 * this application it cannot be formatted in UTC and left alone. The server has no way to know the
 * zone of the browser it is rendering for, so it formats in its own and the browser formats again
 * in the reader's — which is precisely the mismatch `suppressHydrationWarning` exists for, and the
 * only place in this codebase that uses it. The machine-readable instant is on the element either
 * way.
 */
export function ActivityTime({ at, locale }: { at: string; locale: Locale }) {
  const when = new Date(at)

  return (
    <time dateTime={at} suppressHydrationWarning className="tabular text-sm text-ink-soft">
      {new Intl.DateTimeFormat(intlLocale(locale), {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(when)}
    </time>
  )
}
