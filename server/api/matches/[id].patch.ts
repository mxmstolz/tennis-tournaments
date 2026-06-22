import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { useDb } from '../../db'
import { disciplines, matches } from '../../db/schema'
import { recomputeProgression } from '../../utils/progression'
import { validateMatchScore } from '../../utils/score'

const setSchema = z.object({ p1: z.number().int().min(0), p2: z.number().int().min(0) })
const scoreSchema = z.object({
  sets: z.array(setSchema),
  retired: z.enum(['p1', 'p2']).optional(),
  walkover: z.enum(['p1', 'p2']).optional(),
})

const schema = z.object({
  score: scoreSchema.nullable().optional(),
  scheduledAt: z.string().nullable().optional(),
  clear: z.boolean().optional(),
})

async function syncDisciplineStatus(db: ReturnType<typeof useDb>, disciplineId: number) {
  const all = await db.select().from(matches).where(eq(matches.disciplineId, disciplineId))
  const settled = all.filter((m) => m.status === 'DONE' || m.status === 'BYE')
  let status: 'DRAWN' | 'RUNNING' | 'DONE' = 'DRAWN'
  if (all.length && settled.length === all.length) status = 'DONE'
  else if (all.some((m) => m.status === 'DONE')) status = 'RUNNING'
  await db.update(disciplines).set({ status }).where(eq(disciplines.id, disciplineId))
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  const body = await readValidatedBody(event, schema.parse)
  const db = useDb()

  const match = await db.query.matches.findFirst({ where: eq(matches.id, id) })
  if (!match) throw createError({ statusCode: 404, statusMessage: 'Spiel nicht gefunden.' })

  const patch: Record<string, unknown> = {}

  if (body.scheduledAt !== undefined) {
    patch.scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null
  }

  if (body.clear) {
    patch.score = null
    patch.winnerEntryId = null
    patch.status = match.entry1Id != null && match.entry2Id != null ? 'READY' : 'PENDING'
  } else if (body.score) {
    if (match.entry1Id == null || match.entry2Id == null) {
      throw createError({ statusCode: 409, statusMessage: 'Teilnehmer stehen noch nicht fest.' })
    }
    const result = validateMatchScore(body.score)
    if (!result.valid || !result.winner) {
      throw createError({ statusCode: 400, statusMessage: result.errors.join(' ') || 'Ungültiges Ergebnis.' })
    }
    patch.score = body.score
    patch.winnerEntryId = result.winner === 'p1' ? match.entry1Id : match.entry2Id
    patch.status = 'DONE'
  }

  await db.update(matches).set(patch).where(eq(matches.id, id))

  // Sieger durch den Baum propagieren (auch nach Korrekturen).
  if (body.clear || body.score) {
    await recomputeProgression(db, match.disciplineId)
    await syncDisciplineStatus(db, match.disciplineId)
  }

  return db.query.matches.findFirst({ where: eq(matches.id, id) })
})
