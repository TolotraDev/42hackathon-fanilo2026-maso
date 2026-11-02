// Remplacé par la veille réelle en MOD-07 (flux RSS, signalements).
import type { AlertLevel } from '@/types/domain'

export interface DemoAlert {
  id: string
  title: string
  source: string
  minutesAgo: number
  level: AlertLevel
  region: string
}

export const DEMO_ALERTS: DemoAlert[] = [
  {
    id: 'a1',
    title: '« Antananarivo sous les eaux ce matin » : une photo d\'inondation devient virale sur Facebook',
    source: 'Signalement public',
    minutesAgo: 6,
    level: 'high',
    region: 'Analamanga',
  },
  {
    id: 'a2',
    title: 'Cyclone : un bilan chiffré non sourcé circule sur WhatsApp',
    source: 'Radio Fanilo (fictif)',
    minutesAgo: 15,
    level: 'high',
    region: 'Atsinanana',
  },
  {
    id: 'a3',
    title: 'Vidéo d\'un pont effondré attribuée à la RN7 : origine à confirmer',
    source: 'Gazety Vaovao (fictif)',
    minutesAgo: 32,
    level: 'medium',
    region: 'Haute Matsiatra',
  },
  {
    id: 'a4',
    title: 'Prix du riz : une capture d\'écran d\'un communiqué ministériel est mise en doute',
    source: 'Veille mots-clés',
    minutesAgo: 48,
    level: 'medium',
    region: 'Boeny',
  },
  {
    id: 'a5',
    title: 'Rumeur de fermeture des écoles publiques relayée sur TikTok',
    source: 'Signalement public',
    minutesAgo: 75,
    level: 'low',
    region: 'Vakinankaratra',
  },
]
