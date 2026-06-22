import { eq } from 'drizzle-orm'
import { useDb } from '../../db'
import { tournaments } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const db = useDb()
  const row = await db.query.tournaments.findFirst({
    where: eq(tournaments.id, id),
    with: { disciplines: { with: { entries: true } } },
  })
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Turnier nicht gefunden.' })
  return row
})
