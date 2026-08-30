'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import type { CopyKey } from '@/lib/i18n'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export type SignInState = { error: CopyKey | null }

const text = (value: FormDataEntryValue | null) => (typeof value === 'string' ? value : '')

export async function signIn(_previous: SignInState, formData: FormData): Promise<SignInState> {
  const supabase = await createSupabaseServerClient()

  const { error } = await supabase.auth.signInWithPassword({
    email: text(formData.get('email')).trim(),
    password: text(formData.get('password')),
  })

  // One message for both halves. Telling somebody that the address exists but the password is wrong
  // turns a sign-in form into a way of finding out who has an account here.
  if (error) return { error: 'error.credentials' }

  revalidatePath('/', 'layout')
  redirect('/')
}

export async function signOut() {
  const supabase = await createSupabaseServerClient()
  await supabase.auth.signOut()

  revalidatePath('/', 'layout')
  redirect('/')
}
