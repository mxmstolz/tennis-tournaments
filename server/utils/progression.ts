/**
 * Persistenz & Fortschritts-Logik für Disziplinen.
 * Schreibt Auslosungspläne in die DB und propagiert Ergebnisse durch den Baum.
 */
import { and, eq } from 'drizzle-orm'
import { useDb } from '../db'
import { entries, matches } from '../db/schema'
import type { KoPlan } from './drawKo'
import type { GroupPlan } from './drawGroup'

type Db = ReturnType<typeof useDb>

function statusFor(entry1: number | null, entry2: number | null, isBye: boolean) {
  if (isBye) return 'BYE' as const
  return entry1 != null && entry2 != null ? ('READY' as const) : ('PENDING' as const)
}

interface PersistKoOptions {
  /** Vorher alle Spiele der Disziplin löschen (Haupt-Auslosung). */
  wipe?: boolean
  /** Stage aller Spiele überschreiben (z. B. CONSOLATION für die Nebenrunde). */
  stageOverride?: 'MAIN' | 'CONSOLATION'
}

/** Schreibt einen KO-Plan in die DB. */
export async function persistKoPlan(
  db: Db,
  disciplineId: number,
  plan: KoPlan,
  opts: PersistKoOptions = {},
) {
  const { wipe = true, stageOverride } = opts
  if (wipe) {
    await db.delete(matches).where(eq(matches.disciplineId, disciplineId))
  } else if (stageOverride) {
    await db
      .delete(matches)
      .where(and(eq(matches.disciplineId, disciplineId), eq(matches.stage, stageOverride)))
  }

  const keyToId: Record<string, number> = {}
  for (const pm of plan.matches) {
    const [row] = await db
      .insert(matches)
      .values({
        disciplineId,
        stage: stageOverride ?? pm.stage,
        round: pm.round,
        slot: pm.slot,
        label: pm.label,
        entry1Id: pm.entry1Id,
        entry2Id: pm.entry2Id,
        status: statusFor(pm.entry1Id, pm.entry2Id, pm.isBye),
      })
      .returning({ id: matches.id })
    keyToId[pm.key] = row.id
  }

  for (const pm of plan.matches) {
    if (!pm.source1 && !pm.source2) continue
    await db
      .update(matches)
      .set({
        source1MatchId: pm.source1 ? keyToId[pm.source1.matchKey] : null,
        source1Result: pm.source1?.result ?? null,
        source2MatchId: pm.source2 ? keyToId[pm.source2.matchKey] : null,
        source2Result: pm.source2?.result ?? null,
      })
      .where(eq(matches.id, keyToId[pm.key]))
  }

  // Freilose auflösen: einzelner Teilnehmer steigt automatisch auf
  await resolveByes(db, disciplineId)
  await recomputeProgression(db, disciplineId)
}

/** Schreibt eine Nebenrunde im Gruppenmodus (Stage CONSOLATION, groupNo = 0). */
export async function persistConsolationGroup(
  db: Db,
  disciplineId: number,
  plan: GroupPlan,
) {
  await db
    .delete(matches)
    .where(and(eq(matches.disciplineId, disciplineId), eq(matches.stage, 'CONSOLATION')))

  for (const gm of plan.matches) {
    await db.insert(matches).values({
      disciplineId,
      stage: 'CONSOLATION',
      round: gm.round,
      slot: gm.slot,
      groupNo: 0, // eine gemeinsame Trostrunden-Gruppe
      label: `Nebenrunde · Spieltag ${gm.round}`,
      entry1Id: gm.entry1Id,
      entry2Id: gm.entry2Id,
      status: 'READY',
    })
  }
}

/** Schreibt einen Gruppen-Plan in die DB (Stage GROUP). */
export async function persistGroupPlan(
  db: Db,
  disciplineId: number,
  plan: GroupPlan,
) {
  await db.delete(matches).where(eq(matches.disciplineId, disciplineId))

  // groupNo je Teilnehmer hinterlegen
  for (const [gStr, ids] of Object.entries(plan.groups)) {
    const groupNo = Number(gStr)
    for (const id of ids) {
      await db.update(entries).set({ groupNo }).where(eq(entries.id, id))
    }
  }

  for (const gm of plan.matches) {
    await db.insert(matches).values({
      disciplineId,
      stage: 'GROUP',
      round: gm.round,
      slot: gm.slot,
      groupNo: gm.groupNo,
      label: gm.label,
      entry1Id: gm.entry1Id,
      entry2Id: gm.entry2Id,
      status: 'READY',
    })
  }
}

/** Setzt für alle Freilos-Spiele den anwesenden Teilnehmer als Sieger. */
async function resolveByes(db: Db, disciplineId: number) {
  const byes = await db
    .select()
    .from(matches)
    .where(and(eq(matches.disciplineId, disciplineId), eq(matches.status, 'BYE')))
  for (const m of byes) {
    const winner = m.entry1Id ?? m.entry2Id
    if (winner != null && m.winnerEntryId !== winner) {
      await db.update(matches).set({ winnerEntryId: winner }).where(eq(matches.id, m.id))
    }
  }
}

/**
 * Rechnet den kompletten Baum neu durch: füllt Teilnehmer aus Quell-Spielen,
 * cleart nachgelagerte Ergebnisse, wenn sich Teilnehmer ändern. Idempotent.
 */
export async function recomputeProgression(db: Db, disciplineId: number) {
  const all = await db.select().from(matches).where(eq(matches.disciplineId, disciplineId))
  const byId = new Map(all.map((m) => [m.id, { ...m }]))

  const loserOf = (m: { entry1Id: number | null; entry2Id: number | null; winnerEntryId: number | null }) => {
    if (m.winnerEntryId == null) return null
    return m.winnerEntryId === m.entry1Id ? m.entry2Id : m.entry1Id
  }

  // In Rundenreihenfolge verarbeiten, damit Quellen vor Zielen aktualisiert sind.
  const ordered = [...byId.values()]
    .filter((m) => m.source1MatchId != null || m.source2MatchId != null)
    .sort((a, b) => a.round - b.round || a.slot - b.slot)

  for (const m of ordered) {
    let e1 = m.entry1Id
    let e2 = m.entry2Id

    if (m.source1MatchId != null) {
      const src = byId.get(m.source1MatchId)
      const ready = src && (src.status === 'DONE' || src.status === 'BYE') && src.winnerEntryId != null
      e1 = ready ? (m.source1Result === 'LOSER' ? loserOf(src!) : src!.winnerEntryId) : null
    }
    if (m.source2MatchId != null) {
      const src = byId.get(m.source2MatchId)
      const ready = src && (src.status === 'DONE' || src.status === 'BYE') && src.winnerEntryId != null
      e2 = ready ? (m.source2Result === 'LOSER' ? loserOf(src!) : src!.winnerEntryId) : null
    }

    const entriesChanged = e1 !== m.entry1Id || e2 !== m.entry2Id
    if (!entriesChanged) continue

    const patch: Record<string, unknown> = { entry1Id: e1, entry2Id: e2 }
    if (m.status === 'DONE') {
      // Teilnehmer haben sich geändert → altes Ergebnis verwerfen (Kaskade).
      patch.winnerEntryId = null
      patch.score = null
    }
    patch.status = e1 != null && e2 != null ? 'READY' : 'PENDING'

    await db.update(matches).set(patch).where(eq(matches.id, m.id))
    // lokalen Cache aktualisieren, damit nachgelagerte Spiele korrekt rechnen
    const cached = byId.get(m.id)!
    cached.entry1Id = e1
    cached.entry2Id = e2
    if (m.status === 'DONE') cached.winnerEntryId = null
    cached.status = patch.status as typeof cached.status
  }
}
