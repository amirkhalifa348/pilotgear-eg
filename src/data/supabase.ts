import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://ecpeubpedcvxhwdbunzm.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjcGV1YnBlZGN2eGh3ZGJ1bnptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1NDg0MjQsImV4cCI6MjA5NjEyNDQyNH0.qkVHj2vIBbeC3Sx050zrM4sl6fqctucNfjX017unoEs'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  realtime: { params: { eventsPerSecond: 5 } },
  auth: { persistSession: false, autoRefreshToken: false },
})

export const STORE_ID = 'main'
