import { AppShell } from '@/components/app-shell'
import { getCopy } from '@/lib/i18n/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { APP_VERSION } from '@/lib/version'

export default async function HomePage() {
  const { locale, t } = await getCopy()
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <AppShell locale={locale} t={t}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <p className="font-mono text-xs tracking-widest uppercase text-ink-faint">
            {t('app.name')}
          </p>
          <h1 className="text-2xl font-bold">{t('app.tagline')}</h1>
        </div>

        <div className="rounded-card border border-rule bg-surface p-4">
          {user ? (
            <p className="text-sm text-ink-soft">
              {t('identity.known')} <code className="font-mono break-all text-ink">{user.id}</code>
            </p>
          ) : (
            <p className="text-sm text-ink-soft">{t('identity.unknown')}</p>
          )}
        </div>

        <footer className="font-mono text-xs text-ink-faint">
          {t('app.version', { version: APP_VERSION })}
        </footer>
      </div>
    </AppShell>
  )
}
