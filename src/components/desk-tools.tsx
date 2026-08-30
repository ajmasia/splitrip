import type { ReactNode } from 'react'

import type { TripRole } from '@/lib/trips/queries'

/**
 * Wraps the affordances built for preparing a trip at a desk — entering a pile of receipts in one
 * run, the dense tables of the organiser dashboard — so that they reach an `admin` on a wide
 * viewport and nobody else.
 *
 * The two halves of the gate are not the same kind of rule, and it matters. The role is decided on
 * the server and the children are simply not rendered, because a control somebody is not allowed to
 * use has no business being in the document at all. The width is decided by CSS, because a tree
 * that depends on a width measured in JavaScript is a tree the server cannot have rendered, and the
 * first paint would disagree with itself.
 *
 * `contents` rather than `block`: above the breakpoint the wrapper leaves no box behind, so the
 * children lay out inside whatever grid or column they were written for.
 */
export function DeskTools({ role, children }: { role: TripRole | null; children: ReactNode }) {
  if (role !== 'admin') return null

  return <div className="hidden wide:contents">{children}</div>
}
