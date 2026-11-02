// Comptes du mode démonstration local (identiques à supabase/seed.sql). Fictifs.
import type { Profile } from '@/types/domain'

export const DEMO_PASSWORD = 'Maso2026!demo'

export const DEMO_USERS: Profile[] = [
  { id: '00000000-0000-4000-b000-000000000001', email: 'journaliste@maso.demo', fullName: 'Démo Journaliste', role: 'journalist', language: 'fr', newsroomId: null, active: true },
  { id: '00000000-0000-4000-b000-000000000002', email: 'factchecker@maso.demo', fullName: 'Démo Fact-checker', role: 'fact_checker', language: 'fr', newsroomId: null, active: true },
  { id: '00000000-0000-4000-b000-000000000003', email: 'redaction@maso.demo', fullName: 'Démo Rédaction en chef', role: 'editor_in_chief', language: 'fr', newsroomId: null, active: true },
  { id: '00000000-0000-4000-b000-000000000004', email: 'admin@maso.demo', fullName: 'Démo Administration', role: 'admin', language: 'fr', newsroomId: null, active: true },
]
