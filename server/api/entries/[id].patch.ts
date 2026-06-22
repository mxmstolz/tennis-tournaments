import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { useDb } from '../../db'
import { entries } from '../../db/schema'

const schema = z.object({
  player1Id: z.number().int().nullable().optional(),
  player2Id: z.number().int().nullable().optional(),
  displayName: z.string().min(1).nullable().optional(),
  seed: z.number().int().min(1).nullable().optional(),
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  const body = await readValidatedBody(event, schema.parse)
  const db = useDb()
  const [row] = await db.update(entries).set(body).where(eq(entries.id, id)).returning()
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Teilnehmer nicht gefunden.' })
  return row
})
