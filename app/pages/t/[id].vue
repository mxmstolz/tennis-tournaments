<script setup lang="ts">
import { FORMAT_LABEL, KIND_LABEL, STATUS_LABEL } from '~/utils/tennis'

const route = useRoute()
const { isAdmin } = useAuth()
const id = Number(route.params.id)

interface TournamentDetail {
  id: number
  name: string
  year: number
  disciplines: {
    id: number
    name: string
    kind: 'SINGLES' | 'DOUBLES'
    format: 'KO' | 'GROUP'
    status: string
    entries: { id: number }[]
  }[]
}

const { data: tournament, refresh } = await useFetch<TournamentDetail>(`/api/tournaments/${id}`)

const showForm = ref(false)
const saving = ref(false)
const error = ref('')
const form = reactive({
  name: '',
  kind: 'SINGLES' as 'SINGLES' | 'DOUBLES',
  format: 'KO' as 'KO' | 'GROUP',
  thirdPlaceMatch: true,
  numGroups: 1,
})

async function create() {
  error.value = ''
  saving.value = true
  try {
    await $fetch('/api/disciplines', { method: 'POST', body: { tournamentId: id, ...form, numGroups: Number(form.numGroups) } })
    showForm.value = false
    form.name = ''
    await refresh()
  } catch (e: unknown) {
    error.value = (e as { statusMessage?: string }).statusMessage || 'Fehler beim Speichern.'
  } finally {
    saving.value = false
  }
}

async function removeDiscipline(disc: { id: number; name: string }) {
  if (!confirm(`Disziplin „${disc.name}" wirklich löschen? Alle Teilnehmer, Spiele und Ergebnisse gehen unwiderruflich verloren.`)) return
  try {
    await $fetch(`/api/disciplines/${disc.id}`, { method: 'DELETE' })
    await refresh()
  } catch (e: unknown) {
    error.value = (e as { statusMessage?: string }).statusMessage || 'Fehler beim Löschen.'
  }
}

const statusVariant: Record<string, 'neutral' | 'soft' | 'court' | 'clay'> = {
  SETUP: 'neutral',
  DRAWN: 'clay',
  RUNNING: 'soft',
  DONE: 'court',
}
</script>

<template>
  <div v-if="tournament">
    <div class="tc-page-head">
      <TcSectionHeading :eyebrow="`Turnier ${tournament.year}`" :title="tournament.name" intro="Disziplinen dieses Turniers." />
      <TcButton v-if="isAdmin" @click="showForm = !showForm">Neue Disziplin</TcButton>
    </div>

    <TcCard v-if="isAdmin && showForm" padded accent style="margin-bottom: var(--space-6)">
      <form class="tc-stack" @submit.prevent="create">
        <TcInput v-model="form.name" label="Bezeichnung" placeholder="z. B. Herren, Damen 30, Herren-Doppel" />
        <div class="tc-row-wrap" style="gap: var(--space-5)">
          <label class="tc-stack-sm">
            <span style="font-family: var(--font-display); font-weight: 600; font-size: var(--text-sm)">Art</span>
            <select v-model="form.kind" class="tc-select">
              <option value="SINGLES">Einzel</option>
              <option value="DOUBLES">Doppel</option>
            </select>
          </label>
          <label class="tc-stack-sm">
            <span style="font-family: var(--font-display); font-weight: 600; font-size: var(--text-sm)">Modus</span>
            <select v-model="form.format" class="tc-select">
              <option value="KO">KO-System</option>
              <option value="GROUP">Gruppe</option>
            </select>
          </label>
          <label v-if="form.format === 'GROUP'" class="tc-stack-sm">
            <span style="font-family: var(--font-display); font-weight: 600; font-size: var(--text-sm)">Gruppen</span>
            <input v-model.number="form.numGroups" type="number" min="1" max="16" class="tc-select" style="width: 80px" />
          </label>
        </div>
        <div v-if="form.format === 'KO'" class="tc-row-wrap" style="gap: var(--space-5)">
          <label class="tc-row" style="gap: 6px; cursor: pointer"><input v-model="form.thirdPlaceMatch" type="checkbox" /> Spiel um Platz 3</label>
        </div>
        <div class="tc-row">
          <TcButton type="submit" :disabled="saving || !form.name">Anlegen</TcButton>
          <TcButton variant="ghost" type="button" @click="showForm = false">Abbrechen</TcButton>
        </div>
        <p v-if="error" style="color: var(--danger); margin: 0">{{ error }}</p>
      </form>
    </TcCard>

    <div v-if="tournament.disciplines.length" class="tc-grid" style="grid-template-columns: repeat(auto-fill, minmax(300px, 1fr))">
      <TcCard v-for="disc in tournament.disciplines" :key="disc.id" :to="`/d/${disc.id}`">
        <div class="tc-spread" style="margin-bottom: var(--space-3)">
          <div class="tc-row" style="gap: 6px">
            <TcBadge size="sm" variant="neutral">{{ KIND_LABEL[disc.kind] }}</TcBadge>
            <TcBadge size="sm" variant="outline">{{ FORMAT_LABEL[disc.format] }}</TcBadge>
          </div>
          <TcBadge size="sm" :variant="statusVariant[disc.status]">{{ STATUS_LABEL[disc.status] }}</TcBadge>
        </div>
        <h3 style="margin: 0 0 var(--space-2)">{{ disc.name }}</h3>
        <div class="tc-spread">
          <span class="tc-muted" style="font-size: var(--text-sm)">{{ disc.entries.length }} Teilnehmer</span>
          <div v-if="isAdmin" class="tc-row tc-no-print" style="gap: var(--space-3)">
            <button type="button" style="border: none; background: none; cursor: pointer; font-size: var(--text-sm); font-weight: 600; color: var(--danger)" @click.stop.prevent="removeDiscipline(disc)">Löschen</button>
            <button type="button" style="border: none; background: none; cursor: pointer; font-size: var(--text-sm); font-weight: 600; color: var(--brand)" @click.stop.prevent="navigateTo(`/admin/d/${disc.id}`)">Verwalten →</button>
          </div>
        </div>
      </TcCard>
    </div>

    <TcCard v-else padded>
      <div class="tc-empty">
        <p>Noch keine Disziplinen.</p>
        <TcButton v-if="isAdmin" @click="showForm = true">Erste Disziplin anlegen</TcButton>
      </div>
    </TcCard>
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
