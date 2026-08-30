import Link from 'next/link'
import { notFound } from 'next/navigation'

import { AppShell } from '@/components/app-shell'
import { CopyLink } from '@/components/copy-link'
import { NewInvitationForm } from '@/components/new-invitation-form'
import { Pill } from '@/components/pill'
import { QrCode } from '@/components/qr-code'
import { RevokeInvitationButton } from '@/components/revoke-invitation-button'
import { getViewer } from '@/lib/auth/viewer'
import { formatDate } from '@/lib/i18n/format'
import { getCopy } from '@/lib/i18n/server'
import { listInvitations } from '@/lib/trips/invitations'
import { getTrip } from '@/lib/trips/queries'

export default async function InvitePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { locale, t } = await getCopy()
  const viewer = await getViewer()

  const found = await getTrip(id)

  // A participant is shown the same nothing as a stranger. Who organises a trip is not something a
  // screen should confirm to somebody who cannot act on it.
  if (!found || found.trip.yourRole !== 'admin') notFound()

  const { trip } = found
  const invitations = await listInvitations(id)

  return (
    <AppShell locale={locale} t={t} viewer={viewer}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Link
            href={`/trips/${id}`}
            className="font-mono text-xs tracking-widest text-ink-faint uppercase"
          >
            ← {trip.name}
          </Link>
          <h1 className="text-2xl font-bold">{t('invite.heading')}</h1>
          <p className="max-w-prose text-ink-soft">{t('invite.body')}</p>
        </div>

        {trip.status === 'open' ? (
          <NewInvitationForm tripId={id} locale={locale} />
        ) : (
          <p className="rounded-card border border-rule bg-surface-2 px-3 py-2 text-sm text-ink-soft">
            {t('invite.closed')}
          </p>
        )}

        <section className="flex flex-col gap-4">
          <h2 className="font-mono text-xs tracking-widest text-ink-faint uppercase">
            {t('invite.live')}
          </h2>

          {invitations.length === 0 ? (
            <div className="rounded-card border border-rule bg-surface p-4">
              <p className="font-medium">{t('invite.empty.title')}</p>
              <p className="text-ink-soft">{t('invite.empty.body')}</p>
            </div>
          ) : (
            <ul className="flex flex-col gap-4">
              {invitations.map((invitation) => (
                <li
                  key={invitation.id}
                  className="flex flex-col items-start gap-4 rounded-card border border-rule bg-surface p-4 wide:flex-row"
                >
                  <QrCode text={invitation.url} label={t('invite.qr.label')} />
                  <div className="flex w-full min-w-0 flex-col gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Pill tone={invitation.role === 'admin' ? 'accent' : 'plain'}>
                        {t(
                          invitation.role === 'admin'
                            ? 'invite.role.admin'
                            : 'invite.role.participant',
                        )}
                      </Pill>
                      <span className="tabular text-sm text-ink-soft">
                        {t('invite.expires', {
                          date: formatDate(invitation.expiresAt.slice(0, 10), locale),
                        })}
                      </span>
                    </div>
                    <CopyLink url={invitation.url} locale={locale} />
                    {trip.status === 'open' ? (
                      <RevokeInvitationButton
                        invitationId={invitation.id}
                        tripId={id}
                        locale={locale}
                      />
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AppShell>
  )
}
