import { z } from 'zod'
import { useDb } from '../../db'
import { disciplines } from '../../db/schema'

const schema = z.object({
  tournamentId: z.number().int(),
  name: z.string().min(1),
  kind: z.enum(['SINGLES', 'DOUBLES']).default('SINGLES'),
  format: z.enum(['KO', 'GROUP']).default('KO'),
  thirdPlaceMatch: z.boolean().default(true),
  consolation: z.boolean().default(false),
  consolationFormat: z.enum(['KO', 'GROUP']).nullable().default(null),
  numGroups: z.number().int().min(1).max(16).default(1),
  pointsWin: z.number().int().default(2),
  pointsLoss: z.number().int().default(0),
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readValidatedBody(event, schema.parse)
  const db = useDb()
  const [row] = await db.insert(disciplines).values(body).returning()
  return row
})
