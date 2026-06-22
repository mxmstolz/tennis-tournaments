import { describe, expect, it } from 'vitest'
import {
  formatScore,
  gamesWon,
  isValidMatchTiebreak,
  isValidSet,
  setsWon,
  validateMatchScore,
} from '../server/utils/score'

describe('isValidSet', () => {
  it('akzeptiert normale Sätze', () => {
    expect(isValidSet(6, 0)).toBe(true)
    expect(isValidSet(6, 4)).toBe(true)
    expect(isValidSet(7, 5)).toBe(true)
    expect(isValidSet(7, 6)).toBe(true)
    expect(isValidSet(0, 6)).toBe(true)
  })
  it('lehnt ungültige Sätze ab', () => {
    expect(isValidSet(6, 5)).toBe(false) // muss 7:5 sein
    expect(isValidSet(8, 6)).toBe(false)
    expect(isValidSet(5, 3)).toBe(false) // nicht zu Ende gespielt
    expect(isValidSet(6, 6)).toBe(false)
  })
})

describe('isValidMatchTiebreak', () => {
  it('akzeptiert gültige Match-Tiebreaks', () => {
    expect(isValidMatchTiebreak(10, 0)).toBe(true)
    expect(isValidMatchTiebreak(10, 8)).toBe(true)
    expect(isValidMatchTiebreak(11, 9)).toBe(true)
    expect(isValidMatchTiebreak(13, 11)).toBe(true)
  })
  it('lehnt ungültige Match-Tiebreaks ab', () => {
    expect(isValidMatchTiebreak(10, 9)).toBe(false) // nur 1 Vorsprung
    expect(isValidMatchTiebreak(9, 7)).toBe(false) // unter 10
    expect(isValidMatchTiebreak(12, 9)).toBe(false)
  })
})

describe('validateMatchScore', () => {
  it('2:0 in Sätzen', () => {
    const r = validateMatchScore({ sets: [{ p1: 6, p2: 3 }, { p1: 6, p2: 0 }] })
    expect(r.valid).toBe(true)
    expect(r.winner).toBe('p1')
  })

  it('Match-Tiebreak im 3. Satz', () => {
    const r = validateMatchScore({
      sets: [{ p1: 6, p2: 4 }, { p1: 4, p2: 6 }, { p1: 10, p2: 8 }],
    })
    expect(r.valid).toBe(true)
    expect(r.winner).toBe('p1')
  })

  it('verliert nach 3 Sätzen', () => {
    const r = validateMatchScore({
      sets: [{ p1: 6, p2: 4 }, { p1: 4, p2: 6 }, { p1: 8, p2: 10 }],
    })
    expect(r.valid).toBe(true)
    expect(r.winner).toBe('p2')
  })

  it('lehnt 3. Satz ohne 1:1 ab', () => {
    const r = validateMatchScore({
      sets: [{ p1: 6, p2: 4 }, { p1: 6, p2: 2 }, { p1: 10, p2: 3 }],
    })
    expect(r.valid).toBe(false)
  })

  it('lehnt zwei Sätze ohne klaren Sieger ab', () => {
    const r = validateMatchScore({ sets: [{ p1: 6, p2: 4 }, { p1: 2, p2: 6 }] })
    expect(r.valid).toBe(false)
  })

  it('Walkover', () => {
    const r = validateMatchScore({ sets: [], walkover: 'p2' })
    expect(r.valid).toBe(true)
    expect(r.winner).toBe('p1')
  })

  it('Aufgabe', () => {
    const r = validateMatchScore({ sets: [{ p1: 6, p2: 4 }, { p1: 1, p2: 2 }], retired: 'p2' })
    expect(r.valid).toBe(true)
    expect(r.winner).toBe('p1')
  })
})

describe('setsWon / gamesWon', () => {
  it('zählt Sätze inkl. Match-Tiebreak', () => {
    const score = { sets: [{ p1: 6, p2: 4 }, { p1: 4, p2: 6 }, { p1: 10, p2: 8 }] }
    expect(setsWon(score)).toEqual({ p1: 2, p2: 1 })
  })
  it('zählt Spiele, MTB als ein Spiel', () => {
    const score = { sets: [{ p1: 6, p2: 4 }, { p1: 4, p2: 6 }, { p1: 10, p2: 8 }] }
    expect(gamesWon(score)).toEqual({ p1: 11, p2: 10 })
  })
})

describe('formatScore', () => {
  it('formatiert Sätze', () => {
    expect(formatScore({ sets: [{ p1: 6, p2: 3 }, { p1: 6, p2: 0 }] })).toBe('6:3, 6:0')
    expect(formatScore({ sets: [], walkover: 'p1' })).toBe('w.o.')
  })
})
