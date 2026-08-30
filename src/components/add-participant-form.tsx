'use client'

import { useActionState, useEffect, useRef, useState } from 'react'

import { addParticipant, type AddParticipantState } from '@/app/actions/participants'
import { translator, type Locale } from '@/lib/i18n'

const EMPTY: AddParticipantState = { error: null, at: 0 }

/**
 * Adds somebody by name alone.
 *
 * It stays closed until asked for: most trips never need it, and a form sitting open under the
 * participant list would suggest that adding people by hand is the ordinary way in, when the
 * ordinary way in is an invitation.
 */
export function AddParticipantForm({ tripId, locale }: { tripId: string; locale: Locale }) {
  const t = translator(locale)
  const [state, action, pending] = useActionState(addParticipant, EMPTY)
  const [open, setOpen] = useState(false)
  const field = useRef<HTMLInputElement>(null)
  const last = useRef(0)

  // One went in. Clear the field and stay open: adding two children is more likely than adding one.
  useEffect(() => {
    if (state.at === 0 || state.at === last.current) return
    last.current = state.at
    if (field.current) field.current.value = ''
    field.current?.focus()
  }, [state.at])

  useEffect(() => {
    if (open) field.current?.focus()
  }, [open])

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-touch w-fit cursor-pointer items-center rounded-card border border-rule px-4 text-sm font-semibold"
      >
        {t('trip.addParticipant')}
      </button>
    )
  }

  return (
    <form action={action} className="flex max-w-prose flex-col gap-2">
      <input type="hidden" name="trip_id" value={tripId} />
      <label htmlFor="display_name" className="text-sm font-medium">
        {t('trip.addParticipant.label')}
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={field}
          id="display_name"
          name="display_name"
          required
          autoComplete="off"
          placeholder={t('trip.addParticipant.placeholder')}
          className="min-h-touch flex-1 rounded-card border border-rule bg-surface px-3 text-ink"
        />
        <button
          type="submit"
          disabled={pending}
          className="min-h-touch cursor-pointer rounded-card bg-accent px-4 text-sm font-semibold text-accent-ink disabled:opacity-50"
        >
          {pending ? t('trip.addParticipant.pending') : t('trip.addParticipant.submit')}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="min-h-touch cursor-pointer rounded-card px-3 text-sm text-ink-soft"
        >
          {t('trip.addParticipant.done')}
        </button>
      </div>
      <p className="text-sm text-ink-soft">{t('trip.addParticipant.hint')}</p>
      {state.error ? (
        <p role="alert" className="text-sm text-debt">
          {t(state.error)}
        </p>
      ) : null}
    </form>
  )
}
