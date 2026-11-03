// Les 3 cas de démonstration du cahier des charges (section 17), comme dans supabase/demo/donnees_demo.sql.
// En mode démonstration, ils sont créés sur l'appareil à la première ouverture.
import type { NewCaseInput } from '@/features/dossiers/model'

export const DEMO_CASE_SEEDS: Array<{ id: string; input: NewCaseInput }> = [
  {
    id: '00000000-0000-4000-c000-000000000001',
    input: { title: 'Photo d\'inondation « à Antananarivo ce matin »', claim: 'Une photo montre Antananarivo inondée ce matin après le passage du cyclone.', category: 'climat', region: 'Analamanga', priority: 1, dueDate: null },
  },
  {
    id: '00000000-0000-4000-c000-000000000002',
    input: { title: 'Bilan chiffré du cyclone diffusé sur WhatsApp', claim: 'Le cyclone aurait fait 3 000 victimes selon un message viral sans source.', category: 'catastrophes', region: 'Atsinanana', priority: 1, dueDate: null },
  },
  {
    id: '00000000-0000-4000-c000-000000000003',
    input: { title: 'Vidéo d\'un pont effondré attribuée à la RN7', claim: 'Une vidéo montrerait l\'effondrement d\'un pont sur la RN7 cette semaine.', category: 'infrastructures', region: 'Haute Matsiatra', priority: 2, dueDate: null },
  },
]
