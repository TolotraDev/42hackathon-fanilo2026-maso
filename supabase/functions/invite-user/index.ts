// MASO — Invitation d'un membre par l'administrateur (W12).
// S'exécute sur Supabase (Edge Function, Deno) : la clé service_role ne quitte jamais le serveur.
import { createClient } from 'npm:@supabase/supabase-js@2'

const ROLES = ['journalist', 'fact_checker', 'editor_in_chief', 'admin'] as const
const LANGUAGES = ['fr', 'mg', 'en'] as const

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function reply(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })
  if (request.method !== 'POST') return reply(405, { error: 'method_not_allowed' })

  const url = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  // 1. Vérifier que l'appelant est un administrateur actif (avec ses propres droits, donc la RLS).
  const caller = createClient(url, anonKey, {
    global: { headers: { Authorization: request.headers.get('Authorization') ?? '' } },
  })
  const { data: userData } = await caller.auth.getUser()
  if (!userData.user) return reply(401, { error: 'not_authenticated' })
  const { data: me } = await caller.from('profiles').select('role, active').eq('id', userData.user.id).single()
  if (!me || me.role !== 'admin' || !me.active) return reply(403, { error: 'role_not_allowed' })

  // 2. Valider la demande.
  const body = await request.json().catch(() => null)
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const fullName = typeof body?.full_name === 'string' ? body.full_name.trim() : ''
  const role = body?.role
  const language = LANGUAGES.includes(body?.language) ? body.language : 'fr'
  const redirectTo = typeof body?.redirect_to === 'string' ? body.redirect_to : undefined
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !fullName || !ROLES.includes(role)) {
    return reply(400, { error: 'invalid_request' })
  }

  // 3. Envoyer l'invitation, puis fixer le rôle (le rôle n'est jamais pris des métadonnées utilisateur).
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } })
  const { data: invited, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName, language },
    redirectTo,
  })
  if (error || !invited.user) return reply(400, { error: error?.message ?? 'invite_failed' })

  const { error: roleError } = await admin
    .from('profiles')
    .update({ role, full_name: fullName })
    .eq('id', invited.user.id)
  if (roleError) return reply(500, { error: roleError.message })

  await admin.from('audit_logs').insert({
    user_id: userData.user.id,
    action: 'invite_user',
    entity: 'profiles',
    entity_id: invited.user.id,
    after: { email, role },
  })

  return reply(200, { id: invited.user.id })
})
