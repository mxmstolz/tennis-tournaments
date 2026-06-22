<script setup lang="ts">
import type { DisciplineData } from '~/types'
import { FORMAT_LABEL, KIND_LABEL } from '~/utils/tennis'

definePageMeta({ layout: false })

const route = useRoute()
const did = Number(route.params.did)
const { data } = await useFetch<DisciplineData>(`/api/disciplines/${did}`)
const d = computed(() => data.value?.discipline)

function doPrint() {
  if (import.meta.client) window.print()
}
</script>

<template>
  <div v-if="data && d" style="padding: var(--space-6); max-width: var(--container-max); margin: 0 auto">
    <div class="tc-spread" style="margin-bottom: var(--space-5)">
      <div class="tc-row" style="gap: var(--space-3)">
        <img src="/assets/logo-crest.png" alt="" style="height: 56px" />
        <div>
          <div class="tc-eyebrow">{{ d.tournamentName }} {{ d.tournamentYear }}</div>
          <h1 style="margin: 4px 0 0">{{ d.name }}</h1>
          <span class="tc-muted" style="font-size: var(--text-sm)">{{ KIND_LABEL[d.kind] }} · {{ FORMAT_LABEL[d.format] }}</span>
        </div>
      </div>
      <TcButton class="tc-no-print" variant="secondary" size="sm" @click="doPrint">Drucken / PDF</TcButton>
    </div>

    <DisciplineView :data="data" />
  </div>
</template>
