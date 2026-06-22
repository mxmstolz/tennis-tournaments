import { eq } from 'drizzle-orm'
import { useDb } from '../../db'
import { players } from '../../db/schema'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  const db = useDb()
  await db.delete(players).where(eq(players.id, id))
  return { ok: true }
})
