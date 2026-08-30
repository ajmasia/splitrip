import Link from 'next/link'
import { notFound } from 'next/navigation'

import { AppShell } from '@/components/app-shell'
import { EditExpenseForm } from '@/components/edit-expense-form'
import { Pill } from '@/components/pill'
import { getViewer } from '@/lib/auth/viewer'
import { intlLocale } from '@/lib/i18n'
import { formatDate } from '@/lib/i18n/format'
import { getCopy } from '@/lib/i18n/server'
import { formatAmount } from '@/lib/money/amount'
import { getExpense, getTrip } from '@/lib/trips/queries'

export default async function ExpensePage({
  params,
}: {
  params: Promise<{ id: string; expenseId: string }>
}) {
  const { id, expenseId } = await params
  const { locale, t } = await getCopy()
  const viewer = await getViewer()

  const found = await getTrip(id)
  if (!found) notFound()

  const { trip, participants } = found
  const you = participants.find((participant) => participant.isYou)
  if (trip.yourRole === null || you === undefined) notFound()

  const expense = await getExpense(expenseId, participants)
  if (!expense || expense.tripId !== id) notFound()

  // The database refuses the same thing, and says why. This only decides whether to draw a form
  // somebody would not be allowed to use.
  const mayChange =
    trip.status === 'open' && (trip.yourRole === 'admin' || expense.createdBy === you.id)

  const amount = (cents: number) => formatAmount(cents, intlLocale(locale))

  return (
    <AppShell locale={locale} t={t} viewer={viewer}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Link
            href={`/trips/${id}`}
            className="flex min-h-touch w-fit items-center font-mono text-xs tracking-widest text-ink-faint uppercase"
          >
            ← {trip.name}
          </Link>
          <h1 className="text-2xl font-bold">{expense.description}</h1>
          <p className="tabular text-3xl font-semibold">{amount(expense.amountCents)}</p>
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone={expense.type === 'contribution' ? 'accent' : 'plain'}>
              {t(expense.type === 'shared' ? 'expenses.type.shared' : 'expenses.type.contribution')}
            </Pill>
            <span className="text-sm text-ink-soft">
              {formatDate(expense.spentOn, locale)} ·{' '}
              {t('expense.paidBy', {
                name: expense.paidByName,
              })}
            </span>
          </div>
          <p className="text-sm text-ink-faint">
            {t('expense.recordedBy', { name: expense.createdByName })}
          </p>
        </div>

        <section className="flex flex-col gap-3">
          <h2 className="font-mono text-xs tracking-widest text-ink-faint uppercase">
            {t('expense.shares')}
          </h2>
          {expense.shares.length === 0 ? (
            <p className="text-ink-soft">{t('expense.shares.none')}</p>
          ) : (
            <ul className="flex flex-col">
              {expense.shares.map((share) => (
                <li
                  key={share.participantId}
                  className="flex min-h-touch items-center justify-between gap-3 border-b border-rule py-2 last:border-b-0"
                >
                  <span>{share.displayName}</span>
                  <span className="tabular font-medium">{amount(share.amountCents)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="flex flex-col gap-3 border-t border-rule pt-6">
          <h2 className="font-mono text-xs tracking-widest text-ink-faint uppercase">
            {t('expense.edit')}
          </h2>
          {mayChange ? (
            <EditExpenseForm
              expense={expense}
              participants={participants}
              yourRole={trip.yourRole}
              locale={locale}
            />
          ) : (
            <p className="max-w-prose text-ink-soft">
              {t(trip.status === 'open' ? 'expense.readonly' : 'expense.closed')}
            </p>
          )}
        </section>
      </div>
    </AppShell>
  )
}
