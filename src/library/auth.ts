import { supabase } from './supabase'

export async function signUpUser(
  email: string,
  password: string,
  userId: string,
  fullName: string
) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        user_id: userId,
        full_name: fullName,
      },
    },
  })

  if (error) throw error
  return data
}

export async function loginUser(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) throw error
  return data
}

export async function logoutUser() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}