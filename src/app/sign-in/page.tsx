import { AppShell } from '@/components/app-shell'
import { SignInForm } from '@/components/sign-in-form'
import { getViewer } from '@/lib/auth/viewer'
import { getCopy } from '@/lib/i18n/server'

export default async function SignInPage() {
  const { locale, t } = await getCopy()
  const viewer = await getViewer()

  return (
    <AppShell locale={locale} t={t} viewer={viewer}>
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-bold">{t('signIn.heading')}</h1>
        <SignInForm locale={locale} />
      </div>
    </AppShell>
  )
}
