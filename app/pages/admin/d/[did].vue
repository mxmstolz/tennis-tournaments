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
// Haupt-Teilnehmer vs. Nebenrunden-Teilnehmer (Platzhalter/Personen) trennen
const mainEntries = computed(() => (data.value?.entries ?? []).filter((e) => !e.isConsolation))
const consoEntries = computed(() => (data.value?.entries ?? []).filter((e) => e.isConsolation))
const hasConsolationMatches = computed(() =>
  (data.value?.matches ?? []).some((m) => ['CONSOLATION', 'FINAL', 'THIRD_PLACE'].includes(m.stage)),
)
// Finalrunde nur bei Gruppenturnier mit genau 2 Gruppen
const finalsEligible = computed(() => d.value?.format === 'GROUP' && d.value?.numGroups === 2)

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

// ---- Nebenrunde (manuell) ----
const consoFormat = ref<'KO' | 'GROUP' | 'FINALS'>('KO')
watchEffect(() => {
  if (d.value?.consolationFormat) consoFormat.value = d.value.consolationFormat
})

// Platzhalter oder Person zur Nebenrunde hinzufügen
const consoNew = reactive({ displayName: '', player1Id: null as number | null, player2Id: null as number | null })
async function addConsoEntry() {
  err.value = ''
  const isPlaceholder = !!consoNew.displayName.trim()
  try {
    await $fetch(`/api/disciplines/${did}/entries`, {
      method: 'POST',
      body: {
        isConsolation: true,
        displayName: isPlaceholder ? consoNew.displayName.trim() : null,
        player1Id: isPlaceholder ? null : consoNew.player1Id,
        player2Id: isPlaceholder || d.value?.kind !== 'DOUBLES' ? null : consoNew.player2Id,
      },
    })
    consoNew.displayName = ''
    consoNew.player1Id = null
    consoNew.player2Id = null
    await refresh()
  } catch (e) {
    fail(e)
  }
}

// Platzhalter durch eine Person ersetzen (Name wird ersetzt)
const assignFor = ref<number | null>(null)
const assignForm = reactive({ player1Id: null as number | null, player2Id: null as number | null })
function startAssign(e: EntryDto) {
  assignFor.value = e.id
  assignForm.player1Id = e.player1Id
  assignForm.player2Id = e.player2Id
}
async function confirmAssign(e: EntryDto) {
  err.value = ''
  try {
    await $fetch(`/api/entries/${e.id}`, {
      method: 'PATCH',
      body: {
        player1Id: assignForm.player1Id,
        player2Id: d.value?.kind === 'DOUBLES' ? assignForm.player2Id : null,
        displayName: null,
      },
    })
    assignFor.value = null
    await refresh()
    flash('Person zugewiesen.')
  } catch (e) {
    fail(e)
  }
}

async function deleteConsolation() {
  if (!confirm('Nebenrunde komplett löschen? Alle Nebenrunden-Teilnehmer, -Spiele und -Ergebnisse gehen verloren.')) return
  err.value = ''
  try {
    await $fetch(`/api/disciplines/${did}/consolation`, { method: 'DELETE' })
    await refresh()
    flash('Nebenrunde gelöscht.')
  } catch (e) {
    fail(e)
  }
}

async function buildConsolation() {
  if (hasConsolationMatches.value && !confirm('Nebenrunde neu erstellen? Bestehende Nebenrunden-Spiele und -Ergebnisse gehen verloren.')) return
  err.value = ''
  try {
    const res = await $fetch<{ format: string; participants: number }>(`/api/disciplines/${did}/consolation`, {
      method: 'POST',
      body: { format: consoFormat.value },
    })
    await refresh()
    flash(`Nebenrunde (${res.format}) mit ${res.participants} Teilnehmern erstellt.`)
  } catch (e) {
    fail(e)
  }
}

// ---- Ergebnis ----
const editMatch = ref<MatchDto | null>(null)
async function saveScore(payload: { score: MatchScore | null }) {
  if (!editMatch.value) return
  try {
    await $fetch(`/api/matches/${editMatch.value.id}`, { method: 'PATCH', body: payload })
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

// ---- Termin ----
const scheduleMatch = ref<MatchDto | null>(null)
async function saveSchedule(payload: { scheduledAt: string | null }) {
  if (!scheduleMatch.value) return
  try {
    await $fetch(`/api/matches/${scheduleMatch.value.id}`, { method: 'PATCH', body: payload })
    scheduleMatch.value = null
    await refresh()
    flash('Termin gespeichert.')
  } catch (e) {
    fail(e)
  }
}

// ---- Disziplin löschen ----
async function removeDiscipline() {
  if (!d.value) return
  if (!confirm(`Disziplin „${d.value.name}" wirklich löschen? Alle Teilnehmer, Spiele und Ergebnisse gehen unwiderruflich verloren.`)) return
  try {
    await $fetch(`/api/disciplines/${did}`, { method: 'DELETE' })
    await navigateTo(`/t/${d.value.tournamentId}`)
  } catch (e) {
    fail(e)
  }
}
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
        <TcButton variant="ghost" size="sm" @click="removeDiscipline">Disziplin löschen</TcButton>
      </div>
    </div>

    <p v-if="msg" style="color: var(--court-700); background: var(--court-100); padding: var(--space-3); border-radius: var(--radius-md)">{{ msg }}</p>
    <p v-if="err" style="color: var(--danger); background: var(--red-50); padding: var(--space-3); border-radius: var(--radius-md)">{{ err }}</p>

    <!-- Teilnehmer-Verwaltung (immer sichtbar, Hinzufügen nur im SETUP) -->
    <TcCard padded accent style="margin-bottom: var(--space-6)">
      <h3 style="margin: 0 0 var(--space-4)">Teilnehmer ({{ mainEntries.length }})</h3>

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

      <table v-if="mainEntries.length" class="tc-table">
        <thead>
          <tr>
            <th v-if="d.format === 'KO'" style="width: 110px">Setzung</th>
            <th>Teilnehmer</th>
            <th v-if="!isSetup && d.format === 'GROUP'" class="num">Gruppe</th>
            <th v-if="isSetup" style="width: 80px"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="e in mainEntries" :key="e.id">
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
      <DisciplineView :data="data" editable @enter="editMatch = $event" @schedule="scheduleMatch = $event" />

      <!-- Nebenrunde (manuell, mit Platzhaltern) -->
      <TcCard padded accent style="margin-top: var(--space-6)">
        <h3 style="margin: 0 0 var(--space-2)">Nebenrunde</h3>
        <p v-if="consoFormat === 'FINALS'" class="tc-faint" style="font-size: var(--text-sm); margin: 0 0 var(--space-4)">
          Finalrunde aus den Gruppen: beide Gruppensieger spielen das Finale, die Gruppenzweiten um Platz 3.
          Nach dem Erstellen pro Position über „Person zuweisen" die feststehende Person eintragen.
        </p>
        <p v-else class="tc-faint" style="font-size: var(--text-sm); margin: 0 0 var(--space-4)">
          Platzhalter (z. B. „Verlierer Spiel 1") oder Personen anlegen, Format wählen und Plan erstellen.
          Platzhalter können später per „Person zuweisen" durch eine Person ersetzt werden.
        </p>

        <!-- Hinzufügen (nicht bei Finalrunde – Teilnehmer ergeben sich aus den Gruppen) -->
        <form v-if="consoFormat !== 'FINALS'" class="tc-row-wrap" style="align-items: flex-end; margin-bottom: var(--space-5)" @submit.prevent="addConsoEntry">
          <label class="tc-stack-sm">
            <span style="font-family: var(--font-display); font-weight: 600; font-size: var(--text-sm)">Platzhalter</span>
            <input v-model="consoNew.displayName" class="tc-select" style="min-width: 200px" placeholder="z. B. Verlierer Spiel 1" />
          </label>
          <span class="tc-faint" style="padding-bottom: 12px">oder Person:</span>
          <label class="tc-stack-sm">
            <span style="font-family: var(--font-display); font-weight: 600; font-size: var(--text-sm)">{{ d.kind === 'DOUBLES' ? 'Spieler 1' : 'Person' }}</span>
            <select v-model.number="consoNew.player1Id" :disabled="!!consoNew.displayName.trim()" class="tc-select" style="min-width: 180px">
              <option :value="null">– wählen –</option>
              <option v-for="p in players" :key="p.id" :value="p.id">{{ p.firstName }} {{ p.lastName }}</option>
            </select>
          </label>
          <label v-if="d.kind === 'DOUBLES'" class="tc-stack-sm">
            <span style="font-family: var(--font-display); font-weight: 600; font-size: var(--text-sm)">Spieler 2</span>
            <select v-model.number="consoNew.player2Id" :disabled="!!consoNew.displayName.trim()" class="tc-select" style="min-width: 180px">
              <option :value="null">– wählen –</option>
              <option v-for="p in players" :key="p.id" :value="p.id">{{ p.firstName }} {{ p.lastName }}</option>
            </select>
          </label>
          <TcButton type="submit" :disabled="!consoNew.displayName.trim() && !consoNew.player1Id">Hinzufügen</TcButton>
        </form>

        <!-- Teilnehmer der Nebenrunde -->
        <table v-if="consoEntries.length" class="tc-table">
          <thead>
            <tr>
              <th v-if="consoFormat === 'KO'" style="width: 110px">Setzung</th>
              <th>Teilnehmer</th>
              <th style="width: 360px"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="e in consoEntries" :key="e.id">
              <td v-if="consoFormat === 'KO'">
                <input
                  type="number" min="1" :value="e.seed ?? ''" class="tc-select" style="width: 70px; padding: 6px"
                  placeholder="–"
                  @change="setSeed(e, ($event.target as HTMLInputElement).value)"
                />
              </td>
              <td>
                {{ e.name }}
                <TcBadge v-if="!e.player1Id" size="sm" variant="outline" style="margin-left: 6px">Platzhalter</TcBadge>
              </td>
              <td>
                <template v-if="assignFor === e.id">
                  <div class="tc-row-wrap" style="align-items: center; gap: 6px">
                    <select v-model.number="assignForm.player1Id" class="tc-select" style="min-width: 150px; padding: 6px">
                      <option :value="null">– wählen –</option>
                      <option v-for="p in players" :key="p.id" :value="p.id">{{ p.firstName }} {{ p.lastName }}</option>
                    </select>
                    <select v-if="d.kind === 'DOUBLES'" v-model.number="assignForm.player2Id" class="tc-select" style="min-width: 150px; padding: 6px">
                      <option :value="null">– wählen –</option>
                      <option v-for="p in players" :key="p.id" :value="p.id">{{ p.firstName }} {{ p.lastName }}</option>
                    </select>
                    <TcButton size="sm" :disabled="!assignForm.player1Id" @click="confirmAssign(e)">Übernehmen</TcButton>
                    <TcButton variant="ghost" size="sm" @click="assignFor = null">Abbrechen</TcButton>
                  </div>
                </template>
                <template v-else>
                  <TcButton variant="secondary" size="sm" @click="startAssign(e)">Person zuweisen</TcButton>
                  <TcButton variant="ghost" size="sm" @click="removeEntry(e.id)">Entfernen</TcButton>
                </template>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-else class="tc-empty" style="padding: var(--space-5)">Noch keine Nebenrunden-Teilnehmer.</div>

        <!-- Plan erstellen -->
        <div class="tc-row-wrap" style="align-items: flex-end; margin-top: var(--space-5)">
          <label class="tc-stack-sm">
            <span style="font-family: var(--font-display); font-weight: 600; font-size: var(--text-sm)">Format</span>
            <select v-model="consoFormat" class="tc-select" style="min-width: 140px">
              <option value="KO">KO-Baum</option>
              <option value="GROUP">Gruppe</option>
              <option v-if="finalsEligible" value="FINALS">Finalrunde (Gruppensieger)</option>
            </select>
          </label>
          <TcButton :disabled="consoFormat === 'FINALS' ? !finalsEligible : consoEntries.length < 2" @click="buildConsolation">
            {{ hasConsolationMatches ? 'Nebenrunde neu erstellen' : 'Nebenrunde erstellen' }}
          </TcButton>
          <TcButton v-if="hasConsolationMatches || consoEntries.length" variant="ghost" @click="deleteConsolation">
            Nebenrunde löschen
          </TcButton>
        </div>
      </TcCard>
    </template>

    <ScoreInput
      v-if="editMatch"
      :match="editMatch"
      :entry-map="entryMap"
      @save="saveScore"
      @clear="clearScore"
      @close="editMatch = null"
    />

    <ScheduleInput
      v-if="scheduleMatch"
      :match="scheduleMatch"
      :entry-map="entryMap"
      @save="saveSchedule"
      @close="scheduleMatch = null"
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
