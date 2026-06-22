/**
 * Tennis-Ergebnislogik für die Stadtmeisterschaften.
 *
 * Modus: 2 Gewinnsätze (Best-of-3). Die ersten beiden Sätze sind normale
 * Sätze (6 Spiele, 2 Vorsprung, bei 6:6 Tiebreak → 7:6). Steht es nach zwei
 * Sätzen 1:1, entscheidet ein **Match-Tiebreak** bis 10 (2 Punkte Vorsprung).
 */

export type Side = 'p1' | 'p2'

export interface SetScore {
  p1: number
  p2: number
}

export interface MatchScore {
  /** Reihenfolge der Sätze. Index 2 (falls vorhanden) ist der Match-Tiebreak. */
  sets: SetScore[]
  /** Spieler hat während des Matches aufgegeben. */
  retired?: Side
  /** Spieler ist nicht angetreten (w.o.). Sätze können dann leer sein. */
  walkover?: Side
}

export interface ScoreValidation {
  valid: boolean
  winner: Side | null
  errors: string[]
}

/** Ist `{a:b}` ein gültiger normaler Tennissatz (2 Gewinnsätze-Format)? */
export function isValidSet(a: number, b: number): boolean {
  if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0) return false
  const hi = Math.max(a, b)
  const lo = Math.min(a, b)
  if (hi === 6 && lo <= 4) return true // 6:0 .. 6:4
  if (hi === 7 && (lo === 5 || lo === 6)) return true // 7:5, 7:6
  return false
}

/** Ist `{a:b}` ein gültiger Match-Tiebreak (bis 10, 2 Vorsprung)? */
export function isValidMatchTiebreak(a: number, b: number): boolean {
  if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0) return false
  const hi = Math.max(a, b)
  const lo = Math.min(a, b)
  if (hi < 10) return false
  if (hi === 10) return lo <= 8
  // 11:9, 12:10, ... → genau 2 Vorsprung jenseits der 10
  return hi - lo === 2
}

function setWinner(s: SetScore, isTiebreak: boolean): Side | null {
  const ok = isTiebreak ? isValidMatchTiebreak(s.p1, s.p2) : isValidSet(s.p1, s.p2)
  if (!ok) return null
  return s.p1 > s.p2 ? 'p1' : 'p2'
}

/**
 * Prüft ein Ergebnis und ermittelt den Sieger.
 * Gibt `valid:false` mit Fehlermeldungen zurück, wenn das Ergebnis unmöglich ist.
 */
export function validateMatchScore(score: MatchScore): ScoreValidation {
  const errors: string[] = []

  // Walkover: Sieger ist der Gegner des nicht angetretenen Spielers.
  if (score.walkover) {
    const winner: Side = score.walkover === 'p1' ? 'p2' : 'p1'
    return { valid: true, winner, errors: [] }
  }

  const sets = score.sets ?? []

  if (score.retired) {
    // Aufgabe: eingetragene Sätze müssen formal plausibel sein, aber das
    // Match endet vorzeitig. Sieger ist der Gegner des Aufgebenden.
    sets.forEach((s, i) => {
      const isTb = i === 2
      // Bei Aufgabe darf der letzte Satz unvollständig sein – nur Vorzeichen prüfen.
      if (i < sets.length - 1) {
        if (setWinner(s, isTb) === null) errors.push(`Satz ${i + 1} ist ungültig.`)
      } else if (s.p1 < 0 || s.p2 < 0) {
        errors.push(`Satz ${i + 1} ist ungültig.`)
      }
    })
    const winner: Side = score.retired === 'p1' ? 'p2' : 'p1'
    return { valid: errors.length === 0, winner: errors.length === 0 ? winner : null, errors }
  }

  if (sets.length < 2 || sets.length > 3) {
    errors.push('Ein Match besteht aus 2 oder 3 Sätzen.')
    return { valid: false, winner: null, errors }
  }

  let p1 = 0
  let p2 = 0
  sets.forEach((s, i) => {
    const isTb = i === 2
    const w = setWinner(s, isTb)
    if (w === null) {
      errors.push(`Satz ${i + 1} (${s.p1}:${s.p2}) ist kein gültiges Ergebnis.`)
      return
    }
    if (w === 'p1') p1++
    else p2++
  })

  if (errors.length) return { valid: false, winner: null, errors }

  // Nach den ersten beiden Sätzen muss es 1:1 stehen, damit ein 3. Satz gespielt wird.
  if (sets.length === 3) {
    const firstTwo = sets.slice(0, 2)
    const a = firstTwo.filter((s) => s.p1 > s.p2).length
    if (a !== 1) {
      errors.push('Ein dritter Satz wird nur bei 1:1 nach Sätzen gespielt.')
    }
  } else {
    // 2 Sätze: einer muss beide gewonnen haben
    if (p1 !== 2 && p2 !== 2) {
      errors.push('Bei zwei Sätzen muss ein Spieler beide gewinnen.')
    }
  }

  if (errors.length) return { valid: false, winner: null, errors }

  const winner: Side = p1 > p2 ? 'p1' : 'p2'
  return { valid: true, winner, errors: [] }
}

/** Formatiert ein Ergebnis als "6:3, 4:6, 10:8". */
export function formatScore(score: MatchScore | null | undefined): string {
  if (!score) return ''
  if (score.walkover) return 'w.o.'
  const parts = (score.sets ?? []).map((s) => `${s.p1}:${s.p2}`)
  let out = parts.join(', ')
  if (score.retired) out += ' (Aufgabe)'
  return out
}

/** Anzahl gewonnener Sätze je Seite (für Gruppentabellen). */
export function setsWon(score: MatchScore): { p1: number; p2: number } {
  const res = { p1: 0, p2: 0 }
  if (score.walkover) {
    // w.o. zählt als 2:0 Sätze für den Sieger
    if (score.walkover === 'p1') res.p2 = 2
    else res.p1 = 2
    return res
  }
  ;(score.sets ?? []).forEach((s, i) => {
    const w = setWinner(s, i === 2)
    if (w === 'p1') res.p1++
    else if (w === 'p2') res.p2++
  })
  return res
}

/** Anzahl gewonnener Spiele (Games) je Seite – Match-Tiebreak zählt als 1 Spiel. */
export function gamesWon(score: MatchScore): { p1: number; p2: number } {
  const res = { p1: 0, p2: 0 }
  if (score.walkover) return res
  ;(score.sets ?? []).forEach((s, i) => {
    if (i === 2) {
      // Match-Tiebreak: Sieger bekommt 1 "Spiel", Verlierer 0
      const w = s.p1 > s.p2 ? 'p1' : 'p2'
      res[w]++
    } else {
      res.p1 += s.p1
      res.p2 += s.p2
    }
  })
  return res
}
