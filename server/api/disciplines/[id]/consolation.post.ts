import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { useDb } from '../../../db'
import { disciplines, entries } from '../../../db/schema'
import { planKnockout, type DrawEntry } from '../../../utils/drawKo'
import { planGroups } from '../../../utils/drawGroup'
import { persistConsolationGroup, persistKoPlan } from '../../../utils/progression'

const schema = z.object({ format: z.enum(['KO', 'GROUP']) })

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const disciplineId = Number(getRouterParam(event, 'id'))
  const { format } = await readValidatedBody(event, schema.parse)
  const db = useDb()

  const disc = await db.query.disciplines.findFirst({ where: eq(disciplines.id, disciplineId) })
  if (!disc) throw createError({ statusCode: 404, statusMessage: 'Disziplin nicht gefunden.' })

  // Manuell angelegte Nebenrunden-Teilnehmer (Platzhalter oder Personen)
  const consoEntries = await db
    .select()
    .from(entries)
    .where(and(eq(entries.disciplineId, disciplineId), eq(entries.isConsolation, true)))

  if (consoEntries.length < 2) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Mindestens 2 Teilnehmer für die Nebenrunde anlegen.',
    })
  }

  const drawEntries: DrawEntry[] = consoEntries.map((e) => ({ id: e.id, seed: e.seed }))

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

  return { ok: true, format, participants: consoEntries.length }
})
