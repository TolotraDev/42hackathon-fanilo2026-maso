// Remplacé par l'annuaire réel des personnes-ressources en MOD-04.

export interface DemoPerson {
  id: string
  name: string
  role: string
  organization: string
}

export const DEMO_PEOPLE: DemoPerson[] = [
  { id: 'p1', name: 'Hery Rakotomalala', role: 'Climatologue', organization: 'Service météo (fictif)' },
  { id: 'p2', name: 'Voahangy Andriamanana', role: 'Porte-parole', organization: 'Gestion des risques (fictif)' },
  { id: 'p3', name: 'Tiana Razafindrabe', role: 'Médecin épidémiologiste', organization: 'Centre de santé (fictif)' },
  { id: 'p4', name: 'Fanja Rasoanaivo', role: 'Économiste', organization: 'Université (fictif)' },
]
