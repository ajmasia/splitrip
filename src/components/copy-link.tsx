'use client'

import { useRef, useState } from 'react'

import { translator, type Locale } from '@/lib/i18n'

/**
 * The link is in a field rather than in a paragraph so that it can always be copied by hand: the
 * clipboard API needs a secure context, and a phone reading a preview deployment over plain HTTP
 * would otherwise be left with a button that does nothing. Selecting the text first means the
 * fallback is one keystroke, not a careful drag.
 */
export function CopyLink({ url, locale }: { url: string; locale: Locale }) {
  const t = translator(locale)
  const field = useRef<HTMLInputElement>(null)
  const [copied, setCopied] = useState(false)

  async function copy() {
    field.current?.select()

    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // No clipboard here. The link is selected, which is as far as the browser lets us go.
    }
  }

  return (
    <div className="flex w-full flex-col gap-2 wide:flex-row">
      <input
        ref={field}
        readOnly
        value={url}
        aria-label={t('invite.link.label')}
        onFocus={(event) => event.currentTarget.select()}
        className="min-h-touch min-w-0 flex-1 rounded-card border border-rule bg-surface px-3 font-mono text-sm text-ink-soft"
      />
      <button
        type="button"
        onClick={copy}
        aria-live="polite"
        className="min-h-touch cursor-pointer rounded-card border border-rule px-4 text-sm font-semibold"
      >
        {copied ? t('invite.copied') : t('invite.copy')}
      </button>
    </div>
  )
}
