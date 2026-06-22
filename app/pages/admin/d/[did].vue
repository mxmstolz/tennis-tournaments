<script setup lang="ts">
import type { DisciplineData, EntryDto, MatchDto } from '~/types'
import type { MatchScore } from '~/utils/tennis'
import { FORMAT_LABEL, KIND_LABEL, STATUS_LABEL } from '~/utils/tennis'

const route = useRoute()
const { isAdmin } = useAuth()
if (!isAdmin.value) await navigateTo('/admin/login')
const did = Number(route.params.did)

interface Player { id: number; firstName: string; lastName: string }

const { data, refresh } = await useFetch<DisciplineData>(`/api/disciplines/${did}`)
const { data: players } = await useFetch<Player[]>('/api/players')
const d = computed(() => data.value?.discipline)
const isSetup = computed(() => d.value?.status === 'SETUP')
const entryMap = computed(() => Object.fromEntries((data.value?.entries ?? []).map((e) => [e.id, e])))

const msg = ref('')
const err = ref('')

function flash(m: string) {
  msg.value = m
  err.value = ''
  setTimeout(() => (msg.value = ''), 2500)
}
function fail(e: unknown) {
  err.value = (e as { statusMessage?: string }).statusMessage || 'Fehler.'
}

// ---- Teilnehmer hinzufügen ----
const newEntry = reactive({ player1Id: null as number | null, player2Id: null as number | null, displayName: '' })
async function addEntry() {
  err.value = ''
  try {
    await $fetch(`/api/disciplines/${did}/entries`, {
      method: 'POST',
      body: {
        player1Id: newEntry.player1Id,
        player2Id: d.value?.kind === 'DOUBLES' ? newEntry.player2Id : null,
        displayName: newEntry.displayName || null,
      },
    })
    newEntry.player1Id = null
    newEntry.player2Id = null
    newEntry.displayName = ''
    await refresh()
  } catch (e) {
    fail(e)
  }
}
async function removeEntry(id: number) {
  await $fetch(`/api/entries/${id}`, { method: 'DELETE' })
  await refresh()
}
async function setSeed(e: EntryDto, value: string) {
  const seed = value ? Number(value) : null
  await $fetch(`/api/entries/${e.id}`, { method: 'PATCH', body: { seed } })
  await refresh()
}

// ---- Auslosen ----
const drawing = ref(false)
async function draw() {
  if (!isSetup.value && !confirm('Neu auslosen? Bestehende Spiele und Ergebnisse gehen verloren.')) return
  drawing.value = true
  err.value = ''
  try {
    await $fetch(`/api/disciplines/${did}/draw`, { method: 'POST' })
    await refresh()
    flash('Auslosung erstellt.')
  } catch (e) {
    fail(e)
  } finally {
    drawing.value = false
  }
}

// ---- Nebenrunde ----
async function makeConsolation() {
  err.value = ''
  try {
    const res = await $fetch<{ format: string; participants: number }>(`/api/disciplines/${did}/consolation`, { method: 'POST' })
    await refresh()
    flash(`Nebenrunde (${res.format}) mit ${res.participants} Teilnehmern erstellt.`)
  } catch (e) {
    fail(e)
  }
}

// ---- Ergebnis ----
const editMatch = ref<MatchDto | null>(null)
async function saveScore(score: MatchScore) {
  if (!editMatch.value) return
  try {
    await $fetch(`/api/matches/${editMatch.value.id}`, { method: 'PATCH', body: { score } })
    editMatch.value = null
    await refresh()
    flash('Ergebnis gespeichert.')
  } catch (e) {
    fail(e)
  }
}
async function clearScore() {
  if (!editMatch.value) return
  await $fetch(`/api/matches/${editMatch.value.id}`, { method: 'PATCH', body: { clear: true } })
  editMatch.value = null
  await refresh()
}

const firstRoundDone = computed(() => {
  const r1 = (data.value?.matches ?? []).filter((m) => m.stage === 'MAIN' && m.round === 1)
  return r1.length > 0 && r1.every((m) => m.status === 'DONE' || m.status === 'BYE')
})
</script>

<template>
  <div v-if="data && d">
    <div class="tc-page-head">
      <div>
        <NuxtLink :to="`/t/${d.tournamentId}`" class="tc-muted" style="font-size: var(--text-sm)">← {{ d.tournamentName }} {{ d.tournamentYear }}</NuxtLink>
        <h1 style="margin: var(--space-2) 0 var(--space-3)">{{ d.name }}</h1>
        <div class="tc-row" style="gap: 6px">
          <TcBadge size="sm" variant="neutral">{{ KIND_LABEL[d.kind] }}</TcBadge>
          <TcBadge size="sm" variant="outline">{{ FORMAT_LABEL[d.format] }}</TcBadge>
          <TcBadge size="sm" variant="soft">{{ STATUS_LABEL[d.status] }}</TcBadge>
          <TcBadge size="sm" variant="court">Verwaltung</TcBadge>
        </div>
      </div>
      <div class="tc-row">
        <TcButton variant="secondary" size="sm" :to="`/d/${did}/print`">Druckansicht</TcButton>
        <!-- Erst-Auslosung prominent, erneutes Auslosen dezent (destruktiv) -->
        <TcButton v-if="isSetup" :disabled="drawing || data.entries.length < 2" @click="draw">
          Auslosen
        </TcButton>
        <TcButton v-else variant="ghost" size="sm" :disabled="drawing || data.entries.length < 2" @click="draw">
          Neu auslosen
        </TcButton>
      </div>
    </div>

    <p v-if="msg" style="color: var(--court-700); background: var(--court-100); padding: var(--space-3); border-radius: var(--radius-md)">{{ msg }}</p>
    <p v-if="err" style="color: var(--danger); background: var(--red-50); padding: var(--space-3); border-radius: var(--radius-md)">{{ err }}</p>

    <!-- Teilnehmer-Verwaltung (immer sichtbar, Hinzufügen nur im SETUP) -->
    <TcCard padded accent style="margin-bottom: var(--space-6)">
      <h3 style="margin: 0 0 var(--space-4)">Teilnehmer ({{ data.entries.length }})</h3>

      <form v-if="isSetup" class="tc-row-wrap" style="align-items: flex-end; margin-bottom: var(--space-5)" @submit.prevent="addEntry">
        <label class="tc-stack-sm">
          <span style="font-family: var(--font-display); font-weight: 600; font-size: var(--text-sm)">{{ d.kind === 'DOUBLES' ? 'Spieler 1' : 'Person' }}</span>
          <select v-model.number="newEntry.player1Id" class="tc-select" style="min-width: 180px">
            <option :value="null">– wählen –</option>
            <option v-for="p in players" :key="p.id" :value="p.id">{{ p.firstName }} {{ p.lastName }}</option>
          </select>
        </label>
        <label v-if="d.kind === 'DOUBLES'" class="tc-stack-sm">
          <span style="font-family: var(--font-display); font-weight: 600; font-size: var(--text-sm)">Spieler 2</span>
          <select v-model.number="newEntry.player2Id" class="tc-select" style="min-width: 180px">
            <option :value="null">– wählen –</option>
            <option v-for="p in players" :key="p.id" :value="p.id">{{ p.firstName }} {{ p.lastName }}</option>
          </select>
        </label>
        <TcButton type="submit" :disabled="!newEntry.player1Id">Hinzufügen</TcButton>
        <NuxtLink to="/admin/players" style="font-size: var(--text-sm); font-weight: 600">+ Neue Person anlegen</NuxtLink>
      </form>

      <table v-if="data.entries.length" class="tc-table">
        <thead>
          <tr>
            <th v-if="d.format === 'KO'" style="width: 110px">Setzung</th>
            <th>Teilnehmer</th>
            <th v-if="!isSetup && d.format === 'GROUP'" class="num">Gruppe</th>
            <th v-if="isSetup" style="width: 80px"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="e in data.entries" :key="e.id">
            <td v-if="d.format === 'KO'">
              <input
                v-if="isSetup"
                type="number" min="1" :value="e.seed ?? ''" class="tc-select" style="width: 70px; padding: 6px"
                placeholder="–"
                @change="setSeed(e, ($event.target as HTMLInputElement).value)"
              />
              <span v-else-if="e.seed" class="seed-badge">{{ e.seed }}</span>
              <span v-else class="tc-faint">–</span>
            </td>
            <td>{{ e.name }}</td>
            <td v-if="!isSetup && d.format === 'GROUP'" class="num">{{ e.groupNo ?? '–' }}</td>
            <td v-if="isSetup"><TcButton variant="ghost" size="sm" @click="removeEntry(e.id)">Entfernen</TcButton></td>
          </tr>
        </tbody>
      </table>
      <div v-else class="tc-empty" style="padding: var(--space-5)">Noch keine Teilnehmer. Personen hinzufügen, dann auslosen.</div>

      <p v-if="isSetup && d.format === 'KO'" class="tc-faint" style="font-size: var(--text-xs); margin: var(--space-3) 0 0">
        Setzung optional: Setzlinge (1, 2, 3 …) werden im Baum gesetzt platziert, Freilose erhalten die Topgesetzten.
      </p>
    </TcCard>

    <!-- Spielbetrieb -->
    <template v-if="!isSetup">
      <div v-if="d.format === 'KO' && d.consolation && firstRoundDone && !data.matches.some(m => m.stage === 'CONSOLATION')" style="margin-bottom: var(--space-5)">
        <TcButton variant="secondary" @click="makeConsolation">Nebenrunde erzeugen (Verlierer 1. Runde)</TcButton>
      </div>

      <DisciplineView :data="data" editable @enter="editMatch = $event" />
    </template>

    <ScoreInput
      v-if="editMatch"
      :match="editMatch"
      :entry-map="entryMap"
      @save="saveScore"
      @clear="clearScore"
      @close="editMatch = null"
    />
  </div>
</template>

<style scoped>
.tc-select {
  font-family: var(--font-body);
  font-size: var(--text-base);
  padding: 10px 14px;
  border-radius: var(--radius-md);
  border: 2px solid var(--border-default);
  background: var(--white);
  outline: none;
}
.tc-select:focus { border-color: var(--brand); }
</style>
