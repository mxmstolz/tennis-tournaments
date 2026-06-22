import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { useDb } from '../../../db'
import { disciplines, matches } from '../../../db/schema'
import { planKnockout, type DrawEntry } from '../../../utils/drawKo'
import { planGroups } from '../../../utils/drawGroup'
import { persistConsolationGroup, persistKoPlan } from '../../../utils/progression'

const schema = z.object({ format: z.enum(['KO', 'GROUP']).optional() }).optional()

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const disciplineId = Number(getRouterParam(event, 'id'))
  const body = (await readBody(event).catch(() => ({}))) ?? {}
  const parsed = schema.parse(body) ?? {}
  const db = useDb()

  const disc = await db.query.disciplines.findFirst({ where: eq(disciplines.id, disciplineId) })
  if (!disc) throw createError({ statusCode: 404, statusMessage: 'Disziplin nicht gefunden.' })
  if (disc.format !== 'KO') {
    throw createError({ statusCode: 400, statusMessage: 'Nebenrunde nur im KO-System.' })
  }

  // Verlierer der ersten Hauptrunde ermitteln
  const firstRound = await db
    .select()
    .from(matches)
    .where(
      and(
        eq(matches.disciplineId, disciplineId),
        eq(matches.stage, 'MAIN'),
        eq(matches.round, 1),
      ),
    )

  const loserIds = firstRound
    .filter((m) => m.status === 'DONE' && m.winnerEntryId != null && m.entry1Id && m.entry2Id)
    .map((m) => (m.winnerEntryId === m.entry1Id ? m.entry2Id! : m.entry1Id!))

  if (loserIds.length < 2) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Zu wenige Verlierer der ersten Runde (Ergebnisse zuerst eintragen).',
    })
  }

  const format = parsed.format ?? disc.consolationFormat ?? (loserIds.length <= 4 ? 'GROUP' : 'KO')
  const drawEntries: DrawEntry[] = loserIds.map((id) => ({ id, seed: null }))

  if (format === 'GROUP') {
    const plan = planGroups(drawEntries, 1)
    await persistConsolationGroup(db, disciplineId, plan)
  } else {
    const plan = planKnockout(drawEntries, { thirdPlace: false })
    await persistKoPlan(db, disciplineId, plan, { wipe: false, stageOverride: 'CONSOLATION' })
  }

  await db
    .update(disciplines)
    .set({ consolation: true, consolationFormat: format })
    .where(eq(disciplines.id, disciplineId))

  return { ok: true, format, participants: loserIds.length }
})
