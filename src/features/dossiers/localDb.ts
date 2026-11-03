// Base locale de l'appareil (IndexedDB) : dossiers consultables hors ligne, file des modifications
// en attente d'envoi, fichiers de preuves pas encore envoyés.
import Dexie, { type Table } from 'dexie'
import type { CaseDetail, Mutation } from './model'

export interface StoredCase {
  id: string
  detail: CaseDetail
  /** false : seule la fiche résumée est connue (liste), le détail n'a pas encore été téléchargé. */
  complete: boolean
}

export interface OutboxEntry {
  seq?: number
  caseId: string
  mutation: Mutation
  createdAt: string
  /** Refus du serveur (code), null tant que l'envoi n'a pas été refusé. */
  error: string | null
}

export interface StoredBlob {
  id: string
  blob: Blob
}

export class LocalDb extends Dexie {
  cases!: Table<StoredCase, string>
  outbox!: Table<OutboxEntry, number>
  blobs!: Table<StoredBlob, string>
  meta!: Table<{ key: string; value: unknown }, string>

  constructor(name: string) {
    super(name)
    this.version(1).stores({ cases: 'id', outbox: '++seq, caseId', blobs: 'id', meta: 'key' })
  }
}

/** Mode démonstration : une base partagée par les comptes de démo (et lue par le portail public). */
export const DEMO_DB_NAME = 'maso-local-demo'

/** Une base par utilisateur : sur un appareil partagé, les dossiers ne se mélangent pas. */
export const localDbName = (userId: string | null, mode: 'remote' | 'local') => `maso-${mode}-${userId ?? 'anonyme'}`
