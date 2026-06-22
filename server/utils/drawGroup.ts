/**
 * Auslosung für den Gruppenmodus (Round-Robin / "Jeder gegen jeden").
 * Verteilt Teilnehmer per Snake-Seeding auf Gruppen und erzeugt je Gruppe
 * den vollständigen Spielplan nach der Kreismethode.
 */
import type { DrawEntry } from './drawKo'
import { shuffle } from './drawKo'

export interface PlannedGroupMatch {
  key: string
  groupNo: number
  round: number // Spieltag
  slot: number
  label: string
  entry1Id: number
  entry2Id: number
}

export interface GroupPlan {
  /** groupNo (1-basiert) → Teilnehmer-IDs in dieser Gruppe */
  groups: Record<number, number[]>
  matches: PlannedGroupMatch[]
}

/** Verteilt Teilnehmer per Snake-Seeding auf `numGroups` Gruppen. */
export function assignGroups(
  entries: DrawEntry[],
  numGroups: number,
  rng: () => number = Math.random,
): Record<number, number[]> {
  const groups: Record<number, number[]> = {}
  for (let g = 1; g <= numGroups; g++) groups[g] = []

  const seeded = entries
    .filter((e) => e.seed != null)
    .sort((a, b) => (a.seed as number) - (b.seed as number))
  const unseeded = shuffle(
    entries.filter((e) => e.seed == null),
    rng,
  )
  const ordered = [...seeded, ...unseeded]

  // Schlangenlinie: 1→g, dann g→1, ...
  ordered.forEach((entry, i) => {
    const cycle = Math.floor(i / numGroups)
    const pos = i % numGroups
    const g = cycle % 2 === 0 ? pos + 1 : numGroups - pos
    groups[g].push(entry.id)
  })

  return groups
}

/**
 * Round-Robin-Paarungen einer Gruppe nach der Kreismethode.
 * Bei ungerader Teilnehmerzahl spielt pro Spieltag einer frei.
 */
export function roundRobinPairs(ids: number[]): { round: number; a: number; b: number }[] {
  const list = [...ids]
  const bye = -1
  if (list.length % 2 === 1) list.push(bye)
  const n = list.length
  const rounds = n - 1
  const half = n / 2
  const pairs: { round: number; a: number; b: number }[] = []

  const arr = [...list]
  for (let r = 0; r < rounds; r++) {
    for (let i = 0; i < half; i++) {
      const a = arr[i]
      const b = arr[n - 1 - i]
      if (a !== bye && b !== bye) {
        pairs.push({ round: r + 1, a, b })
      }
    }
    // Rotation: erstes Element fix, Rest im Kreis drehen
    const fixed = arr[0]
    const rest = arr.slice(1)
    rest.unshift(rest.pop() as number)
    arr.splice(0, arr.length, fixed, ...rest)
  }
  return pairs
}

export function planGroups(
  entries: DrawEntry[],
  numGroups: number,
  rng: () => number = Math.random,
): GroupPlan {
  const groups = assignGroups(entries, Math.max(1, numGroups), rng)
  const matches: PlannedGroupMatch[] = []

  for (const [gStr, ids] of Object.entries(groups)) {
    const groupNo = Number(gStr)
    const pairs = roundRobinPairs(ids)
    pairs.forEach((p, idx) => {
      matches.push({
        key: `G${groupNo}-${idx}`,
        groupNo,
        round: p.round,
        slot: idx,
        label: `Gruppe ${groupNo} · Spieltag ${p.round}`,
        entry1Id: p.a,
        entry2Id: p.b,
      })
    })
  }

  return { groups, matches }
}
