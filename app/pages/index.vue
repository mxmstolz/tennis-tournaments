<script setup lang="ts">
const { isAdmin } = useAuth()

interface TournamentRow {
  id: number
  name: string
  year: number
  disciplines: { id: number }[]
}

const { data: tournaments, refresh } = await useFetch<TournamentRow[]>('/api/tournaments')

const showForm = ref(false)
const form = reactive({ name: '', year: new Date().getFullYear() })
const saving = ref(false)
const error = ref('')

async function create() {
  error.value = ''
  saving.value = true
  try {
    const t = await $fetch('/api/tournaments', { method: 'POST', body: { name: form.name, year: Number(form.year) } })
    showForm.value = false
    form.name = ''
    await refresh()
    await navigateTo(`/t/${(t as { id: number }).id}`)
  } catch (e: unknown) {
    error.value = (e as { statusMessage?: string }).statusMessage || 'Fehler beim Speichern.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div>
    <div class="tc-page-head">
      <TcSectionHeading eyebrow="TC Rot-Weiß Püttlingen" title="Stadtmeisterschaften" intro="Turniere, Auslosungen und Ergebnisse auf einen Blick." />
      <TcButton v-if="isAdmin" @click="showForm = !showForm">Neues Turnier</TcButton>
    </div>

    <TcCard v-if="isAdmin && showForm" padded accent style="margin-bottom: var(--space-6)">
      <form class="tc-stack" @submit.prevent="create">
        <div class="tc-row-wrap" style="align-items: flex-end">
          <TcInput v-model="form.name" label="Name" placeholder="z. B. Stadtmeisterschaft" style="flex: 1; min-width: 200px" />
          <div style="width: 120px"><TcInput v-model="form.year" label="Jahr" type="number" /></div>
          <TcButton type="submit" :disabled="saving || !form.name">Anlegen</TcButton>
        </div>
        <p v-if="error" style="color: var(--danger); margin: 0">{{ error }}</p>
      </form>
    </TcCard>

    <div v-if="tournaments?.length" class="tc-grid" style="grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))">
      <TcCard v-for="t in tournaments" :key="t.id" :to="`/t/${t.id}`" accent>
        <TcBadge variant="soft" size="sm">{{ t.year }}</TcBadge>
        <h3 style="margin: var(--space-3) 0 var(--space-2)">{{ t.name }}</h3>
        <p class="tc-muted" style="margin: 0; font-size: var(--text-sm)">
          {{ t.disciplines.length }} {{ t.disciplines.length === 1 ? 'Disziplin' : 'Disziplinen' }}
        </p>
      </TcCard>
    </div>

    <TcCard v-else padded>
      <div class="tc-empty">
        <p>Noch keine Turniere angelegt.</p>
        <TcButton v-if="isAdmin" @click="showForm = true">Erstes Turnier anlegen</TcButton>
        <p v-else class="tc-faint" style="margin: 0">Melde dich als Orga an, um Turniere zu erstellen.</p>
      </div>
    </TcCard>
  </div>
</template>
