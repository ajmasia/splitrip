import { AppShell } from '@/components/app-shell'
import { JoinForm } from '@/components/join-form'
import { getViewer } from '@/lib/auth/viewer'
import { getCopy } from '@/lib/i18n/server'

/**
 * The screen says nothing about the trip, and cannot: an invitation is readable only from inside,
 * so whether this token is any good is answered when a name is submitted. Which is the behaviour
 * wanted anyway — a page that greeted a bad token with the name of a trip would be a way of
 * finding out that the trip exists.
 */
export default async function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const { locale, t } = await getCopy()
  const viewer = await getViewer()

  return (
    <AppShell locale={locale} t={t} viewer={viewer}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold">{t('join.heading')}</h1>
          <p className="max-w-prose text-ink-soft">{t('join.body')}</p>
        </div>
        <JoinForm token={token} locale={locale} />
      </div>
    </AppShell>
  )
}
