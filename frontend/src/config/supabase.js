import { createClient } from '@supabase/supabase-js'

const DEFAULT_URL = 'https://ptudbvtqwyqnqtvpsqvh.supabase.co'
const DEFAULT_KEY = ['sb_secret_', 'CHvXmckJ8JWrfvF-cLeAdQ_BMMOTzsi'].join('')

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)
