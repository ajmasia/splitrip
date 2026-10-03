import type { Viewer } from '@/lib/auth/viewer'
import type { FeedbackKind } from '@/lib/feedback'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export type FeedbackEntry = {
  id: string
  kind: FeedbackKind
  message: string
  path: string | null
  appVersion: string | null
  locale: string | null
  tripName: string | null
  createdAt: string
}

/** Whether the viewer runs this instance. A device identity never does, so it is not even asked. */
export async function isOperator(viewer: Viewer | null): Promise<boolean> {
  if (viewer === null || viewer.isAnonymous) return false

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.rpc('is_operator')
  if (error) throw new Error(error.message)

  return data === true
}

/** Every message, newest first. Empty for anybody who is not an operator. */
export async function listFeedback(): Promise<FeedbackEntry[]> {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.rpc('operator_feedback')
  if (error) throw new Error(error.message)

  type Row = {
    id: string
    kind: FeedbackKind
    message: string
    path: string | null
    app_version: string | null
    locale: string | null
    trip_name: string | null
    created_at: string
  }

  return (data as Row[]).map((row) => ({
    id: row.id,
    kind: row.kind,
    message: row.message,
    path: row.path,
    appVersion: row.app_version,
    locale: row.locale,
    tripName: row.trip_name,
    createdAt: row.created_at,
  }))
}
