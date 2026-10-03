import { AppShell } from '@/components/app-shell'
import { FeedbackForm } from '@/components/feedback-form'
import { getViewer } from '@/lib/auth/viewer'
import { applicationPath, tripIdOrNull } from '@/lib/feedback'
import { getCopy } from '@/lib/i18n/server'
import { APP_VERSION } from '@/lib/version'

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)

/**
 * Open to anybody, with or without a session, and opening it issues no identity: only sending does.
 */
export default async function FeedbackPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { locale, t } = await getCopy()
  const viewer = await getViewer()
  const query = await searchParams

  return (
    <AppShell locale={locale} t={t} viewer={viewer}>
      <div className="flex flex-col gap-6">
        <div className="flex max-w-prose flex-col gap-2">
          <h1 className="text-2xl font-bold">{t('feedback.heading')}</h1>
          <p className="text-ink-soft">{t('feedback.intro')}</p>
        </div>
        <FeedbackForm
          locale={locale}
          from={applicationPath(first(query.from))}
          tripId={tripIdOrNull(first(query.trip))}
          version={APP_VERSION}
        />
      </div>
    </AppShell>
  )
}
