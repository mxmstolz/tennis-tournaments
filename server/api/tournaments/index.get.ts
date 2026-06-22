import { desc } from 'drizzle-orm'
import { useDb } from '../../db'
import { tournaments } from '../../db/schema'

export default defineEventHandler(async () => {
  const db = useDb()
  return db.query.tournaments.findMany({
    orderBy: [desc(tournaments.year), desc(tournaments.id)],
    with: { disciplines: true },
  })
})
