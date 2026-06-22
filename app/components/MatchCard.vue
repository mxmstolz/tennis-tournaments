<script setup lang="ts">
import type { EntryDto, MatchDto } from '~/types'
import { formatScore, formatDateTime } from '~/utils/tennis'

const props = defineProps<{
  match: MatchDto
  entryMap: Record<number, EntryDto>
  editable?: boolean
}>()
const emit = defineEmits<{ enter: [match: MatchDto] }>()

const e1 = computed(() => (props.match.entry1Id != null ? props.entryMap[props.match.entry1Id] : null))
const e2 = computed(() => (props.match.entry2Id != null ? props.entryMap[props.match.entry2Id] : null))
const isBye = computed(() => props.match.status === 'BYE')
const done = computed(() => props.match.status === 'DONE')
const scoreText = computed(() => formatScore(props.match.score))

function rowClass(entryId: number | null | undefined) {
  if (!done.value || entryId == null) return ''
  return props.match.winnerEntryId === entryId ? 'match__winner' : 'match__loser'
}
</script>

<template>
  <div
    class="match"
    :class="{ 'match--ready': match.status === 'READY', 'match--done': done }"
  >
    <div
      v-if="match.label"
      style="display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 4px 10px; background: var(--ink-50); border-bottom: 1px solid var(--border-soft)"
    >
      <span style="font-family: var(--font-display); font-size: 0.6875rem; font-weight: 700; letter-spacing: var(--tracking-wide); text-transform: uppercase; color: var(--text-faint)">{{ match.label }}</span>
      <span v-if="match.scheduledAt" style="font-size: 0.6875rem; color: var(--text-faint)">{{ formatDateTime(match.scheduledAt) }}</span>
    </div>

    <div class="match__row">
      <span class="match__name" :class="rowClass(match.entry1Id)">
        <span v-if="e1?.seed" class="seed-badge">{{ e1.seed }}</span>
        <span class="player">{{ e1?.name ?? '—' }}</span>
      </span>
      <span v-if="match.score" class="match__score">{{ scoreText.split(',').map(s => s.trim().split(':')[0]).join(' ') }}</span>
    </div>

    <div class="match__row">
      <span v-if="isBye" class="match__bye">Rast (Freilos)</span>
      <span v-else class="match__name" :class="rowClass(match.entry2Id)">
        <span v-if="e2?.seed" class="seed-badge">{{ e2.seed }}</span>
        <span class="player">{{ e2?.name ?? '—' }}</span>
      </span>
    </div>

    <div v-if="match.score" style="padding: 4px 10px; border-top: 1px solid var(--border-soft); text-align: right">
      <span class="match__score">{{ scoreText }}</span>
    </div>

    <div v-if="editable && !isBye" class="tc-no-print" style="padding: 6px 10px; border-top: 1px solid var(--border-soft)">
      <TcButton
        size="sm"
        :variant="done ? 'ghost' : 'secondary'"
        :disabled="match.status === 'PENDING'"
        @click="emit('enter', match)"
      >
        {{ done ? 'Ergebnis ändern' : 'Ergebnis eintragen' }}
      </TcButton>
    </div>
  </div>
</template>
