import { neon } from '@neondatabase/serverless'
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http'
import { drizzle as drizzlePg } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

type Db = ReturnType<typeof drizzleNeon<typeof schema>>

let _db: Db | null = null

function isNeon(url: string) {
  return url.includes('neon.tech')
}

/**
 * Liefert einen Singleton-Drizzle-Client.
 * - Neon-URLs nutzen den serverless HTTP-Treiber (ideal für Netlify Functions).
 * - Andere Postgres-URLs (z. B. lokal) nutzen postgres-js.
 * Verbindung kommt aus der Runtime-Config (NUXT_DATABASE_URL).
 */
export function useDb(): Db {
  if (_db) return _db
  const url = useRuntimeConfig().databaseUrl
  if (!url) {
    throw createError({ statusCode: 500, statusMessage: 'NUXT_DATABASE_URL ist nicht gesetzt.' })
  }
  _db = isNeon(url)
    ? drizzleNeon(neon(url), { schema })
    : (drizzlePg(postgres(url), { schema }) as unknown as Db)
  return _db
}

export { schema }
