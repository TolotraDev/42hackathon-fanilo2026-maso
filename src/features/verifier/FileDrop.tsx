import { Camera, ImageUp, Video } from 'lucide-react'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Card } from '@/components/ui'
import { cn } from '@/lib/cn'
import type { MediaKind } from '@/lib/analysis/fileType'

/** Choix d'un fichier : prise de vue (mobile), galerie ou glisser-déposer (web). */
export function FileDrop({ kind, onFile }: { kind: MediaKind; onFile: (file: File) => void }) {
  const { t } = useTranslation()
  const galleryRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const accept = kind === 'image' ? 'image/*' : 'video/*'
  const Icon = kind === 'image' ? ImageUp : Video

  const pick = (files: FileList | null) => {
    const file = files?.[0]
    if (file) onFile(file)
  }

  return (
    <Card
      className={cn('border-2 border-dashed p-6 text-center transition', dragging ? 'border-cobalt bg-cobalt/5' : 'border-line')}
      onDragOver={(event) => {
        event.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault()
        setDragging(false)
        pick(event.dataTransfer.files)
      }}
    >
      <span className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-cobalt/10 text-cobalt">
        <Icon className="size-7" aria-hidden />
      </span>
      <p className="font-display text-base font-bold text-navy dark:text-ink">{t(`verifier.drop.${kind}Title`)}</p>
      <p className="mb-4 mt-1 text-sm text-ink-muted">{t('verifier.drop.hint')}</p>
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Button onClick={() => galleryRef.current?.click()}>
          <Icon className="size-4" aria-hidden />
          {t('verifier.drop.choose')}
        </Button>
        <Button variant="secondary" onClick={() => cameraRef.current?.click()}>
          <Camera className="size-4" aria-hidden />
          {t(`verifier.drop.capture.${kind}`)}
        </Button>
      </div>
      <input ref={galleryRef} type="file" accept={accept} className="sr-only" aria-label={t('verifier.drop.choose')} onChange={(event) => pick(event.target.files)} />
      <input ref={cameraRef} type="file" accept={accept} capture="environment" className="sr-only" tabIndex={-1} aria-hidden onChange={(event) => pick(event.target.files)} />
    </Card>
  )
}
