import { eq } from 'drizzle-orm'
import { useDb } from '../../../db'
import { disciplines } from '../../../db/schema'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  const db = useDb()
  await db.delete(disciplines).where(eq(disciplines.id, id))
  return { ok: true }
})
