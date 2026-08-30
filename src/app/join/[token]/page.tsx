import Link from 'next/link'

import { AppShell } from '@/components/app-shell'
import { ClaimPlaceForm } from '@/components/claim-place-form'
import { JoinForm } from '@/components/join-form'
import { getViewer } from '@/lib/auth/viewer'
import type { CopyKey } from '@/lib/i18n'
import { getCopy } from '@/lib/i18n/server'
import { invitationPlace, invitationStatus, type InvitationStatus } from '@/lib/trips/invitations'

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
  const [viewer, status, place] = await Promise.all([
    getViewer(),
    invitationStatus(token),
    invitationPlace(token),
  ])

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

  // A link that names a place has nothing to ask. Whoever holds it was invited by name, and the
  // one thing a form could add here is a chance to type that name wrong.
  return (
    <AppShell locale={locale} t={t} viewer={viewer}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold">
            {place === null ? t('join.heading') : t('join.place.heading', { name: place.name })}
          </h1>
          <p className="max-w-prose text-ink-soft">
            {place === null
              ? t('join.body')
              : t(place.inUse ? 'join.place.inUse' : 'join.place.body', { name: place.name })}
          </p>
        </div>
        {place === null ? (
          <JoinForm token={token} locale={locale} />
        ) : (
          <ClaimPlaceForm token={token} place={place} locale={locale} />
        )}
      </div>
    </AppShell>
  )
}
