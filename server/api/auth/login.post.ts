import { z } from 'zod'

const schema = z.object({ password: z.string().min(1) })

export default defineEventHandler(async (event) => {
  const { password } = await readValidatedBody(event, schema.parse)
  const cfg = useRuntimeConfig()
  if (!cfg.adminPassword || password !== cfg.adminPassword) {
    throw createError({ statusCode: 401, statusMessage: 'Falsches Passwort.' })
  }
  await setUserSession(event, { user: { admin: true } })
  return { ok: true }
})
