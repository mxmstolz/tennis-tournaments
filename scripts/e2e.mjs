// End-to-end Smoke-Test gegen den laufenden Dev-Server (localhost:3001)
const BASE = process.env.BASE || 'http://localhost:3001'
let cookie = ''

async function api(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  const setC = res.headers.get('set-cookie')
  if (setC) cookie = setC.split(';')[0]
  const text = await res.text()
  let data
  try { data = JSON.parse(text) } catch { data = text }
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${text}`)
  return data
}

function assert(cond, label) {
  if (!cond) throw new Error('ASSERT FAILED: ' + label)
  console.log('  ✓ ' + label)
}

async function main() {
  console.log('1) Login')
  await api('POST', '/api/auth/login', { password: 'test1234' })
  const sess = await api('GET', '/api/auth/session')
  assert(sess.admin === true, 'eingeloggt als Admin')

  console.log('2) Turnier + Disziplin (KO Einzel, mit Platz-3 + Nebenrunde)')
  const t = await api('POST', '/api/tournaments', { name: 'Stadtmeisterschaft', year: 2026 })
  const disc = await api('POST', '/api/disciplines', {
    tournamentId: t.id, name: 'Herren', kind: 'SINGLES', format: 'KO',
    thirdPlaceMatch: true, consolation: true,
  })

  console.log('3) 6 Personen + Teilnehmer (2 gesetzt) → 8er-Baum mit 2 Freilosen')
  const names = [['Joshua', 'Raubuch'], ['Moritz', 'Castor'], ['Maximilian', 'Stolz'], ['Pascal', 'Paul'], ['Dennis', 'Schroeder'], ['Rudi', 'Sapich']]
  const entryIds = []
  for (let i = 0; i < names.length; i++) {
    const p = await api('POST', '/api/players', { firstName: names[i][0], lastName: names[i][1] })
    const e = await api('POST', `/api/disciplines/${disc.id}/entries`, { player1Id: p.id, seed: i < 2 ? i + 1 : null })
    entryIds.push(e.id)
  }

  console.log('4) Auslosen')
  await api('POST', `/api/disciplines/${disc.id}/draw`, {})
  let dd = await api('GET', `/api/disciplines/${disc.id}`)
  const r1 = dd.matches.filter((m) => m.stage === 'MAIN' && m.round === 1)
  assert(r1.length === 4, 'erste Runde hat 4 Spiele (8er-Baum)')
  const byes = r1.filter((m) => m.status === 'BYE')
  assert(byes.length === 2, '2 Freilose')
  const seed1 = dd.entries.find((e) => e.seed === 1)
  const seed1Match = r1.find((m) => m.entry1Id === seed1.id || m.entry2Id === seed1.id)
  assert(seed1Match.status === 'BYE', 'Setzling 1 hat Freilos')

  console.log('5) Erste Runde: echte Spiele eintragen')
  const realR1 = r1.filter((m) => m.status === 'READY')
  for (const m of realR1) {
    await api('PATCH', `/api/matches/${m.id}`, { score: { sets: [{ p1: 6, p2: 3 }, { p1: 6, p2: 4 }] } })
  }
  dd = await api('GET', `/api/disciplines/${disc.id}`)
  const semis = dd.matches.filter((m) => m.stage === 'MAIN' && m.round === 2)
  assert(semis.every((m) => m.entry1Id && m.entry2Id), 'Halbfinals durch Propagation befüllt')

  console.log('6) Match-Tiebreak im Halbfinale')
  await api('PATCH', `/api/matches/${semis[0].id}`, { score: { sets: [{ p1: 6, p2: 4 }, { p1: 4, p2: 6 }, { p1: 10, p2: 8 }] } })
  await api('PATCH', `/api/matches/${semis[1].id}`, { score: { sets: [{ p1: 6, p2: 2 }, { p1: 6, p2: 2 }] } })
  dd = await api('GET', `/api/disciplines/${disc.id}`)
  const final = dd.matches.find((m) => m.stage === 'MAIN' && m.round === 3)
  assert(final.entry1Id && final.entry2Id, 'Finale befüllt')
  const third = dd.matches.find((m) => m.stage === 'THIRD_PLACE')
  assert(third.entry1Id && third.entry2Id, 'Spiel um Platz 3 mit beiden Verlierern befüllt')

  console.log('7) Finale + Spiel um Platz 3')
  await api('PATCH', `/api/matches/${final.id}`, { score: { sets: [{ p1: 7, p2: 6 }, { p1: 6, p2: 4 }] } })
  await api('PATCH', `/api/matches/${third.id}`, { score: { sets: [{ p1: 6, p2: 1 }, { p1: 6, p2: 1 }] } })
  dd = await api('GET', `/api/disciplines/${disc.id}`)
  assert(dd.discipline.status === 'DONE', 'Disziplin abgeschlossen')

  console.log('8) Ungültiges Ergebnis wird abgelehnt')
  let rejected = false
  try {
    await api('PATCH', `/api/matches/${final.id}`, { score: { sets: [{ p1: 6, p2: 5 }, { p1: 6, p2: 4 }] } })
  } catch { rejected = true }
  assert(rejected, '6:5 wird als ungültiger Satz abgelehnt')

  console.log('9) Re-Test: Gruppenmodus + Tabelle')
  const gdisc = await api('POST', '/api/disciplines', { tournamentId: t.id, name: 'Damen 30', format: 'GROUP', numGroups: 1 })
  const gIds = []
  for (const [fn, ln] of [['Julia', 'B'], ['Jolina', 'T'], ['Yvonne', 'K'], ['Lena', 'L']]) {
    const p = await api('POST', '/api/players', { firstName: fn, lastName: ln })
    const e = await api('POST', `/api/disciplines/${gdisc.id}/entries`, { player1Id: p.id })
    gIds.push(e.id)
  }
  await api('POST', `/api/disciplines/${gdisc.id}/draw`, {})
  let gd = await api('GET', `/api/disciplines/${gdisc.id}`)
  const gMatches = gd.matches.filter((m) => m.stage === 'GROUP')
  assert(gMatches.length === 6, 'Round-Robin: 6 Spiele bei 4 Teilnehmern')
  for (const m of gMatches) {
    await api('PATCH', `/api/matches/${m.id}`, { score: { sets: [{ p1: 6, p2: 0 }, { p1: 6, p2: 0 }] } })
  }
  gd = await api('GET', `/api/disciplines/${gdisc.id}`)
  const table = gd.standings['1']
  assert(table && table.length === 4, 'Tabelle mit 4 Zeilen')
  assert(table[0].rank === 1 && table[0].played === 3, 'Tabellenführer hat 3 Spiele')

  console.log('\n✅ ALLE E2E-CHECKS BESTANDEN')
}

main().catch((e) => { console.error('\n❌', e.message); process.exit(1) })
