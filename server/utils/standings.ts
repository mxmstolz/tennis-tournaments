/**
 * Tabellenberechnung für den Gruppenmodus.
 * Reihenfolge: Punkte → Satzdifferenz → Spieldifferenz → direkter Vergleich.
 */
import { gamesWon, setsWon, type MatchScore } from './score'

export interface StandingMatch {
  entry1Id: number
  entry2Id: number
  winnerEntryId: number | null
  score: MatchScore | null
}

export interface StandingRow {
  entryId: number
  played: number
  won: number
  lost: number
  points: number
  setsFor: number
  setsAgainst: number
  gamesFor: number
  gamesAgainst: number
  setDiff: number
  gameDiff: number
  rank: number
}

export interface StandingsOptions {
  pointsWin: number
  pointsLoss: number
}

export function computeStandings(
  entryIds: number[],
  matches: StandingMatch[],
  opts: StandingsOptions = { pointsWin: 2, pointsLoss: 0 },
): StandingRow[] {
  const rows = new Map<number, StandingRow>()
  for (const id of entryIds) {
    rows.set(id, {
      entryId: id,
      played: 0,
      won: 0,
      lost: 0,
      points: 0,
      setsFor: 0,
      setsAgainst: 0,
      gamesFor: 0,
      gamesAgainst: 0,
      setDiff: 0,
      gameDiff: 0,
      rank: 0,
    })
  }

  for (const m of matches) {
    if (!m.winnerEntryId || !m.score) continue
    const r1 = rows.get(m.entry1Id)
    const r2 = rows.get(m.entry2Id)
    if (!r1 || !r2) continue

    const sets = setsWon(m.score)
    const games = gamesWon(m.score)

    r1.played++
    r2.played++
    r1.setsFor += sets.p1
    r1.setsAgainst += sets.p2
    r2.setsFor += sets.p2
    r2.setsAgainst += sets.p1
    r1.gamesFor += games.p1
    r1.gamesAgainst += games.p2
    r2.gamesFor += games.p2
    r2.gamesAgainst += games.p1

    if (m.winnerEntryId === m.entry1Id) {
      r1.won++
      r2.lost++
      r1.points += opts.pointsWin
      r2.points += opts.pointsLoss
    } else {
      r2.won++
      r1.lost++
      r2.points += opts.pointsWin
      r1.points += opts.pointsLoss
    }
  }

  for (const r of rows.values()) {
    r.setDiff = r.setsFor - r.setsAgainst
    r.gameDiff = r.gamesFor - r.gamesAgainst
  }

  // direkter Vergleich für Punktgleichheit
  const head2head = (aId: number, bId: number): number => {
    const m = matches.find(
      (x) =>
        x.winnerEntryId != null &&
        ((x.entry1Id === aId && x.entry2Id === bId) ||
          (x.entry1Id === bId && x.entry2Id === aId)),
    )
    if (!m || !m.winnerEntryId) return 0
    return m.winnerEntryId === aId ? -1 : 1
  }

  const sorted = [...rows.values()].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    if (b.setDiff !== a.setDiff) return b.setDiff - a.setDiff
    if (b.gameDiff !== a.gameDiff) return b.gameDiff - a.gameDiff
    const h = head2head(a.entryId, b.entryId)
    if (h !== 0) return h
    return a.entryId - b.entryId
  })

  sorted.forEach((r, i) => {
    r.rank = i + 1
  })
  return sorted
}
