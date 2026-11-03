// Lecture de fichiers CSV (import d'annuaires et de statistiques, W8 à W10).
// Gère les guillemets, les virgules ou points-virgules (Excel en français) et les retours à la ligne.

export function parseCsv(text: string): Array<Record<string, string>> {
  const content = text.replace(/^﻿/, '')
  const firstLine = content.split(/\r?\n/, 1)[0] ?? ''
  const separator = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ';' : ','
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  for (let index = 0; index < content.length; index++) {
    const char = content[index]
    if (quoted) {
      if (char === '"' && content[index + 1] === '"') {
        field += '"'
        index++
      } else if (char === '"') {
        quoted = false
      } else {
        field += char
      }
    } else if (char === '"') {
      quoted = true
    } else if (char === separator) {
      row.push(field)
      field = ''
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && content[index + 1] === '\n') index++
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else {
      field += char
    }
  }
  if (field || row.length) {
    row.push(field)
    rows.push(row)
  }
  const [header, ...lines] = rows.filter((cells) => cells.some((cell) => cell.trim()))
  if (!header) return []
  const keys = header.map((key) => key.trim().toLowerCase())
  return lines.map((cells) => Object.fromEntries(keys.map((key, index) => [key, (cells[index] ?? '').trim()])))
}

/** Liste dans une cellule : « climat|météo » ou « climat, météo ». */
export const splitList = (value: string | undefined) =>
  (value ?? '').split(/[|,]/).map((item) => item.trim()).filter(Boolean)

/** CSV (séparateur « ; », lisible par Excel en français) : chaque cellule est protégée par des guillemets. */
export function toCsv(rows: Array<Array<string | number | null | undefined>>): string {
  const cell = (value: string | number | null | undefined) => `"${String(value ?? '').replace(/"/g, '""')}"`
  return rows.map((row) => row.map(cell).join(';')).join('\n') + '\n'
}
