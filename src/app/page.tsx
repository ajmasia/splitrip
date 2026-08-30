import { LanguageSwitcher } from '@/components/language-switcher'
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
    <main>
      <h1>{t('app.name')}</h1>
      <p>{t('app.tagline')}</p>
      {user ? (
        <p>
          {t('identity.known')} <code>{user.id}</code>
        </p>
      ) : (
        <p>{t('identity.unknown')}</p>
      )}
      <LanguageSwitcher locale={locale} t={t} />
      <footer>{t('app.version', { version: APP_VERSION })}</footer>
    </main>
  )
}
