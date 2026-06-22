CREATE TYPE "public"."discipline_format" AS ENUM('KO', 'GROUP');--> statement-breakpoint
CREATE TYPE "public"."discipline_kind" AS ENUM('SINGLES', 'DOUBLES');--> statement-breakpoint
CREATE TYPE "public"."discipline_status" AS ENUM('SETUP', 'DRAWN', 'RUNNING', 'DONE');--> statement-breakpoint
CREATE TYPE "public"."match_stage" AS ENUM('MAIN', 'GROUP', 'THIRD_PLACE', 'FINAL', 'CONSOLATION');--> statement-breakpoint
CREATE TYPE "public"."match_status" AS ENUM('PENDING', 'READY', 'DONE', 'BYE');--> statement-breakpoint
CREATE TYPE "public"."source_result" AS ENUM('WINNER', 'LOSER');--> statement-breakpoint
CREATE TABLE "disciplines" (
	"id" serial PRIMARY KEY NOT NULL,
	"tournament_id" integer NOT NULL,
	"name" text NOT NULL,
	"kind" "discipline_kind" DEFAULT 'SINGLES' NOT NULL,
	"format" "discipline_format" DEFAULT 'KO' NOT NULL,
	"status" "discipline_status" DEFAULT 'SETUP' NOT NULL,
	"third_place_match" boolean DEFAULT true NOT NULL,
	"consolation" boolean DEFAULT false NOT NULL,
	"consolation_format" "discipline_format",
	"num_groups" integer DEFAULT 1 NOT NULL,
	"points_win" integer DEFAULT 2 NOT NULL,
	"points_loss" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"discipline_id" integer NOT NULL,
	"player1_id" integer,
	"player2_id" integer,
	"display_name" text,
	"seed" integer,
	"group_no" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"id" serial PRIMARY KEY NOT NULL,
	"discipline_id" integer NOT NULL,
	"stage" "match_stage" DEFAULT 'MAIN' NOT NULL,
	"round" integer DEFAULT 1 NOT NULL,
	"slot" integer DEFAULT 0 NOT NULL,
	"group_no" integer,
	"label" text,
	"entry1_id" integer,
	"entry2_id" integer,
	"source1_match_id" integer,
	"source1_result" "source_result",
	"source2_match_id" integer,
	"source2_result" "source_result",
	"scheduled_at" timestamp with time zone,
	"winner_entry_id" integer,
	"score" jsonb,
	"status" "match_status" DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" serial PRIMARY KEY NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tournaments" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"year" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "disciplines" ADD CONSTRAINT "disciplines_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entries" ADD CONSTRAINT "entries_discipline_id_disciplines_id_fk" FOREIGN KEY ("discipline_id") REFERENCES "public"."disciplines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entries" ADD CONSTRAINT "entries_player1_id_players_id_fk" FOREIGN KEY ("player1_id") REFERENCES "public"."players"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entries" ADD CONSTRAINT "entries_player2_id_players_id_fk" FOREIGN KEY ("player2_id") REFERENCES "public"."players"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_discipline_id_disciplines_id_fk" FOREIGN KEY ("discipline_id") REFERENCES "public"."disciplines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_entry1_id_entries_id_fk" FOREIGN KEY ("entry1_id") REFERENCES "public"."entries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_entry2_id_entries_id_fk" FOREIGN KEY ("entry2_id") REFERENCES "public"."entries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_winner_entry_id_entries_id_fk" FOREIGN KEY ("winner_entry_id") REFERENCES "public"."entries"("id") ON DELETE set null ON UPDATE no action;