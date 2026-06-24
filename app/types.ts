import type { MatchScore } from './utils/tennis'

export interface EntryDto {
  id: number
  seed: number | null
  groupNo: number | null
  name: string
  player1Id: number | null
  player2Id: number | null
  isConsolation: boolean
}

export interface MatchDto {
  id: number
  disciplineId: number
  stage: 'MAIN' | 'GROUP' | 'THIRD_PLACE' | 'FINAL' | 'CONSOLATION'
  round: number
  slot: number
  groupNo: number | null
  label: string | null
  entry1Id: number | null
  entry2Id: number | null
  source1MatchId: number | null
  source1Result: 'WINNER' | 'LOSER' | null
  source2MatchId: number | null
  source2Result: 'WINNER' | 'LOSER' | null
  scheduledAt: string | null
  winnerEntryId: number | null
  score: MatchScore | null
  status: 'PENDING' | 'READY' | 'DONE' | 'BYE'
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

export interface DisciplineDto {
  id: number
  tournamentId: number
  name: string
  kind: 'SINGLES' | 'DOUBLES'
  format: 'KO' | 'GROUP'
  status: 'SETUP' | 'DRAWN' | 'RUNNING' | 'DONE'
  thirdPlaceMatch: boolean
  consolation: boolean
  consolationFormat: 'KO' | 'GROUP' | null
  numGroups: number
  pointsWin: number
  pointsLoss: number
  tournamentName: string
  tournamentYear: number
}

export interface DisciplineData {
  discipline: DisciplineDto
  entries: EntryDto[]
  matches: MatchDto[]
  standings: Record<number, StandingRow[]>
  consolationStandings: StandingRow[] | null
}
