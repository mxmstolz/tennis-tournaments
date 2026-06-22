<script setup lang="ts">
const { isAdmin } = useAuth()
if (!isAdmin.value) await navigateTo('/admin/login')

interface Player { id: number; firstName: string; lastName: string; note: string | null }
const { data: players, refresh } = await useFetch<Player[]>('/api/players')

const form = reactive({ firstName: '', lastName: '' })
const busy = ref(false)
const error = ref('')

async function add() {
  error.value = ''
  if (!form.firstName || !form.lastName) return
  busy.value = true
  try {
    await $fetch('/api/players', { method: 'POST', body: { firstName: form.firstName, lastName: form.lastName } })
    form.firstName = ''
    form.lastName = ''
    await refresh()
  } catch (e: unknown) {
    error.value = (e as { statusMessage?: string }).statusMessage || 'Fehler.'
  } finally {
    busy.value = false
  }
}

async function remove(id: number) {
  if (!confirm('Person wirklich löschen?')) return
  await $fetch(`/api/players/${id}`, { method: 'DELETE' })
  await refresh()
}
</script>

<template>
  <div>
    <TcSectionHeading eyebrow="Orga" title="Personen" intro="Der gemeinsame Pool an Spielerinnen und Spielern für alle Disziplinen." />

    <TcCard padded accent style="margin: var(--space-6) 0">
      <form class="tc-row-wrap" style="align-items: flex-end" @submit.prevent="add">
        <TcInput v-model="form.firstName" label="Vorname" style="flex: 1; min-width: 160px" />
        <TcInput v-model="form.lastName" label="Nachname" style="flex: 1; min-width: 160px" />
        <TcButton type="submit" :disabled="busy || !form.firstName || !form.lastName">Hinzufügen</TcButton>
      </form>
      <p v-if="error" style="color: var(--danger); margin: var(--space-3) 0 0">{{ error }}</p>
    </TcCard>

    <TcCard v-if="players?.length" padded>
      <table class="tc-table">
        <thead><tr><th>Name</th><th style="width: 80px"></th></tr></thead>
        <tbody>
          <tr v-for="p in players" :key="p.id">
            <td>{{ p.firstName }} {{ p.lastName }}</td>
            <td><TcButton variant="ghost" size="sm" @click="remove(p.id)">Löschen</TcButton></td>
          </tr>
        </tbody>
      </table>
    </TcCard>
    <TcCard v-else padded><div class="tc-empty">Noch keine Personen erfasst.</div></TcCard>
  </div>
</template>
