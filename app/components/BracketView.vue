<script setup lang="ts">
import type { EntryDto, MatchDto } from '~/types'

const props = defineProps<{
  matches: MatchDto[]
  entries: EntryDto[]
  stage?: 'MAIN' | 'CONSOLATION'
  editable?: boolean
}>()
const emit = defineEmits<{ enter: [match: MatchDto] }>()

const entryMap = computed(() => Object.fromEntries(props.entries.map((e) => [e.id, e])))
const stage = computed(() => props.stage ?? 'MAIN')

const mainMatches = computed(() => props.matches.filter((m) => m.stage === stage.value))
const thirdPlace = computed(() => props.matches.filter((m) => m.stage === 'THIRD_PLACE'))

const rounds = computed(() => {
  const map = new Map<number, MatchDto[]>()
  for (const m of mainMatches.value) {
    if (!map.has(m.round)) map.set(m.round, [])
    map.get(m.round)!.push(m)
  }
  return [...map.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([round, ms]) => ({ round, matches: ms.sort((a, b) => a.slot - b.slot) }))
})

function roundTitle(matches: MatchDto[]): string {
  return matches[0]?.label ?? `Runde`
}
</script>

<template>
  <div class="bracket">
    <div v-for="col in rounds" :key="col.round" class="bracket__round">
      <div class="bracket__round-title">{{ roundTitle(col.matches) }}</div>
      <MatchCard
        v-for="m in col.matches"
        :key="m.id"
        :match="m"
        :entry-map="entryMap"
        :editable="editable"
        @enter="emit('enter', $event)"
      />
    </div>

    <div v-if="thirdPlace.length && stage === 'MAIN'" class="bracket__round">
      <div class="bracket__round-title">Spiel um Platz 3</div>
      <MatchCard
        v-for="m in thirdPlace"
        :key="m.id"
        :match="m"
        :entry-map="entryMap"
        :editable="editable"
        @enter="emit('enter', $event)"
      />
    </div>
  </div>
</template>
