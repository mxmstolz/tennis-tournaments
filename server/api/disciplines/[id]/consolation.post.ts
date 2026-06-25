import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { useDb } from '../../../db'
import { disciplines, entries } from '../../../db/schema'
import { planKnockout, type DrawEntry } from '../../../utils/drawKo'
import { planGroups } from '../../../utils/drawGroup'
import { persistConsolationGroup, persistGroupFinals, persistKoPlan } from '../../../utils/progression'

const schema = z.object({ format: z.enum(['KO', 'GROUP', 'FINALS']) })

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const disciplineId = Number(getRouterParam(event, 'id'))
  const { format } = await readValidatedBody(event, schema.parse)
  const db = useDb()

  const disc = await db.query.disciplines.findFirst({ where: eq(disciplines.id, disciplineId) })
  if (!disc) throw createError({ statusCode: 404, statusMessage: 'Disziplin nicht gefunden.' })

  // Finalrunde: beide Gruppensieger spielen das Finale, die Gruppenzweiten um Platz 3.
  // Teilnehmer ergeben sich aus den Gruppen (Platzhalter, später zuweisbar).
  if (format === 'FINALS') {
    if (disc.format !== 'GROUP' || disc.numGroups !== 2) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Finalrunde ist nur für Gruppenturniere mit genau 2 Gruppen möglich.',
      })
    }
    await persistGroupFinals(db, disciplineId)
    await db
      .update(disciplines)
      .set({ consolation: true, consolationFormat: 'FINALS' })
      .where(eq(disciplines.id, disciplineId))
    return { ok: true, format, participants: 4 }
  }

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
    const plan = planKnockout(drawEntries, { thirdPlace: true })
    await persistKoPlan(db, disciplineId, plan, { wipe: false, stageOverride: 'CONSOLATION' })
  }

  await db
    .update(disciplines)
    .set({ consolation: true, consolationFormat: format })
    .where(eq(disciplines.id, disciplineId))

  return { ok: true, format, participants: consoEntries.length }
})
