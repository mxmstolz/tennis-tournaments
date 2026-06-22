import { z } from 'zod'
import { useDb } from '../../db'
import { tournaments } from '../../db/schema'

const schema = z.object({
  name: z.string().min(1),
  year: z.number().int().min(2000).max(2100),
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readValidatedBody(event, schema.parse)
  const db = useDb()
  const [row] = await db.insert(tournaments).values(body).returning()
  return row
})
