import type { ReactNode } from 'react'

const TONES = {
  plain: 'border-rule text-ink-soft',
  accent: 'border-transparent bg-accent-soft text-accent',
  quiet: 'border-transparent bg-surface-2 text-ink-soft',
  debt: 'border-transparent bg-debt-soft text-debt',
} as const

export type PillTone = keyof typeof TONES

/** State and role are always spelled out, never left to colour alone. */
export function Pill({ tone = 'plain', children }: { tone?: PillTone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-sm border px-2 py-0.5 font-mono text-[0.6875rem] font-medium tracking-wider uppercase ${TONES[tone]}`}
    >
      {children}
    </span>
  )
}
