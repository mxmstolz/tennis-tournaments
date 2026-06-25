/** Client-seitige Tennis-Hilfen (Anzeige). Logik/Validierung liegt im Server. */

export interface SetScore {
  p1: number
  p2: number
}
export interface MatchScore {
  sets: SetScore[]
  retired?: 'p1' | 'p2'
  walkover?: 'p1' | 'p2'
}

export function formatScore(score: MatchScore | null | undefined): string {
  if (!score) return ''
  if (score.walkover) return 'w.o.'
  const parts = (score.sets ?? []).map((s) => `${s.p1}:${s.p2}`)
  let out = parts.join(', ')
  if (score.retired) out += ' (Aufg.)'
  return out
}

export const KIND_LABEL: Record<string, string> = { SINGLES: 'Einzel', DOUBLES: 'Doppel' }
export const FORMAT_LABEL: Record<string, string> = { KO: 'KO-System', GROUP: 'Gruppe', FINALS: 'Finalrunde' }
export const STATUS_LABEL: Record<string, string> = {
  SETUP: 'Aufbau',
  DRAWN: 'Ausgelost',
  RUNNING: 'Läuft',
  DONE: 'Beendet',
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return ''
  const d = new Date(value)
  return d.toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
