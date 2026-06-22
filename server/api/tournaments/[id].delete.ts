import { eq } from 'drizzle-orm'
import { useDb } from '../../db'
import { tournaments } from '../../db/schema'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  const db = useDb()
  await db.delete(tournaments).where(eq(tournaments.id, id))
  return { ok: true }
})
