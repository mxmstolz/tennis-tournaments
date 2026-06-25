import { and, eq } from 'drizzle-orm'
import { useDb } from '../../../db'
import { disciplines, entries, matches } from '../../../db/schema'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const disciplineId = Number(getRouterParam(event, 'id'))
  const db = useDb()

  const disc = await db.query.disciplines.findFirst({ where: eq(disciplines.id, disciplineId) })
  if (!disc) throw createError({ statusCode: 404, statusMessage: 'Disziplin nicht gefunden.' })

  // Nebenrunden-Spiele und -Teilnehmer (Platzhalter/Personen) entfernen
  await db
    .delete(matches)
    .where(and(eq(matches.disciplineId, disciplineId), eq(matches.stage, 'CONSOLATION')))
  // Finalrunde (Finale + Spiel um Platz 3) entfernen
  await db
    .delete(matches)
    .where(and(eq(matches.disciplineId, disciplineId), eq(matches.stage, 'FINAL')))
  await db
    .delete(matches)
    .where(and(eq(matches.disciplineId, disciplineId), eq(matches.stage, 'THIRD_PLACE')))
  await db
    .delete(entries)
    .where(and(eq(entries.disciplineId, disciplineId), eq(entries.isConsolation, true)))

  await db
    .update(disciplines)
    .set({ consolation: false, consolationFormat: null })
    .where(eq(disciplines.id, disciplineId))

  return { ok: true }
})
