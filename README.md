# Stadtmeisterschaften – TC Rot-Weiß Püttlingen

Turnieranwendung für die Tennis-Stadtmeisterschaften. Ersetzt die bisherige
PDF/Excel-Verwaltung: Turniere & Disziplinen anlegen, Personen erfassen,
auslosen und Spiele durchführen.

## Funktionen

- **Zwei Modi je Disziplin:** KO-System (mit Setzung & Freilosen/„Rast") und
  Gruppe (Round-Robin mit Tabelle).
- **Einzel & Doppel.**
- **Tennisregeln:** 2 Gewinnsätze, 3. Satz = Match-Tiebreak (bis 10).
  Ergebnisse werden validiert; w.o. und Aufgabe werden unterstützt.
- **KO:** automatische Auslosung mit Standard-Setzschema, Freilose für
  Topgesetzte, Sieger-Propagation, „Spiel um Platz 3", Endstand/Podium.
- **Nebenrunde** (Trostrunde) für die Verlierer der ersten KO-Runde –
  als Gruppe oder Mini-KO.
- **Öffentliche Read-only-Ansicht** + **Orga-Login** zum Verwalten.
- **Druck/PDF-Ansicht** je Disziplin (A4-quer).

## Tech-Stack

Nuxt 4 · Drizzle ORM · Neon Postgres · nuxt-auth-utils · Deployment auf Netlify.
Die Logik (Scoring, Auslosung, Tabellen) liegt rein in `server/utils` und ist
unit-getestet (`pnpm test`).

## Lokale Entwicklung

```bash
pnpm install
cp .env.example .env   # Werte eintragen (siehe unten)
pnpm db:migrate        # Schema in die DB schreiben
pnpm dev
```

Der Treiber wird anhand der `NUXT_DATABASE_URL` gewählt: `*.neon.tech` →
serverless HTTP-Treiber, sonst Standard-Postgres (z. B. lokal).

### Umgebungsvariablen

| Variable | Beschreibung |
| --- | --- |
| `NUXT_DATABASE_URL` | Neon-Connection-String (`?sslmode=require`) |
| `NUXT_ADMIN_PASSWORD` | Passwort für den Orga-Login |
| `NUXT_SESSION_PASSWORD` | ≥ 32 Zeichen, sichert das Session-Cookie |

## Deployment auf Netlify

1. Repository mit Netlify verbinden (Build-Befehl `pnpm build`, via `netlify.toml`).
2. In Netlify die drei Env-Variablen setzen (Neon-URL, Admin-Passwort, Session-Passwort).
3. Migrationen gegen die Neon-DB ausführen: lokal mit gesetzter `NUXT_DATABASE_URL`
   `pnpm db:migrate` (oder `pnpm db:push`).

## Tests

```bash
pnpm test                 # Unit-Tests (Scoring, KO-Draw, Gruppen, Tabellen)
node scripts/e2e.mjs      # End-to-End gegen einen laufenden Dev-Server
```

## Struktur

```
server/
  db/            Drizzle-Schema, Connection, Migrationen
  utils/         score.ts · drawKo.ts · drawGroup.ts · standings.ts
                 progression.ts (Persistenz/Propagation) · disciplineData.ts
  api/           REST-Endpunkte (Auth, CRUD, draw, consolation, matches)
app/
  components/    Tc*-Designsystem-Komponenten + Bracket/GroupTable/ScoreInput
  pages/         Öffentlich (/, /t/:id, /d/:did, /d/:did/print) + /admin/*
  assets/css/    Design-Tokens (TC Rot-Weiß Püttlingen)
```
