import { describe, expect, it } from 'vitest'
import {
  nextPowerOfTwo,
  planKnockout,
  slotSeedOrder,
  type DrawEntry,
} from '../server/utils/drawKo'

// Deterministischer RNG für reproduzierbare Auslosungen
function seededRng(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

describe('nextPowerOfTwo', () => {
  it('rundet auf', () => {
    expect(nextPowerOfTwo(2)).toBe(2)
    expect(nextPowerOfTwo(3)).toBe(4)
    expect(nextPowerOfTwo(5)).toBe(8)
    expect(nextPowerOfTwo(8)).toBe(8)
    expect(nextPowerOfTwo(9)).toBe(16)
  })
})

describe('slotSeedOrder', () => {
  it('Setzschema für 4', () => {
    expect(slotSeedOrder(4)).toEqual([1, 4, 3, 2])
  })
  it('Setzschema für 8', () => {
    expect(slotSeedOrder(8)).toEqual([1, 8, 5, 4, 3, 6, 7, 2])
  })
})

describe('planKnockout', () => {
  const mk = (ids: number[], seeds: Record<number, number> = {}): DrawEntry[] =>
    ids.map((id) => ({ id, seed: seeds[id] ?? null }))

  it('8 Teilnehmer, 4 gesetzt → keine Freilose', () => {
    const plan = planKnockout(mk([1, 2, 3, 4, 5, 6, 7, 8], { 1: 1, 2: 2, 3: 3, 4: 4 }), {
      thirdPlace: true,
      rng: seededRng(42),
    })
    expect(plan.bracketSize).toBe(8)
    expect(plan.rounds).toBe(3)
    const r1 = plan.matches.filter((m) => m.round === 1 && m.stage === 'MAIN')
    expect(r1).toHaveLength(4)
    expect(r1.every((m) => !m.isBye)).toBe(true)
    // Setzling 1 in erstem Spiel, Setzling 2 im letzten erstrundigen Spiel
    expect(r1[0].entry1Id).toBe(1)
    expect(r1[3].entry2Id).toBe(2)
    // Spiel um Platz 3 vorhanden
    expect(plan.matches.some((m) => m.stage === 'THIRD_PLACE')).toBe(true)
  })

  it('5 Teilnehmer → 8er-Baum mit 3 Freilosen für Topgesetzte', () => {
    const plan = planKnockout(mk([1, 2, 3, 4, 5], { 1: 1, 2: 2 }), { rng: seededRng(7) })
    expect(plan.bracketSize).toBe(8)
    const r1 = plan.matches.filter((m) => m.round === 1)
    const byes = r1.filter((m) => m.isBye)
    expect(byes).toHaveLength(3)
    // Setzling 1 hat ein Freilos
    const seed1Match = r1.find((m) => m.entry1Id === 1 || m.entry2Id === 1)!
    expect(seed1Match.isBye).toBe(true)
  })

  it('verkettet Folgerunden über Sources', () => {
    const plan = planKnockout(mk([1, 2, 3, 4]), { rng: seededRng(1) })
    const finalMatch = plan.matches.find((m) => m.round === 2 && m.stage === 'MAIN')!
    expect(finalMatch.source1).toBeDefined()
    expect(finalMatch.source2).toBeDefined()
    expect(finalMatch.source1!.result).toBe('WINNER')
  })

  it('weniger als 2 Teilnehmer → leerer Plan', () => {
    expect(planKnockout(mk([1])).matches).toHaveLength(0)
  })
})
