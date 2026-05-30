import { createClient } from '@supabase/supabase-js'

console.log('SUPABASE URL:', import.meta.env.VITE_SUPABASE_URL)
console.log('SUPABASE KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY)

const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase env vars. Check your .env.local file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)