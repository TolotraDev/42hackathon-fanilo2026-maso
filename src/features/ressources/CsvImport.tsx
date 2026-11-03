import { Download, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Card } from '@/components/ui'
import { FormMessage } from '@/features/auth/FormMessage'
import { useAuthErrorMessage } from '@/features/auth/useAuthError'
import { parseCsv } from '@/lib/csv'

interface CsvImportProps<T> {
  title: string
  /** Colonnes attendues, dans l'ordre du modèle. */
  columns: string[]
  example: string[]
  templateName: string
  /** Transforme une ligne ; renvoie un message d'erreur (chaîne) si la ligne est invalide. */
  toItem: (row: Record<string, string>) => T | string
  onImport: (items: T[]) => Promise<number>
}

/** Import CSV en 2 temps : aperçu (lignes valides / refusées avec le motif), puis enregistrement. */
export function CsvImport<T>({ title, columns, example, templateName, toItem, onImport }: CsvImportProps<T>) {
  const { t } = useTranslation()
  const errorMessage = useAuthErrorMessage()
  const input = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<{ items: T[]; errors: string[] } | null>(null)
  const [message, setMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  const template = `data:text/csv;charset=utf-8,${encodeURIComponent(`${columns.join(';')}\n${example.join(';')}\n`)}`

  const read = async (file: File | undefined) => {
    if (!file) return
    setMessage(null)
    const rows = parseCsv(await file.text())
    const items: T[] = []
    const errors: string[] = []
    rows.forEach((row, index) => {
      const result = toItem(row)
      if (typeof result === 'string') errors.push(t('ressources.csv.lineError', { line: index + 2, reason: result }))
      else items.push(result)
    })
    setPreview({ items, errors })
    if (input.current) input.current.value = ''
  }

  const confirm = async () => {
    if (!preview) return
    setBusy(true)
    try {
      const count = await onImport(preview.items)
      setMessage({ tone: 'success', text: t('ressources.csv.imported', { count }) })
      setPreview(null)
    } catch (error) {
      setMessage({ tone: 'error', text: errorMessage(error) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="space-y-3 p-4">
      <p className="font-display text-sm font-bold text-navy dark:text-ink">{title}</p>
      <p className="text-xs text-ink-muted">{t('ressources.csv.hint', { columns: columns.join(', ') })}</p>
      <div className="flex flex-wrap gap-2">
        <a href={template} download={templateName} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-line px-3 text-xs font-semibold text-cobalt hover:bg-canvas">
          <Download className="size-4" aria-hidden />
          {t('ressources.csv.template')}
        </a>
        <Button variant="secondary" className="min-h-10 text-xs" onClick={() => input.current?.click()}>
          <Upload className="size-4" aria-hidden />
          {t('ressources.csv.choose')}
        </Button>
        <input ref={input} type="file" accept=".csv,text/csv" className="sr-only" aria-label={t('ressources.csv.choose')} onChange={(event) => void read(event.target.files?.[0])} />
      </div>
      {preview && (
        <div className="space-y-2 rounded-xl bg-canvas p-3 text-xs">
          <p className="font-semibold text-ink">{t('ressources.csv.preview', { valid: preview.items.length, rejected: preview.errors.length })}</p>
          {preview.errors.length > 0 && (
            <ul className="list-disc space-y-0.5 pl-4 text-danger">
              {preview.errors.slice(0, 8).map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          )}
          <Button className="min-h-10 text-xs" disabled={busy || preview.items.length === 0} onClick={() => void confirm()}>
            {t('ressources.csv.confirm', { count: preview.items.length })}
          </Button>
        </div>
      )}
      {message && <FormMessage tone={message.tone}>{message.text}</FormMessage>}
    </Card>
  )
}
