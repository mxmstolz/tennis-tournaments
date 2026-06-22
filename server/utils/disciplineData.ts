import { asc, eq } from 'drizzle-orm'
import { useDb } from '../db'
import { disciplines, entries, matches, players } from '../db/schema'
import { computeStandings, type StandingRow } from './standings'

export interface EntryDto {
  id: number
  seed: number | null
  groupNo: number | null
  name: string
  player1Id: number | null
  player2Id: number | null
}

export interface DisciplineData {
  discipline: typeof disciplines.$inferSelect & { tournamentName: string; tournamentYear: number }
  entries: EntryDto[]
  matches: (typeof matches.$inferSelect)[]
  standings: Record<number, StandingRow[]> // groupNo → Tabelle
  consolationStandings: StandingRow[] | null // Nebenrunde im Gruppenmodus
}

function playerName(p: { firstName: string; lastName: string } | null): string {
  if (!p) return '—'
  return `${p.firstName} ${p.lastName}`.trim()
}

export function entryName(
  e: { displayName: string | null; player1Id: number | null; player2Id: number | null },
  playerMap: Map<number, { firstName: string; lastName: string }>,
): string {
  if (e.displayName) return e.displayName
  const p1 = e.player1Id != null ? playerMap.get(e.player1Id) ?? null : null
  const p2 = e.player2Id != null ? playerMap.get(e.player2Id) ?? null : null
  if (p2) return `${playerName(p1)} + ${playerName(p2)}`
  return playerName(p1)
}

/** Lädt eine Disziplin samt Teilnehmern, Spielen und (bei Gruppen) Tabellen. */
export async function getDisciplineData(disciplineId: number): Promise<DisciplineData | null> {
  const db = useDb()

  const disc = await db.query.disciplines.findFirst({
    where: eq(disciplines.id, disciplineId),
    with: { tournament: true },
  })
  if (!disc) return null

  const allPlayers = await db.select().from(players)
  const playerMap = new Map(allPlayers.map((p) => [p.id, p]))

  const rawEntries = await db
    .select()
    .from(entries)
    .where(eq(entries.disciplineId, disciplineId))
    .orderBy(asc(entries.seed), asc(entries.id))

  const entryDtos: EntryDto[] = rawEntries.map((e) => ({
    id: e.id,
    seed: e.seed,
    groupNo: e.groupNo,
    name: entryName(e, playerMap),
    player1Id: e.player1Id,
    player2Id: e.player2Id,
  }))

  const matchRows = await db
    .select()
    .from(matches)
    .where(eq(matches.disciplineId, disciplineId))
    .orderBy(asc(matches.round), asc(matches.slot))

  // Tabellen je Gruppe (nur Gruppenmodus)
  const standings: Record<number, StandingRow[]> = {}
  if (disc.format === 'GROUP') {
    const groupNos = [...new Set(rawEntries.map((e) => e.groupNo).filter((g): g is number => g != null))]
    for (const g of groupNos) {
      const ids = rawEntries.filter((e) => e.groupNo === g).map((e) => e.id)
      const groupMatches = matchRows
        .filter((m) => m.groupNo === g)
        .map((m) => ({
          entry1Id: m.entry1Id!,
          entry2Id: m.entry2Id!,
          winnerEntryId: m.winnerEntryId,
          score: m.score,
        }))
      standings[g] = computeStandings(ids, groupMatches, {
        pointsWin: disc.pointsWin,
        pointsLoss: disc.pointsLoss,
      })
    }
  }

  // Nebenrunde im Gruppenmodus (Stage CONSOLATION, groupNo 0)
  let consolationStandings: StandingRow[] | null = null
  const consoGroupMatches = matchRows.filter((m) => m.stage === 'CONSOLATION' && m.groupNo === 0)
  if (consoGroupMatches.length) {
    const ids = [
      ...new Set(
        consoGroupMatches.flatMap((m) => [m.entry1Id, m.entry2Id]).filter((x): x is number => x != null),
      ),
    ]
    consolationStandings = computeStandings(
      ids,
      consoGroupMatches.map((m) => ({
        entry1Id: m.entry1Id!,
        entry2Id: m.entry2Id!,
        winnerEntryId: m.winnerEntryId,
        score: m.score,
      })),
      { pointsWin: disc.pointsWin, pointsLoss: disc.pointsLoss },
    )
  }

  const { tournament, ...discRest } = disc as typeof disc & { tournament: { name: string; year: number } }

  return {
    discipline: {
      ...discRest,
      tournamentName: tournament.name,
      tournamentYear: tournament.year,
    } as DisciplineData['discipline'],
    entries: entryDtos,
    matches: matchRows,
    standings,
    consolationStandings,
  }
}
