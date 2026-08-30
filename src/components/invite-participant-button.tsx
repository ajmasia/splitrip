'use client'

import { useActionState, useEffect, useRef } from 'react'

import { createInvitation, type CreateInvitationState } from '@/app/actions/invitations'
import { CopyLink } from '@/components/copy-link'
import { QrSvg } from '@/components/qr-code'
import { RevokeInvitationButton } from '@/components/revoke-invitation-button'
import { formatDate } from '@/lib/i18n/format'
import { translator, type Locale } from '@/lib/i18n'

const EMPTY: CreateInvitationState = { error: null, minted: null }

/**
 * Hands one person the application.
 *
 * The link it mints opens their place and nothing else, so there is no name to type and no way to
 * walk into somebody else's seat. For a participant already using a device it is the way back in
 * after losing a phone, which is the one recovery the design otherwise leaves out.
 *
 * The link appears where the button was, in a dialogue: whoever pressed it wants to show a camera
 * or paste it into a chat, and sending them to another screen to look for it would lose the one
 * thing they asked for. A native `<dialog>` rather than a div, because the browser already knows
 * how to trap focus in one and close it on Escape.
 */
export function InviteParticipantButton({
  participantId,
  tripId,
  name,
  hasDevice,
  locale,
}: {
  participantId: string
  tripId: string
  name: string
  hasDevice: boolean
  locale: Locale
}) {
  const t = translator(locale)
  const [state, action, pending] = useActionState(createInvitation, EMPTY)
  const dialog = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    if (state.minted !== null) dialog.current?.showModal()
  }, [state.minted])

  return (
    <>
      <form action={action} className="flex flex-col items-end gap-1">
        <input type="hidden" name="trip_id" value={tripId} />
        <input type="hidden" name="participant_id" value={participantId} />
        <button
          type="submit"
          disabled={pending}
          aria-label={t('trip.invite.label', { name })}
          className="min-h-touch cursor-pointer rounded-card border border-rule px-3 text-sm text-ink-soft disabled:opacity-50"
        >
          {pending
            ? t('trip.invite.pending')
            : t(hasDevice ? 'trip.invite.again' : 'trip.invite.one')}
        </button>

        {state.error ? (
          <p role="alert" className="text-right text-sm text-debt">
            {t(state.error)}
          </p>
        ) : null}
      </form>

      {/*
        Outside the form, deliberately: revoking is a form of its own, and a form inside a form is
        dropped by the browser, which is a button that silently does nothing.
      */}
      {state.minted !== null ? (
        <dialog
          ref={dialog}
          className="m-auto max-w-prose rounded-card border border-rule bg-surface p-5 text-ink backdrop:bg-ink/40"
        >
          <div className="flex flex-col items-start gap-4">
            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-semibold">{t('trip.invite.ready', { name })}</h2>
              <p className="text-sm text-ink-soft">{t('trip.invite.ready.body', { name })}</p>
            </div>

            <div className="flex flex-col items-start gap-4 wide:flex-row">
              <QrSvg
                size={state.minted.qr.size}
                path={state.minted.qr.path}
                label={t('invite.qr.label')}
              />
              <div className="flex w-full min-w-0 flex-col gap-2">
                <CopyLink url={state.minted.url} locale={locale} />
                <span className="tabular text-sm text-ink-soft">
                  {t('invite.expires', {
                    date: formatDate(state.minted.expiresAt.slice(0, 10), locale),
                  })}
                </span>
              </div>
            </div>

            {/*
              Thinking better of it belongs here too. Handing somebody a link and then having to
              find another screen to take it back is how a live link gets forgotten.
            */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => dialog.current?.close()}
                className="min-h-touch cursor-pointer rounded-card border border-rule px-4 text-sm font-semibold"
              >
                {t('trip.invite.close')}
              </button>
              <RevokeInvitationButton
                invitationId={state.minted.id}
                tripId={tripId}
                locale={locale}
                onRevoked={() => dialog.current?.close()}
              />
            </div>
          </div>
        </dialog>
      ) : null}
    </>
  )
}
