import Link from 'next/link'
import { notFound } from 'next/navigation'

import { AppShell } from '@/components/app-shell'
import { ExpenseDetail } from '@/components/expense-detail'
import { TripRealtime } from '@/components/trip-realtime'
import { getViewer } from '@/lib/auth/viewer'
import { intlLocale } from '@/lib/i18n'
import { getCopy } from '@/lib/i18n/server'
import { formatAmount } from '@/lib/money/amount'
import {
  DEFAULT_FILTER,
  filterExpenses,
  filterQuery,
  readExpenseFilter,
} from '@/lib/trips/expense-filter'
import { getTrip, listExpenses } from '@/lib/trips/queries'

/**
 * Every expense of the trip, for the organiser to go through.
 *
 * The filter lives in the address and the form is a plain GET: choosing and submitting rewrites the
 * query string and the server renders the list again. Nothing has to hydrate for it to work, a
 * filtered list survives a reload, and it can be handed to somebody else as a link.
 */
export default async function ExpenseDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { id } = await params
  const { locale, t } = await getCopy()
  const viewer = await getViewer()

  const found = await getTrip(id)
  if (!found) notFound()

  const { trip, participants } = found
  // An organiser view, like the dashboard it hangs from; telling anybody else so is its own task.
  if (trip.yourRole !== 'admin') notFound()

  const filter = readExpenseFilter(
    await searchParams,
    participants.map((participant) => participant.id),
  )
  const { expenses, totalCents } = filterExpenses(await listExpenses(id), filter)
  const filtered = filter.payer !== null || filter.type !== null
  const basePath = `/trips/${id}/dashboard/expenses`
  const you = participants.find((participant) => participant.isYou)
  const amount = (cents: number) => formatAmount(cents, intlLocale(locale))
  const field = 'min-h-touch rounded-card border border-rule bg-surface px-3 text-ink'

  return (
    <AppShell locale={locale} t={t} viewer={viewer}>
      <TripRealtime tripId={id} youParticipantId={you?.id ?? null} />
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Link
            href={`/trips/${id}/dashboard`}
            className="flex min-h-touch w-fit items-center font-mono text-xs tracking-widest text-ink-faint uppercase"
          >
            ← {t('dashboard.heading')}
          </Link>
          <h1 className="text-2xl font-bold">{t('detail.heading')}</h1>
          <p className="max-w-prose text-ink-soft">{t('detail.subtitle')}</p>
        </div>

        <form
          method="get"
          action={basePath}
          className="flex flex-wrap items-end gap-3 rounded-card border border-rule bg-surface p-3"
        >
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-ink-soft">{t('expenses.column.payer')}</span>
            <select name="payer" defaultValue={filter.payer ?? ''} className={field}>
              <option value="">{t('detail.filter.payer.any')}</option>
              {participants.map((participant) => (
                <option key={participant.id} value={participant.id}>
                  {participant.displayName}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-ink-soft">{t('expenses.column.type')}</span>
            <select name="type" defaultValue={filter.type ?? ''} className={field}>
              <option value="">{t('detail.filter.type.any')}</option>
              <option value="shared">{t('expenses.type.shared')}</option>
              <option value="contribution">{t('expenses.type.contribution')}</option>
            </select>
          </label>
          {/* The order is not part of the form, but submitting it must not throw it away. */}
          {filter.sort !== DEFAULT_FILTER.sort ? (
            <input type="hidden" name="sort" value={filter.sort} />
          ) : null}
          {filter.dir !== DEFAULT_FILTER.dir ? (
            <input type="hidden" name="dir" value={filter.dir} />
          ) : null}
          <button
            type="submit"
            className="min-h-touch cursor-pointer rounded-card bg-accent px-4 text-sm font-semibold text-accent-ink"
          >
            {t('detail.filter.apply')}
          </button>
          {filtered ? (
            <Link
              href={`${basePath}${filterQuery({ ...filter, payer: null, type: null })}`}
              className="flex min-h-touch items-center px-2 text-sm text-ink-soft"
            >
              {t('detail.filter.clear')}
            </Link>
          ) : null}
        </form>

        <section className="flex flex-col gap-3">
          <p className="tabular text-lg font-semibold">
            {expenses.length === 1
              ? t('detail.total.one', { amount: amount(totalCents) })
              : t('detail.total.other', { count: expenses.length, amount: amount(totalCents) })}
          </p>

          {expenses.length === 0 ? (
            <div className="flex max-w-prose flex-col gap-1 rounded-card border border-dashed border-rule p-4">
              <p className="font-semibold">
                {filtered ? t('detail.empty.title') : t('expenses.empty.title')}
              </p>
              <p className="text-ink-soft">
                {filtered ? t('detail.empty.body') : t('dashboard.empty.body')}
              </p>
            </div>
          ) : (
            <ExpenseDetail
              expenses={expenses}
              totalCents={totalCents}
              filter={filter}
              basePath={basePath}
              tripId={id}
              locale={locale}
              t={t}
            />
          )}
        </section>
      </div>
    </AppShell>
  )
}
