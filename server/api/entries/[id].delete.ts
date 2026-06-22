import { eq } from 'drizzle-orm'
import { useDb } from '../../db'
import { entries } from '../../db/schema'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  const db = useDb()
  await db.delete(entries).where(eq(entries.id, id))
  return { ok: true }
})
