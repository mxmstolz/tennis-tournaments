import { relations } from 'drizzle-orm'
import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core'
import type { MatchScore } from '../utils/score'

// ---- Enums -----------------------------------------------------------------

export const disciplineKind = pgEnum('discipline_kind', ['SINGLES', 'DOUBLES'])
export const disciplineFormat = pgEnum('discipline_format', ['KO', 'GROUP'])
export const disciplineStatus = pgEnum('discipline_status', [
  'SETUP', // Teilnehmer werden erfasst
  'DRAWN', // ausgelost, Baum/Gruppen stehen
  'RUNNING', // Spiele laufen
  'DONE', // abgeschlossen
])
export const matchStage = pgEnum('match_stage', [
  'MAIN', // Hauptrunde KO
  'GROUP', // Gruppenphase
  'THIRD_PLACE', // Spiel um Platz 3
  'FINAL', // Endspiel (für spätere Gruppe->Finalrunde)
  'CONSOLATION', // Nebenrunde
])
export const matchStatus = pgEnum('match_status', [
  'PENDING', // Teilnehmer noch nicht vollständig bekannt
  'READY', // beide Teilnehmer stehen fest
  'DONE', // Ergebnis eingetragen
  'BYE', // Freilos (Rast)
])
export const sourceResult = pgEnum('source_result', ['WINNER', 'LOSER'])

// ---- Tables ----------------------------------------------------------------

export const tournaments = pgTable('tournaments', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  year: integer('year').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const players = pgTable('players', {
  id: serial('id').primaryKey(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  note: text('note'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const disciplines = pgTable('disciplines', {
  id: serial('id').primaryKey(),
  tournamentId: integer('tournament_id')
    .notNull()
    .references(() => tournaments.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  kind: disciplineKind('kind').notNull().default('SINGLES'),
  format: disciplineFormat('format').notNull().default('KO'),
  status: disciplineStatus('status').notNull().default('SETUP'),
  // KO
  thirdPlaceMatch: boolean('third_place_match').notNull().default(true),
  consolation: boolean('consolation').notNull().default(false),
  consolationFormat: disciplineFormat('consolation_format'),
  // GROUP
  numGroups: integer('num_groups').notNull().default(1),
  pointsWin: integer('points_win').notNull().default(2),
  pointsLoss: integer('points_loss').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const entries = pgTable('entries', {
  id: serial('id').primaryKey(),
  disciplineId: integer('discipline_id')
    .notNull()
    .references(() => disciplines.id, { onDelete: 'cascade' }),
  player1Id: integer('player1_id').references(() => players.id, { onDelete: 'set null' }),
  player2Id: integer('player2_id').references(() => players.id, { onDelete: 'set null' }),
  // Freie Bezeichnung (z. B. "Verlierer Spiel 1"), überschreibt die Spielernamen
  displayName: text('display_name'),
  seed: integer('seed'), // Setzposition (1..n), null = ungesetzt
  groupNo: integer('group_no'), // bei Gruppenmodus
  // Teilnehmer der manuellen Nebenrunde (Platzhalter o. Person), nicht im Hauptfeld
  isConsolation: boolean('is_consolation').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const matches = pgTable('matches', {
  id: serial('id').primaryKey(),
  disciplineId: integer('discipline_id')
    .notNull()
    .references(() => disciplines.id, { onDelete: 'cascade' }),
  stage: matchStage('stage').notNull().default('MAIN'),
  round: integer('round').notNull().default(1),
  slot: integer('slot').notNull().default(0),
  groupNo: integer('group_no'),
  label: text('label'), // "Spiel 1", "Halbfinale", ...
  entry1Id: integer('entry1_id').references(() => entries.id, { onDelete: 'set null' }),
  entry2Id: integer('entry2_id').references(() => entries.id, { onDelete: 'set null' }),
  // Platzhalter-Verkettung für KO-Bäume
  source1MatchId: integer('source1_match_id'),
  source1Result: sourceResult('source1_result'),
  source2MatchId: integer('source2_match_id'),
  source2Result: sourceResult('source2_result'),
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
  winnerEntryId: integer('winner_entry_id').references(() => entries.id, { onDelete: 'set null' }),
  score: jsonb('score').$type<MatchScore>(),
  status: matchStatus('status').notNull().default('PENDING'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// ---- Relations -------------------------------------------------------------

export const tournamentRelations = relations(tournaments, ({ many }) => ({
  disciplines: many(disciplines),
}))

export const disciplineRelations = relations(disciplines, ({ one, many }) => ({
  tournament: one(tournaments, {
    fields: [disciplines.tournamentId],
    references: [tournaments.id],
  }),
  entries: many(entries),
  matches: many(matches),
}))

export const entryRelations = relations(entries, ({ one }) => ({
  discipline: one(disciplines, {
    fields: [entries.disciplineId],
    references: [disciplines.id],
  }),
  player1: one(players, { fields: [entries.player1Id], references: [players.id] }),
  player2: one(players, { fields: [entries.player2Id], references: [players.id] }),
}))

export const matchRelations = relations(matches, ({ one }) => ({
  discipline: one(disciplines, {
    fields: [matches.disciplineId],
    references: [disciplines.id],
  }),
}))

// ---- Inferred types --------------------------------------------------------

export type Tournament = typeof tournaments.$inferSelect
export type Player = typeof players.$inferSelect
export type Discipline = typeof disciplines.$inferSelect
export type Entry = typeof entries.$inferSelect
export type Match = typeof matches.$inferSelect
