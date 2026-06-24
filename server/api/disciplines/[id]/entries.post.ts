import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { useDb } from '../../../db'
import { disciplines, entries } from '../../../db/schema'

const schema = z.object({
  player1Id: z.number().int().nullable().optional(),
  player2Id: z.number().int().nullable().optional(),
  displayName: z.string().min(1).nullable().optional(),
  seed: z.number().int().min(1).nullable().optional(),
  isConsolation: z.boolean().optional(),
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const disciplineId = Number(getRouterParam(event, 'id'))
  const body = await readValidatedBody(event, schema.parse)
  const db = useDb()

  const disc = await db.query.disciplines.findFirst({ where: eq(disciplines.id, disciplineId) })
  if (!disc) throw createError({ statusCode: 404, statusMessage: 'Disziplin nicht gefunden.' })
  // Nebenrunden-Teilnehmer (Platzhalter) entstehen nach der Hauptauslosung – daher Bypass.
  if (!body.isConsolation && disc.status !== 'SETUP') {
    throw createError({
      statusCode: 409,
      statusMessage: 'Teilnehmer können nur vor der Auslosung geändert werden.',
    })
  }
  if (!body.player1Id && !body.displayName) {
    throw createError({ statusCode: 400, statusMessage: 'Spieler oder Bezeichnung erforderlich.' })
  }

  const [row] = await db
    .insert(entries)
    .values({
      disciplineId,
      player1Id: body.player1Id ?? null,
      player2Id: body.player2Id ?? null,
      displayName: body.displayName ?? null,
      seed: body.seed ?? null,
      isConsolation: body.isConsolation ?? false,
    })
    .returning()
  return row
})
