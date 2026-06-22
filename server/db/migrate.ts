/**
 * Standalone migration runner (run with `pnpm db:migrate`).
 * Wählt den Treiber anhand der Connection-URL (Neon HTTP oder postgres-js).
 */
import { neon } from '@neondatabase/serverless'
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http'
import { migrate as migrateNeon } from 'drizzle-orm/neon-http/migrator'
import { drizzle as drizzlePg } from 'drizzle-orm/postgres-js'
import { migrate as migratePg } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'

const url = process.env.NUXT_DATABASE_URL
if (!url) {
  console.error('NUXT_DATABASE_URL ist nicht gesetzt.')
  process.exit(1)
}

const folder = './server/db/migrations'

if (url.includes('neon.tech')) {
  await migrateNeon(drizzleNeon(neon(url)), { migrationsFolder: folder })
} else {
  const client = postgres(url, { max: 1 })
  await migratePg(drizzlePg(client), { migrationsFolder: folder })
  await client.end()
}
console.log('Migrationen angewendet.')
