/**
 * Seed: importiert die Stadtmeisterschaft 2026 aus den PDF-Aushängen.
 *
 * Inhalt entspricht den hochgeladenen PDFs: exakte Auslosungen (Slot-Reihenfolge,
 * Freilose/„Rast", Setzung) für KO-Disziplinen sowie die Gruppen-Rosters.
 * Die PDFs enthalten kaum Ergebnisse → die Spiele werden als „ausgelost" angelegt
 * und in der App gespielt. Nebenrunden werden in der App generiert (consolation=true).
 *
 * Ausführen:  NUXT_DATABASE_URL=… pnpm tsx scripts/seed-sm2026.ts
 */
import { neon } from '@neondatabase/serverless'
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http'
import { drizzle as drizzlePg } from 'drizzle-orm/postgres-js'
import { and, eq } from 'drizzle-orm'
import postgres from 'postgres'
import { disciplines, entries, matches, players, tournaments } from '../server/db/schema'
import { roundRobinPairs } from '../server/utils/drawGroup'

const url = process.env.NUXT_DATABASE_URL
if (!url) {
  console.error('NUXT_DATABASE_URL ist nicht gesetzt.')
  process.exit(1)
}
const db: any = url.includes('neon.tech')
  ? drizzleNeon(neon(url))
  : drizzlePg(postgres(url, { max: 1 }))

// ---------------------------------------------------------------------------
// Daten aus den PDFs
// ---------------------------------------------------------------------------

// KO Einzel "Herren" — 16er-Baum, Slot-Reihenfolge (null = Rast/Freilos)
const HERREN_SLOTS: (string | null)[] = [
  'Joshua Raubuch', null, 'Dennis Schroeder', 'Bernhard Raubuch',
  'Maximilian Stolz', 'Daniel Becker I', 'Bernd Schwarz', 'Julian Brengel',
  'Rudi Sapich', 'Peter Baltes', 'Michael Martin', 'Pascal Paul',
  'Mathias Sander', 'Matthias Maas', 'Dirk Onjando', 'Moritz Castor',
]
const HERREN_SEEDS: Record<string, number> = {
  'Joshua Raubuch': 1, 'Moritz Castor': 2, 'Maximilian Stolz': 3, 'Pascal Paul': 4,
}

// KO Einzel "Herren 30" — 8er-Baum
const HERREN30_SLOTS: (string | null)[] = [
  'Matthias Maas', 'Michael Martin', 'Daniel Backes', 'Bernd Schwarz',
  'Dirk Onyando', 'Dominik Bär', 'Matthias Sander', 'Dennis Schroeder',
]

// KO Doppel "Mixed" — 16er-Baum (Teams als Anzeigename)
const MIXED_SLOTS: (string | null)[] = [
  'Michelle Becker + Elia Bach', null, null, 'Susi + Berny Raubuch',
  'Helen Büsselmann + Dirk Onyando', 'Vivien und Dominik Bär',
  'Yvonne + Rudi Sapich', 'Rosi Ludwig + Werner Trunzler',
  'Janine + Matthias Maas', 'Christa + Peter Baltes',
  'Neri Dolecek + Bernd Schwarz', 'Angelika Altmeyer + Matthias Bothe',
  'Martina Koch + Christoph Sommer', 'Julia + Julian Brengel',
  null, 'Hiltrud Sewarte + Daniel Becker II',
]

// KO Doppel "Herren-Doppel" — 16er-Baum
const HERREN_DOPPEL_SLOTS: (string | null)[] = [
  'Daniel Becker II + Elia Bach', null, 'Christoph Sommer + Werner Trunzler', 'Matthias + Jürgen Maas',
  'Rudi Sapich + Berny Raubuch', null, 'Thomas Kurtz + Manfred Conrad', 'Daniel Becker I + Dennis Schroeder',
  'Peter Baltes + Wolfgang Kunkel', null, 'Aaron Hauch + Alexander Kloster', 'Herbert Schikofsky + Matthias Bothe',
  'Julian Brengel + Dirk Onyando', 'Matthias Sander + Bernd Schwarz', null, 'Maximilian Stolz + Joshua Raubuch',
]

// Gruppe Einzel "Damen 30" — eine Gruppe
const DAMEN30 = ['Julia Brengel', 'Jolina Tobias', 'Lena Laub', 'Yvonne Klingenberg']

// Gruppe Einzel "Herren 60" — zwei Gruppen (nur Vornamen → Anzeigename)
const HERREN60_A = ['Matthias', 'Peter', 'Herbert']
const HERREN60_B = ['Thomas', 'Rudi', 'Joachim', 'Bernhard']

// Gruppe Doppel "Damen-Doppel" — zwei Gruppen (Teams als Anzeigename)
const DAMEN_DOPPEL_A = [
  'Rosi Ludwig + Susi Raubuch', 'Julia Brengel + Lena Laub',
  'Angelika Altmeyer + Christa Baltes', 'Jolina Tobias + Yvonne Klingenberg',
]
const DAMEN_DOPPEL_B = [
  'Emily Becker + Hiltrud Sewarte', 'Vivien Bär + Janine Maas',
  'Hildegard Schneider-Verch + Helen Büsselmann', 'Neri Dolecek + Marianne Dahlem',
]

// ---------------------------------------------------------------------------
// Helfer
// ---------------------------------------------------------------------------

function roundName(round: number, rounds: number): string {
  const fromFinal = rounds - round
  return ['Finale', 'Halbfinale', 'Viertelfinale', 'Achtelfinale'][fromFinal] ?? `Runde ${round}`
}

const playerCache = new Map<string, number>()
async function loadPlayers() {
  const all = await db.select().from(players)
  for (const p of all) playerCache.set(`${p.firstName} ${p.lastName}`, p.id)
}
async function getPlayer(fullName: string): Promise<number> {
  if (playerCache.has(fullName)) return playerCache.get(fullName)!
  const idx = fullName.indexOf(' ')
  const firstName = idx === -1 ? fullName : fullName.slice(0, idx)
  const lastName = idx === -1 ? '' : fullName.slice(idx + 1)
  const [row] = await db.insert(players).values({ firstName, lastName }).returning({ id: players.id })
  playerCache.set(fullName, row.id)
  return row.id
}

interface DiscOpts {
  tournamentId: number
  name: string
  kind: 'SINGLES' | 'DOUBLES'
  format: 'KO' | 'GROUP'
  thirdPlaceMatch?: boolean
  consolation?: boolean
  consolationFormat?: 'KO' | 'GROUP' | null
  numGroups?: number
}
async function createDiscipline(o: DiscOpts) {
  const [row] = await db
    .insert(disciplines)
    .values({
      tournamentId: o.tournamentId,
      name: o.name,
      kind: o.kind,
      format: o.format,
      thirdPlaceMatch: o.thirdPlaceMatch ?? true,
      consolation: o.consolation ?? false,
      consolationFormat: o.consolationFormat ?? null,
      numGroups: o.numGroups ?? 1,
      status: 'DRAWN',
    })
    .returning()
  return row
}

/** Legt einen Teilnehmer an: Einzel → echter Spieler, Doppel/Vorname → Anzeigename. */
async function makeEntry(
  disciplineId: number,
  label: string,
  kind: 'SINGLES' | 'DOUBLES',
  opts: { seed?: number; groupNo?: number } = {},
): Promise<number> {
  let player1Id: number | null = null
  let displayName: string | null = null
  if (kind === 'SINGLES' && label.includes(' ')) {
    player1Id = await getPlayer(label) // vollständiger Name → Personen-Pool
  } else {
    displayName = label // Doppel-Team oder reiner Vorname
  }
  const [row] = await db
    .insert(entries)
    .values({ disciplineId, player1Id, displayName, seed: opts.seed ?? null, groupNo: opts.groupNo ?? null })
    .returning({ id: entries.id })
  return row.id
}

/** Baut einen KO-Baum in exakter Slot-Reihenfolge (keine Zufallsauslosung). */
async function seedKo(
  disciplineId: number,
  slots: (string | null)[],
  kind: 'SINGLES' | 'DOUBLES',
  seeds: Record<string, number> = {},
  thirdPlace = true,
) {
  const size = slots.length
  const rounds = Math.log2(size)
  if (!Number.isInteger(rounds)) throw new Error(`Slotanzahl ${size} ist keine 2er-Potenz`)

  // Teilnehmer anlegen, Slot → entryId (null = Rast)
  const slotEntry: (number | null)[] = []
  for (const label of slots) {
    slotEntry.push(label ? await makeEntry(disciplineId, label, kind, { seed: seeds[label] }) : null)
  }

  const keyToId: Record<string, number> = {}
  const keyOf = (r: number, s: number) => `r${r}s${s}`
  interface PM { key: string; stage: string; round: number; slot: number; label: string; e1: number | null; e2: number | null; bye: boolean; s1?: [string, string]; s2?: [string, string] }
  const planned: PM[] = []

  for (let s = 0; s < size / 2; s++) {
    const e1 = slotEntry[2 * s]
    const e2 = slotEntry[2 * s + 1]
    planned.push({ key: keyOf(1, s), stage: 'MAIN', round: 1, slot: s, label: roundName(1, rounds), e1, e2, bye: (e1 == null) !== (e2 == null) })
  }
  for (let r = 2; r <= rounds; r++) {
    for (let s = 0; s < size / 2 ** r; s++) {
      planned.push({ key: keyOf(r, s), stage: 'MAIN', round: r, slot: s, label: roundName(r, rounds), e1: null, e2: null, bye: false, s1: [keyOf(r - 1, 2 * s), 'WINNER'], s2: [keyOf(r - 1, 2 * s + 1), 'WINNER'] })
    }
  }
  if (thirdPlace && rounds >= 2) {
    planned.push({ key: 'third', stage: 'THIRD_PLACE', round: rounds, slot: 1, label: 'Spiel um Platz 3', e1: null, e2: null, bye: false, s1: [keyOf(rounds - 1, 0), 'LOSER'], s2: [keyOf(rounds - 1, 1), 'LOSER'] })
  }

  for (const pm of planned) {
    const status = pm.bye ? 'BYE' : pm.e1 != null && pm.e2 != null ? 'READY' : 'PENDING'
    const [row] = await db.insert(matches).values({ disciplineId, stage: pm.stage, round: pm.round, slot: pm.slot, label: pm.label, entry1Id: pm.e1, entry2Id: pm.e2, status }).returning({ id: matches.id })
    keyToId[pm.key] = row.id
  }
  for (const pm of planned) {
    if (!pm.s1 && !pm.s2) continue
    await db.update(matches).set({
      source1MatchId: pm.s1 ? keyToId[pm.s1[0]] : null,
      source1Result: pm.s1?.[1] as 'WINNER' | 'LOSER' | undefined,
      source2MatchId: pm.s2 ? keyToId[pm.s2[0]] : null,
      source2Result: pm.s2?.[1] as 'WINNER' | 'LOSER' | undefined,
    }).where(eq(matches.id, keyToId[pm.key]))
  }

  // Freilose auflösen + Sieger eine Runde weiter propagieren
  const all = await db.select().from(matches).where(eq(matches.disciplineId, disciplineId))
  const byId = new Map<number, any>(all.map((m: any) => [m.id, m]))
  for (const m of byId.values()) {
    if (m.status === 'BYE') {
      const winner = m.entry1Id ?? m.entry2Id
      await db.update(matches).set({ winnerEntryId: winner }).where(eq(matches.id, m.id))
      m.winnerEntryId = winner
    }
  }
  const ordered = [...byId.values()].filter((m) => m.source1MatchId || m.source2MatchId).sort((a, b) => a.round - b.round || a.slot - b.slot)
  for (const m of ordered) {
    let e1 = m.entry1Id
    let e2 = m.entry2Id
    if (m.source1MatchId) {
      const src = byId.get(m.source1MatchId)
      if (src && (src.status === 'BYE' || src.status === 'DONE') && src.winnerEntryId != null) e1 = src.winnerEntryId
    }
    if (m.source2MatchId) {
      const src = byId.get(m.source2MatchId)
      if (src && (src.status === 'BYE' || src.status === 'DONE') && src.winnerEntryId != null) e2 = src.winnerEntryId
    }
    if (e1 !== m.entry1Id || e2 !== m.entry2Id) {
      const status = e1 != null && e2 != null ? 'READY' : 'PENDING'
      await db.update(matches).set({ entry1Id: e1, entry2Id: e2, status }).where(eq(matches.id, m.id))
      m.entry1Id = e1
      m.entry2Id = e2
      m.status = status
    }
  }
}

/** Legt eine Gruppen-Disziplin mit festen Gruppen an (Round-Robin je Gruppe). */
async function seedGroups(disciplineId: number, kind: 'SINGLES' | 'DOUBLES', groups: string[][]) {
  for (let g = 0; g < groups.length; g++) {
    const groupNo = g + 1
    const ids: number[] = []
    for (const label of groups[g]) ids.push(await makeEntry(disciplineId, label, kind, { groupNo }))
    const pairs = roundRobinPairs(ids)
    for (let i = 0; i < pairs.length; i++) {
      const p = pairs[i]
      await db.insert(matches).values({
        disciplineId, stage: 'GROUP', round: p.round, slot: i, groupNo,
        label: `Gruppe ${groupNo} · Spieltag ${p.round}`, entry1Id: p.a, entry2Id: p.b, status: 'READY',
      })
    }
  }
}

// ---------------------------------------------------------------------------
// Hauptlauf
// ---------------------------------------------------------------------------
async function main() {
  await loadPlayers()

  // bestehendes Turnier mit gleichem Namen/Jahr entfernen (idempotent)
  await db.delete(tournaments).where(and(eq(tournaments.name, 'Stadtmeisterschaft'), eq(tournaments.year, 2026)))

  const [t] = await db.insert(tournaments).values({ name: 'Stadtmeisterschaft', year: 2026 }).returning()
  console.log(`Turnier #${t.id} angelegt`)

  const herren = await createDiscipline({ tournamentId: t.id, name: 'Herren', kind: 'SINGLES', format: 'KO' })
  await seedKo(herren.id, HERREN_SLOTS, 'SINGLES', HERREN_SEEDS)

  const herren30 = await createDiscipline({ tournamentId: t.id, name: 'Herren 30', kind: 'SINGLES', format: 'KO', consolation: true, consolationFormat: 'GROUP' })
  await seedKo(herren30.id, HERREN30_SLOTS, 'SINGLES')

  const mixed = await createDiscipline({ tournamentId: t.id, name: 'Mixed', kind: 'DOUBLES', format: 'KO', consolation: true, consolationFormat: 'KO' })
  await seedKo(mixed.id, MIXED_SLOTS, 'DOUBLES')

  const herrenDoppel = await createDiscipline({ tournamentId: t.id, name: 'Herren-Doppel', kind: 'DOUBLES', format: 'KO', consolation: true, consolationFormat: 'KO' })
  await seedKo(herrenDoppel.id, HERREN_DOPPEL_SLOTS, 'DOUBLES')

  const damen30 = await createDiscipline({ tournamentId: t.id, name: 'Damen 30', kind: 'SINGLES', format: 'GROUP', numGroups: 1 })
  await seedGroups(damen30.id, 'SINGLES', [DAMEN30])

  const herren60 = await createDiscipline({ tournamentId: t.id, name: 'Herren 60', kind: 'SINGLES', format: 'GROUP', numGroups: 2 })
  await seedGroups(herren60.id, 'SINGLES', [HERREN60_A, HERREN60_B])

  const damenDoppel = await createDiscipline({ tournamentId: t.id, name: 'Damen-Doppel', kind: 'DOUBLES', format: 'GROUP', numGroups: 2 })
  await seedGroups(damenDoppel.id, 'DOUBLES', [DAMEN_DOPPEL_A, DAMEN_DOPPEL_B])

  console.log('✅ Seed abgeschlossen: 7 Disziplinen importiert.')
  process.exit(0)
}

main().catch((e) => { console.error('❌', e); process.exit(1) })
