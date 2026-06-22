import { eq } from 'drizzle-orm'
import { useDb } from '../../../db'
import { disciplines, entries } from '../../../db/schema'
import { planKnockout, type DrawEntry } from '../../../utils/drawKo'
import { planGroups } from '../../../utils/drawGroup'
import { persistKoPlan, persistGroupPlan } from '../../../utils/progression'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const disciplineId = Number(getRouterParam(event, 'id'))
  const db = useDb()

  const disc = await db.query.disciplines.findFirst({ where: eq(disciplines.id, disciplineId) })
  if (!disc) throw createError({ statusCode: 404, statusMessage: 'Disziplin nicht gefunden.' })

  const rows = await db.select().from(entries).where(eq(entries.disciplineId, disciplineId))
  if (rows.length < 2) {
    throw createError({ statusCode: 400, statusMessage: 'Mindestens 2 Teilnehmer nötig.' })
  }

  const drawEntries: DrawEntry[] = rows.map((e) => ({ id: e.id, seed: e.seed }))

  if (disc.format === 'KO') {
    const plan = planKnockout(drawEntries, { thirdPlace: disc.thirdPlaceMatch })
    await persistKoPlan(db, disciplineId, plan)
  } else {
    const plan = planGroups(drawEntries, disc.numGroups)
    await persistGroupPlan(db, disciplineId, plan)
  }

  await db.update(disciplines).set({ status: 'DRAWN' }).where(eq(disciplines.id, disciplineId))
  return { ok: true }
})
