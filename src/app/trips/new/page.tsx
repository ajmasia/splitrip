import { AppShell } from '@/components/app-shell'
import { NewTripForm } from '@/components/new-trip-form'
import { getCopy } from '@/lib/i18n/server'

export default async function NewTripPage() {
  const { locale, t } = await getCopy()

  return (
    <AppShell locale={locale} t={t}>
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-bold">{t('newTrip.heading')}</h1>
        <NewTripForm locale={locale} />
      </div>
    </AppShell>
  )
}
