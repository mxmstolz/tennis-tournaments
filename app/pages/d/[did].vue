<script setup lang="ts">
import type { DisciplineData } from '~/types'
import { FORMAT_LABEL, KIND_LABEL, STATUS_LABEL } from '~/utils/tennis'

const route = useRoute()
const { isAdmin } = useAuth()
const did = Number(route.params.did)

// Als Admin immer direkt in die Verwaltungsansicht.
if (isAdmin.value) {
  await navigateTo(`/admin/d/${did}`, { replace: true })
}

const { data } = await useFetch<DisciplineData>(`/api/disciplines/${did}`)
const d = computed(() => data.value?.discipline)
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
        </div>
      </div>
      <div class="tc-row tc-no-print">
        <TcButton variant="secondary" size="sm" :to="`/d/${did}/print`">Druckansicht</TcButton>
        <TcButton v-if="isAdmin" size="sm" :to="`/admin/d/${did}`">Verwalten</TcButton>
      </div>
    </div>

    <template v-if="d.status === 'SETUP'">
      <TcCard padded>
        <TcSectionHeading eyebrow="Vorbereitung" title="Auslosung steht noch aus" intro="Die Teilnehmer werden erfasst. Sobald ausgelost wurde, erscheinen hier Baum bzw. Gruppen." />
        <div v-if="data.entries.length" class="tc-grid" style="grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); margin-top: var(--space-5)">
          <div v-for="e in data.entries" :key="e.id" class="tc-row" style="gap: 8px; padding: var(--space-2) 0">
            <span v-if="e.seed" class="seed-badge">{{ e.seed }}</span>
            <span>{{ e.name }}</span>
          </div>
        </div>
      </TcCard>
    </template>

    <DisciplineView v-else :data="data" />
  </div>
</template>
