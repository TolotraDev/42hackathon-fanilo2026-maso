import { twMerge } from 'tailwind-merge'

/** Concatène des classes Tailwind ; en cas de conflit, la dernière l'emporte. */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return twMerge(classes.filter(Boolean).join(' '))
}
