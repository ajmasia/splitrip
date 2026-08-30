import { notFound } from 'next/navigation'

import { AppShell } from '@/components/app-shell'
import { NewExpenseForm } from '@/components/new-expense-form'
import { getViewer } from '@/lib/auth/viewer'
import { getCopy } from '@/lib/i18n/server'
import { getTrip } from '@/lib/trips/queries'

/** The date the server is on, corrected to the reader's own once the form is running. */
function serverToday(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export default async function NewExpensePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { locale, t } = await getCopy()
  const viewer = await getViewer()

  const found = await getTrip(id)
  if (!found) notFound()

  const { trip, participants } = found
  const you = participants.find((participant) => participant.isYou)

  // Not a member, or the trip has ended: neither is a screen with a form on it.
  if (trip.status !== 'open' || trip.yourRole === null || you === undefined) notFound()

  return (
    <AppShell locale={locale} t={t} viewer={viewer}>
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-bold">{t('newExpense.heading')}</h1>
        <NewExpenseForm
          tripId={id}
          today={serverToday()}
          participants={participants}
          yourRole={trip.yourRole}
          yourParticipantId={you.id}
          locale={locale}
        />
      </div>
    </AppShell>
  )
}
