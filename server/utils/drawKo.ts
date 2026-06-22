/**
 * Auslosung eines KO-Baums mit Setzung und Freilosen (Rast).
 *
 * Liefert einen rein beschreibenden Plan (`PlannedMatch[]`), den die API-Schicht
 * in die Datenbank schreibt. Die Verkettung der Runden erfolgt über temporäre
 * `key`-Referenzen, die nach dem Insert auf echte Match-IDs gemappt werden.
 */

export interface DrawEntry {
  id: number
  seed?: number | null
}

export type SourceResult = 'WINNER' | 'LOSER'

export interface PlannedMatch {
  key: string
  stage: 'MAIN' | 'THIRD_PLACE'
  round: number
  slot: number
  label: string
  entry1Id: number | null
  entry2Id: number | null
  source1?: { matchKey: string; result: SourceResult }
  source2?: { matchKey: string; result: SourceResult }
  /** Genau ein Teilnehmer + Freilos → automatischer Aufstieg. */
  isBye: boolean
}

export interface KoPlan {
  bracketSize: number
  rounds: number
  matches: PlannedMatch[]
}

/** Kleinste 2er-Potenz ≥ n (mindestens 2). */
export function nextPowerOfTwo(n: number): number {
  let p = 2
  while (p < n) p *= 2
  return p
}

/**
 * Liefert für eine Bracketgröße (2er-Potenz) je Slot den Setzrang.
 * slotSeeds[slot] = Setzrang (1-basiert), der in diesen Slot gehört.
 * Standard-Tennis-Setzschema (1 oben, 2 unten, 3/4 in Gegenviertel …).
 */
export function slotSeedOrder(size: number): number[] {
  if (size < 2) return [1]
  let pls = [1, 2]
  while (pls.length < size) {
    const n = pls.length
    const next: number[] = []
    for (let i = 0; i < n; i++) {
      const seed = pls[i]
      const complement = 2 * n + 1 - seed
      // Reihenfolge je Index alternieren, damit Setzling 1 oben und
      // Setzling 2 unten landet (Standard-Setzschema / ITF).
      if (i % 2 === 0) {
        next.push(seed, complement)
      } else {
        next.push(complement, seed)
      }
    }
    pls = next
  }
  return pls
}

function roundName(round: number, rounds: number): string {
  const fromFinal = rounds - round
  switch (fromFinal) {
    case 0:
      return 'Finale'
    case 1:
      return 'Halbfinale'
    case 2:
      return 'Viertelfinale'
    case 3:
      return 'Achtelfinale'
    default:
      return `Runde ${round}`
  }
}

/** Fisher-Yates-Shuffle (nutzt injizierbaren RNG für testbare Auslosung). */
export function shuffle<T>(arr: T[], rng: () => number = Math.random): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * Erzeugt den KO-Plan.
 * @param entries Teilnehmer (mit optionaler Setzung)
 * @param opts.thirdPlace "Spiel um Platz 3" hinzufügen
 * @param rng injizierbarer Zufallsgenerator (für Tests)
 */
export function planKnockout(
  entries: DrawEntry[],
  opts: { thirdPlace?: boolean; rng?: () => number } = {},
): KoPlan {
  const rng = opts.rng ?? Math.random
  const n = entries.length
  if (n < 2) {
    return { bracketSize: 0, rounds: 0, matches: [] }
  }

  const bracketSize = nextPowerOfTwo(n)
  const rounds = Math.log2(bracketSize)

  // Teilnehmer nach Gesamtrang ordnen: gesetzte zuerst (nach Setzrang),
  // danach ungesetzte zufällig.
  const seeded = entries
    .filter((e) => e.seed != null)
    .sort((a, b) => (a.seed as number) - (b.seed as number))
  const unseeded = shuffle(
    entries.filter((e) => e.seed == null),
    rng,
  )
  const ranked = [...seeded, ...unseeded] // Länge n

  // Rang → physischer Slot
  const slotSeeds = slotSeedOrder(bracketSize) // slot → Rang
  const slotForRank: number[] = new Array(bracketSize)
  slotSeeds.forEach((rank, slot) => {
    slotForRank[rank - 1] = slot
  })

  const slotEntry: (number | null)[] = new Array(bracketSize).fill(null)
  ranked.forEach((entry, i) => {
    slotEntry[slotForRank[i]] = entry.id // Ränge n..bracketSize bleiben null = Freilos
  })

  const matches: PlannedMatch[] = []
  const keyOf = (round: number, slot: number) => `M-r${round}-s${slot}`

  // Runde 1
  const r1Count = bracketSize / 2
  for (let s = 0; s < r1Count; s++) {
    const e1 = slotEntry[2 * s]
    const e2 = slotEntry[2 * s + 1]
    const isBye = (e1 == null) !== (e2 == null) // genau einer fehlt
    matches.push({
      key: keyOf(1, s),
      stage: 'MAIN',
      round: 1,
      slot: s,
      label: rounds === 1 ? 'Finale' : roundName(1, rounds),
      entry1Id: e1,
      entry2Id: e2,
      isBye,
    })
  }

  // Folgerunden
  for (let round = 2; round <= rounds; round++) {
    const count = bracketSize / 2 ** round
    for (let s = 0; s < count; s++) {
      matches.push({
        key: keyOf(round, s),
        stage: 'MAIN',
        round,
        slot: s,
        label: roundName(round, rounds),
        entry1Id: null,
        entry2Id: null,
        source1: { matchKey: keyOf(round - 1, 2 * s), result: 'WINNER' },
        source2: { matchKey: keyOf(round - 1, 2 * s + 1), result: 'WINNER' },
        isBye: false,
      })
    }
  }

  // Spiel um Platz 3 (Verlierer der beiden Halbfinals)
  if (opts.thirdPlace && rounds >= 2) {
    matches.push({
      key: 'M-third',
      stage: 'THIRD_PLACE',
      round: rounds, // gleiche "Tiefe" wie das Finale
      slot: 1,
      label: 'Spiel um Platz 3',
      entry1Id: null,
      entry2Id: null,
      source1: { matchKey: keyOf(rounds - 1, 0), result: 'LOSER' },
      source2: { matchKey: keyOf(rounds - 1, 1), result: 'LOSER' },
      isBye: false,
    })
  }

  return { bracketSize, rounds, matches }
}
