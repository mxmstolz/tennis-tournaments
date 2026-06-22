import { asc } from 'drizzle-orm'
import { useDb } from '../../db'
import { players } from '../../db/schema'

export default defineEventHandler(async () => {
  const db = useDb()
  return db.select().from(players).orderBy(asc(players.lastName), asc(players.firstName))
})
