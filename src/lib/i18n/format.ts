import { intlLocale, type Locale } from './index'

/**
 * A trip date is a civil date — the day of the trip, with no time and no zone. Formatting it in UTC
 * is what stops a dinner in Reykjavik from showing up on the following day for a reader whose
 * device sits west of the meridian.
 */
export function formatDate(day: string, locale: Locale): string {
  const date = new Date(`${day}T00:00:00Z`)

  if (Number.isNaN(date.getTime())) {
    throw new TypeError(`A trip date must read as YYYY-MM-DD, got ${day}`)
  }

  return new Intl.DateTimeFormat(intlLocale(locale), {
    dateStyle: 'long',
    timeZone: 'UTC',
  }).format(date)
}

/** A trip may carry both dates, one of them, or neither. */
export function formatDateRange(
  start: string | null,
  end: string | null,
  locale: Locale,
): string | null {
  if (start === null && end === null) return null
  if (start === null) return formatDate(end as string, locale)
  if (end === null) return formatDate(start, locale)
  if (start === end) return formatDate(start, locale)

  return new Intl.DateTimeFormat(intlLocale(locale), {
    dateStyle: 'long',
    timeZone: 'UTC',
  }).formatRange(new Date(`${start}T00:00:00Z`), new Date(`${end}T00:00:00Z`))
}
