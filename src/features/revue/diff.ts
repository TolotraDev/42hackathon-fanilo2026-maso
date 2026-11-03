// Comparaison de deux versions d'un texte, mot à mot (W6 : « comparaison de versions »).

export type DiffPart = { kind: 'same' | 'added' | 'removed'; text: string }

const tokenize = (text: string) => text.match(/\s+|[^\s]+/g) ?? []

/** Plus longue sous-séquence commune sur les mots : ce qui a été retiré, ajouté ou gardé. */
export function diffWords(before: string, after: string): DiffPart[] {
  const a = tokenize(before)
  const b = tokenize(after)
  const table = Array.from({ length: a.length + 1 }, () => new Uint32Array(b.length + 1))
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      table[i][j] = a[i] === b[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1])
    }
  }
  const parts: DiffPart[] = []
  const push = (kind: DiffPart['kind'], text: string) => {
    const last = parts.at(-1)
    if (last?.kind === kind) last.text += text
    else parts.push({ kind, text })
  }
  let i = 0
  let j = 0
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      push('same', a[i])
      i++
      j++
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      push('removed', a[i++])
    } else {
      push('added', b[j++])
    }
  }
  while (i < a.length) push('removed', a[i++])
  while (j < b.length) push('added', b[j++])
  return parts
}

export const hasChanges = (parts: DiffPart[]) => parts.some((part) => part.kind !== 'same' && part.text.trim() !== '')
