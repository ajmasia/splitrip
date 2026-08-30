import Link from 'next/link'

import { AppShell } from '@/components/app-shell'
import { JoinForm } from '@/components/join-form'
import { getViewer } from '@/lib/auth/viewer'
import type { CopyKey } from '@/lib/i18n'
import { getCopy } from '@/lib/i18n/server'
import { invitationStatus, type InvitationStatus } from '@/lib/trips/invitations'

const WHY: Record<Exclude<InvitationStatus, 'open'>, CopyKey> = {
  invalid: 'error.invitation_invalid',
  expired: 'error.invitation_expired',
  closed: 'error.trip_closed',
}

/**
 * The screen says nothing about the trip, and cannot: an invitation is readable only from inside.
 * What it can say is whether this link still opens anything, which is asked here rather than after
 * a name has been typed — a dead link that renders a working-looking form wastes somebody's time
 * and leaves them guessing at what they got wrong.
 */
export default async function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const { locale, t } = await getCopy()
  const [viewer, status] = await Promise.all([getViewer(), invitationStatus(token)])

  if (status !== 'open') {
    return (
      <AppShell locale={locale} t={t} viewer={viewer}>
        <div className="flex max-w-prose flex-col gap-4">
          <h1 className="text-2xl font-bold">{t('join.dead.heading')}</h1>
          <p className="text-ink-soft">{t(WHY[status])}</p>
          <Link
            href="/"
            className="flex min-h-touch w-fit items-center rounded-card border border-rule px-4 text-ink-soft"
          >
            {t('error.page.home')}
          </Link>
        </div>
      </AppShell>
    )
  }

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
