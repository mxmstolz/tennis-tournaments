import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { useDb } from '../../db'
import { tournaments } from '../../db/schema'

const schema = z.object({
  name: z.string().min(1).optional(),
  year: z.number().int().min(2000).max(2100).optional(),
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  const body = await readValidatedBody(event, schema.parse)
  const db = useDb()
  const [row] = await db.update(tournaments).set(body).where(eq(tournaments.id, id)).returning()
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Turnier nicht gefunden.' })
  return row
})
