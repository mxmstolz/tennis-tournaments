import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { useDb } from '../../db'
import { players } from '../../db/schema'

const schema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  note: z.string().nullable().optional(),
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  const body = await readValidatedBody(event, schema.parse)
  const db = useDb()
  const [row] = await db.update(players).set(body).where(eq(players.id, id)).returning()
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Person nicht gefunden.' })
  return row
})
