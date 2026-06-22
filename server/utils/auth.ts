import type { H3Event } from 'h3'

/**
 * Stellt sicher, dass der Aufrufer als Orga-Admin eingeloggt ist.
 * Wirft 401, wenn keine gültige Session vorhanden ist.
 */
export async function requireAdmin(event: H3Event) {
  const session = await requireUserSession(event)
  if (!session.user || (session.user as { admin?: boolean }).admin !== true) {
    throw createError({ statusCode: 403, statusMessage: 'Nicht autorisiert.' })
  }
  return session
}
