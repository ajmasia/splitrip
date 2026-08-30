'use client'

import { useEffect, useState } from 'react'

import { localeFromDocument } from '@/lib/i18n/browser'
import { translator } from '@/lib/i18n'

/**
 * Registers the service worker, and carries the two things it has to tell the reader: that the
 * network is gone, and that a newer version is waiting.
 *
 * The strip sits at the top of the document in normal flow rather than floating over it, so it
 * never covers the header on a phone, and it renders nothing at all when there is nothing to say.
 *
 * Registration happens only in a production build. A worker caching `/_next/static` while the
 * development server is hot-reloading serves yesterday's modules, which looks like a bug in
 * whatever you were working on rather than a bug in the worker.
 */
export function ConnectionBar() {
  const [offline, setOffline] = useState(false)
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null)
  const t = translator(localeFromDocument())

  useEffect(() => {
    const sync = () => setOffline(!navigator.onLine)
    sync()
    window.addEventListener('online', sync)
    window.addEventListener('offline', sync)
    return () => {
      window.removeEventListener('online', sync)
      window.removeEventListener('offline', sync)
    }
  }, [])

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return

    let reloading = false
    const onControllerChange = () => {
      // The new worker has taken over. One reload, and the page is running the version it serves.
      if (reloading) return
      reloading = true
      window.location.reload()
    }
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)

    void navigator.serviceWorker.register('/sw.js').then((registration) => {
      // Already waiting from a previous visit, before anything had a chance to fire.
      if (registration.waiting && navigator.serviceWorker.controller) {
        setWaiting(registration.waiting)
      }

      registration.addEventListener('updatefound', () => {
        const installing = registration.installing
        if (!installing) return

        installing.addEventListener('statechange', () => {
          // With no controller this is the first install, which is not an update to announce.
          if (installing.state === 'installed' && navigator.serviceWorker.controller) {
            setWaiting(installing)
          }
        })
      })
    })

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
    }
  }, [])

  if (!offline && waiting === null) return null

  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-center gap-3 border-b border-rule bg-surface-2 px-4 py-2 text-center text-sm"
    >
      {offline ? (
        <span className="text-debt">{t('connection.offline')}</span>
      ) : (
        <>
          <span className="text-ink-soft">{t('update.available')}</span>
          <button
            type="button"
            onClick={() => waiting?.postMessage('apply-update')}
            className="min-h-touch cursor-pointer rounded-card border border-rule px-4 text-sm font-semibold"
          >
            {t('update.apply')}
          </button>
        </>
      )}
    </div>
  )
}
