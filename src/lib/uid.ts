/** Short collision-resistant id, prefixed for readability in dev tools. */
export function uid(prefix: string): string {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10)
  return `${prefix}_${rand}`
}

/** Current time as an ISO string (wrapped so usages read intent). */
export const nowISO = (): string => new Date().toISOString()
