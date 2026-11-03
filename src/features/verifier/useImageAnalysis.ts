import { useEffect, useState } from 'react'
import { analyseApi, stateForServiceError, type AiClueResult, type ProvenanceResult } from '@/lib/analyseApi'
import { runEla, type ElaResult } from '@/lib/analysis/ela'
import { MAX_BYTES, sniffMime } from '@/lib/analysis/fileType'
import { sha256Hex } from '@/lib/analysis/hash'
import { qualifyMetadata, readMetadata, type ImageMetadata, type MetadataFinding } from '@/lib/analysis/metadata'
import { grayscale32, phashFromGray } from '@/lib/analysis/phash'
import { pending, type StepResult } from '@/lib/analysis/types'
import type { ClueLevel } from '@/types/domain'
import { findSimilarImages, isPersistenceAvailable, type SimilarImage } from './verificationApi'

export interface Reception {
  mime: string | null
  size: number
  width: number
  height: number
  sha256: string
  phash: string
  rejected: 'unsupported_type' | 'too_large' | 'unreadable' | null
}

export interface ImageSteps {
  reception: StepResult<Reception>
  already_seen: StepResult<{ matches: SimilarImage[]; reason?: 'no_database' }>
  metadata: StepResult<ImageMetadata & { finding: MetadataFinding }>
  provenance: StepResult<ProvenanceResult>
  recompression: StepResult<Omit<ElaResult, 'clue'>>
  ai_clue: StepResult<AiClueResult>
}

export const IMAGE_STEP_IDS = ['reception', 'already_seen', 'metadata', 'provenance', 'recompression', 'ai_clue'] as const
export type ImageStepId = (typeof IMAGE_STEP_IDS)[number]

const initialSteps = (): ImageSteps => ({
  reception: pending(),
  already_seen: pending(),
  metadata: pending(),
  provenance: pending(),
  recompression: pending(),
  ai_clue: pending(),
})

/** Indice de génération par IA : jamais une conclusion, seulement une invitation à examiner. */
export function qualifyAiScore(score: number): ClueLevel {
  if (score >= 0.85) return 'to_examine'
  if (score >= 0.6) return 'weak'
  return 'none'
}

const loadImage = (file: Blob) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('unreadable'))
    image.src = URL.createObjectURL(file)
  })

/** Lance les étapes de la section 9 sur une image et les met à jour en direct. */
/** `excludeCaseId` : analyse lancée depuis un dossier, dont les propres preuves ne comptent pas comme « déjà vues ». */
export function useImageAnalysis(file: File | null, excludeCaseId: string | null = null) {
  const [steps, setSteps] = useState<ImageSteps>(initialSteps)
  const [finished, setFinished] = useState(false)

  useEffect(() => {
    if (!file) return
    let cancelled = false
    setSteps(initialSteps())
    setFinished(false)

    const update = <K extends keyof ImageSteps>(id: K, result: ImageSteps[K]) => {
      if (!cancelled) setSteps((current) => ({ ...current, [id]: result }))
    }
    const timed = async <K extends keyof ImageSteps>(id: K, run: () => Promise<ImageSteps[K]>) => {
      update(id, { state: 'running' } as ImageSteps[K])
      const started = performance.now()
      const result = await run()
      update(id, { ...result, durationMs: Math.round(performance.now() - started) })
    }

    void (async () => {
      // 1. Réception : empreintes et type réel (local, hors ligne)
      let image: HTMLImageElement | null = null
      let reception: Reception | null = null
      await timed('reception', async () => {
        const buffer = await file.arrayBuffer()
        const mime = sniffMime(new Uint8Array(buffer.slice(0, 32)))
        const sha256 = await sha256Hex(buffer)
        const base = { mime, size: file.size, width: 0, height: 0, sha256, phash: '' }
        if (!mime?.startsWith('image/')) {
          reception = { ...base, rejected: 'unsupported_type' }
        } else if (file.size > MAX_BYTES.image) {
          reception = { ...base, rejected: 'too_large' }
        } else {
          try {
            image = await loadImage(file)
            reception = {
              ...base,
              width: image.naturalWidth,
              height: image.naturalHeight,
              phash: phashFromGray(grayscale32(image)),
              rejected: null,
            }
          } catch {
            reception = { ...base, rejected: 'unreadable' }
          }
        }
        return { state: 'done', data: reception, tool: 'Web Crypto (SHA-256), pHash' }
      })
      const received = reception as Reception | null
      if (!received || received.rejected || !image) {
        setFinished(true)
        return
      }
      const loaded: HTMLImageElement = image

      await Promise.all([
        // 2. Déjà vu ? (base MASO)
        timed('already_seen', async () => {
          if (!isPersistenceAvailable()) return { state: 'not_applicable', data: { matches: [], reason: 'no_database' } }
          if (!navigator.onLine) return { state: 'waiting_network' }
          try {
            const matches = (await findSimilarImages(received.sha256, received.phash)).filter((match) => match.case_id !== excludeCaseId)
            return { state: 'done', clue: matches.length ? 'to_examine' : 'none', data: { matches }, tool: 'pHash (distance de Hamming ≤ 10)' }
          } catch {
            return { state: 'unavailable' }
          }
        }),
        // 3. Métadonnées (local)
        timed('metadata', async () => {
          const meta = await readMetadata(file)
          const { clue, finding } = qualifyMetadata(meta)
          return { state: 'done', clue, data: { ...meta, finding }, tool: 'exifr' }
        }),
        // 5. Recompression (local, JPEG uniquement)
        timed('recompression', async () => {
          if (received.mime !== 'image/jpeg') return { state: 'not_applicable' }
          const { clue, ...data } = await runEla(loaded)
          return { state: 'done', clue, data, tool: 'ELA (Canvas, qualité 90 %)' }
        }),
        // 4. Provenance C2PA (serveur)
        timed('provenance', async () => {
          try {
            const data = await analyseApi.provenance(file)
            if (!data.available) return { state: 'unavailable' }
            const clue: ClueLevel = data.present && data.ai_generated ? 'to_examine' : data.present && data.valid === false ? 'weak' : 'none'
            return { state: 'done', clue, data, tool: data.tool }
          } catch (error) {
            return { state: stateForServiceError(error) }
          }
        }),
        // 7. Indice de génération par IA (serveur)
        timed('ai_clue', async () => {
          try {
            const data = await analyseApi.aiClue(file)
            if (!data.available || data.score === undefined) return { state: 'unavailable', data }
            return { state: 'done', clue: qualifyAiScore(data.score), data, tool: data.model }
          } catch (error) {
            return { state: stateForServiceError(error) }
          }
        }),
      ])
      URL.revokeObjectURL(loaded.src)
      if (!cancelled) setFinished(true)
    })()

    return () => {
      cancelled = true
    }
  }, [file, excludeCaseId])

  return { steps, finished }
}
