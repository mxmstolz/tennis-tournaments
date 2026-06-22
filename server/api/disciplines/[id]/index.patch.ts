import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { useDb } from '../../../db'
import { disciplines } from '../../../db/schema'

const schema = z.object({
  name: z.string().min(1).optional(),
  kind: z.enum(['SINGLES', 'DOUBLES']).optional(),
  format: z.enum(['KO', 'GROUP']).optional(),
  thirdPlaceMatch: z.boolean().optional(),
  consolation: z.boolean().optional(),
  consolationFormat: z.enum(['KO', 'GROUP']).nullable().optional(),
  numGroups: z.number().int().min(1).max(16).optional(),
  pointsWin: z.number().int().optional(),
  pointsLoss: z.number().int().optional(),
  status: z.enum(['SETUP', 'DRAWN', 'RUNNING', 'DONE']).optional(),
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  const body = await readValidatedBody(event, schema.parse)
  const db = useDb()
  const [row] = await db.update(disciplines).set(body).where(eq(disciplines.id, id)).returning()
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Disziplin nicht gefunden.' })
  return row
})
