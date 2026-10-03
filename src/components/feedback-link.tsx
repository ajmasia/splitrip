'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { feedbackHref } from '@/lib/feedback'
import { translator, type Locale } from '@/lib/i18n'

/**
 * The way to the feedback form from every screen, carrying the screen it was opened from.
 *
 * A client component only to read the path, which the shared frame is not told: the form itself is
 * rendered on the server. On the form there is nothing to link to — it is where this leads.
 */
export function FeedbackLink({ locale }: { locale: Locale }) {
  const t = translator(locale)
  const pathname = usePathname()

  if (pathname.startsWith('/feedback') || pathname.startsWith('/operator')) return null

  return (
    <Link
      href={feedbackHref(pathname)}
      className="flex min-h-touch w-fit items-center text-sm text-ink-faint underline decoration-rule underline-offset-4 hover:text-ink-soft hover:decoration-current"
    >
      {t('feedback.link')}
    </Link>
  )
}
