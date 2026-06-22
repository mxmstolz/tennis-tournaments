import { describe, expect, it } from 'vitest'
import { assignGroups, planGroups, roundRobinPairs } from '../server/utils/drawGroup'
import { computeStandings } from '../server/utils/standings'

describe('roundRobinPairs', () => {
  it('jeder gegen jeden bei 4 Teilnehmern → 6 Spiele, 3 Spieltage', () => {
    const pairs = roundRobinPairs([1, 2, 3, 4])
    expect(pairs).toHaveLength(6)
    expect(new Set(pairs.map((p) => p.round)).size).toBe(3)
    // jede Paarung genau einmal
    const keys = pairs.map((p) => [p.a, p.b].sort((x, y) => x - y).join('-'))
    expect(new Set(keys).size).toBe(6)
  })

  it('ungerade Teilnehmerzahl (3) → 3 Spiele', () => {
    const pairs = roundRobinPairs([1, 2, 3])
    expect(pairs).toHaveLength(3)
  })
})

describe('assignGroups', () => {
  it('verteilt per Snake-Seeding auf 2 Gruppen', () => {
    const groups = assignGroups(
      [
        { id: 1, seed: 1 },
        { id: 2, seed: 2 },
        { id: 3, seed: 3 },
        { id: 4, seed: 4 },
      ],
      2,
    )
    // Setzling 1 und 2 in unterschiedliche Gruppen
    expect(groups[1]).toContain(1)
    expect(groups[2]).toContain(2)
    // Snake: Gruppe 1 bekommt Setzling 1 und 4, Gruppe 2 die 2 und 3
    expect(groups[1].sort()).toEqual([1, 4])
    expect(groups[2].sort()).toEqual([2, 3])
  })
})

describe('planGroups', () => {
  it('erzeugt Spiele für alle Gruppen', () => {
    const plan = planGroups([{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }], 1)
    expect(Object.keys(plan.groups)).toHaveLength(1)
    expect(plan.matches).toHaveLength(6)
  })
})

describe('computeStandings', () => {
  it('sortiert nach Punkten, dann Satzdifferenz', () => {
    const rows = computeStandings(
      [1, 2, 3],
      [
        { entry1Id: 1, entry2Id: 2, winnerEntryId: 1, score: { sets: [{ p1: 6, p2: 0 }, { p1: 6, p2: 0 }] } },
        { entry1Id: 1, entry2Id: 3, winnerEntryId: 1, score: { sets: [{ p1: 6, p2: 4 }, { p1: 6, p2: 4 }] } },
        { entry1Id: 2, entry2Id: 3, winnerEntryId: 2, score: { sets: [{ p1: 6, p2: 3 }, { p1: 6, p2: 3 }] } },
      ],
    )
    expect(rows[0].entryId).toBe(1) // 2 Siege
    expect(rows[0].points).toBe(4)
    expect(rows[1].entryId).toBe(2) // 1 Sieg
    expect(rows[2].entryId).toBe(3) // 0 Siege
  })

  it('nutzt direkten Vergleich bei Gleichstand', () => {
    // 1 schlägt 2, 2 schlägt 3, 3 schlägt 1 → alle 1 Sieg; gleiche Satz-/Spieldiff
    const rows = computeStandings(
      [1, 2, 3],
      [
        { entry1Id: 1, entry2Id: 2, winnerEntryId: 1, score: { sets: [{ p1: 6, p2: 4 }, { p1: 4, p2: 6 }, { p1: 10, p2: 8 }] } },
        { entry1Id: 2, entry2Id: 3, winnerEntryId: 2, score: { sets: [{ p1: 6, p2: 4 }, { p1: 4, p2: 6 }, { p1: 10, p2: 8 }] } },
        { entry1Id: 3, entry2Id: 1, winnerEntryId: 3, score: { sets: [{ p1: 6, p2: 4 }, { p1: 4, p2: 6 }, { p1: 10, p2: 8 }] } },
      ],
    )
    expect(rows.every((r) => r.points === 2)).toBe(true)
  })
})
