import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: true, autoRefreshToken: true }
})

export const getProfile = async (userId) => {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
  return { data, error }
}

export const updateProfile = async (userId, updates) => {
  const { data, error } = await supabase.from('profiles')
    .update({ ...updates, updated_at: new Date() }).eq('id', userId).select().single()
  return { data, error }
}

export const uploadFinds = async (userId, finds) => {
  const rows = finds.map(f => ({
    user_id: userId, local_id: f.id, name: f.name, category: f.category,
    depth: f.depth, notes: f.notes, rarity: f.rarity, lat: f.lat, lng: f.lng,
    date: f.date, ai_data: f.aiData || null,
  }))
  return await supabase.from('finds').upsert(rows, { onConflict: 'user_id,local_id' })
}

export const uploadSessions = async (userId, sessions) => {
  const rows = sessions.map(s => ({
    user_id: userId, local_id: s.id, name: s.name, date: s.date,
    duration: s.duration, distance: s.distance, location: s.location,
    finds_count: s.finds, route: s.route || [],
  }))
  return await supabase.from('sessions').upsert(rows, { onConflict: 'user_id,local_id' })
}
