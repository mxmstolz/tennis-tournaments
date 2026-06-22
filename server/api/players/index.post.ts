import { z } from 'zod'
import { useDb } from '../../db'
import { players } from '../../db/schema'

const schema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  note: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readValidatedBody(event, schema.parse)
  const db = useDb()
  const [row] = await db.insert(players).values(body).returning()
  return row
})
