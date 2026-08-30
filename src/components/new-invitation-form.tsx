'use client'

import { useActionState } from 'react'

import { createInvitation, type CreateInvitationState } from '@/app/actions/invitations'
import { translator, type Locale } from '@/lib/i18n'

const EMPTY: CreateInvitationState = { error: null, minted: null }

const ROLES = [
  { value: 'participant', label: 'invite.role.participant' },
  { value: 'admin', label: 'invite.role.admin' },
] as const

export function NewInvitationForm({ tripId, locale }: { tripId: string; locale: Locale }) {
  const t = translator(locale)
  const [state, action, pending] = useActionState(createInvitation, EMPTY)

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="trip_id" value={tripId} />

      <fieldset className="flex flex-col gap-2">
        <legend className="pb-1 text-sm font-medium">{t('invite.role.label')}</legend>
        <div className="flex flex-wrap gap-2">
          {ROLES.map((role, index) => (
            <label
              key={role.value}
              className="flex min-h-touch cursor-pointer items-center gap-2 rounded-card border border-rule bg-surface px-3 text-sm"
            >
              <input
                type="radio"
                name="role"
                value={role.value}
                defaultChecked={index === 0}
                className="accent-accent"
              />
              {t(role.label)}
            </label>
          ))}
        </div>
        <span className="text-sm text-ink-soft">{t('invite.role.hint')}</span>
      </fieldset>

      {state.error ? (
        <p role="alert" className="rounded-card bg-debt-soft px-3 py-2 text-sm text-debt">
          {t(state.error)}
        </p>
      ) : null}

      <div>
        <button
          type="submit"
          disabled={pending}
          className="min-h-touch cursor-pointer rounded-card bg-accent px-4 font-semibold text-accent-ink disabled:opacity-50"
        >
          {pending ? t('invite.pending') : t('invite.create')}
        </button>
      </div>
    </form>
  )
}
