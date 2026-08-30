'use client'

import { translator } from '@/lib/i18n'
import { localeFromDocument } from '@/lib/i18n/browser'

/**
 * The last resort: what shows when the root layout itself throws. It replaces the whole document,
 * which means the stylesheet never reaches it, so the few colours it needs are carried inline — in
 * both schemes, since there is no theme to inherit either.
 */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string }
  retry: () => void
}) {
  const locale = localeFromDocument()
  const t = translator(locale)

  return (
    <html lang={locale}>
      <body
        style={{
          margin: 0,
          minHeight: '100dvh',
          background: '#edefec',
          color: '#131816',
          fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
          lineHeight: 1.55,
        }}
      >
        <style>{`
          @media (prefers-color-scheme: dark) {
            body { background: #0e1211 !important; color: #e9edea !important; }
            .splitrip-soft { color: #9aa39f !important; }
            .splitrip-retry { background: #74c4ac !important; color: #0e1211 !important; }
          }
        `}</style>
        <main
          style={{
            maxWidth: '48rem',
            margin: '0 auto',
            padding: '2.5rem 1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            alignItems: 'flex-start',
          }}
        >
          <h1 style={{ fontSize: '1.5rem', margin: 0 }}>{t('error.page.heading')}</h1>
          <p className="splitrip-soft" style={{ color: '#5b635f', margin: 0 }}>
            {t('error.page.body')}
          </p>
          <button
            type="button"
            onClick={retry}
            className="splitrip-retry"
            style={{
              font: 'inherit',
              fontWeight: 600,
              minHeight: '2.75rem',
              padding: '0 1rem',
              border: 0,
              borderRadius: '0.375rem',
              background: '#1f5b4e',
              color: '#fbfcfa',
              cursor: 'pointer',
            }}
          >
            {t('error.page.retry')}
          </button>
          {error.digest ? (
            <p
              className="splitrip-soft"
              style={{ color: '#8a928e', fontSize: '0.75rem', fontFamily: 'monospace', margin: 0 }}
            >
              {error.digest}
            </p>
          ) : null}
        </main>
      </body>
    </html>
  )
}
