<script setup lang="ts">
import type { EntryDto, MatchDto, StandingRow } from '~/types'
import { formatScore, formatDateTime } from '~/utils/tennis'

const props = defineProps<{
  title: string
  rows: StandingRow[]
  matches: MatchDto[]
  entries: EntryDto[]
  editable?: boolean
  qualifyCount?: number
}>()
const emit = defineEmits<{ enter: [match: MatchDto] }>()

const entryMap = computed(() => Object.fromEntries(props.entries.map((e) => [e.id, e])))
const name = (id: number | null) => (id != null ? entryMap.value[id]?.name ?? '—' : '—')
const sortedMatches = computed(() => [...props.matches].sort((a, b) => a.round - b.round || a.slot - b.slot))
</script>

<template>
  <TcCard padded accent>
    <h3 style="margin: 0 0 var(--space-4)">{{ title }}</h3>

    <table class="tc-table">
      <thead>
        <tr>
          <th class="num">#</th>
          <th>Teilnehmer</th>
          <th class="num" title="Spiele">Sp</th>
          <th class="num" title="Siege–Niederlagen">S–N</th>
          <th class="num" title="Sätze">Sätze</th>
          <th class="num" title="Spiele (Games)">Games</th>
          <th class="num">Punkte</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="row in rows"
          :key="row.entryId"
          :class="{ qualified: qualifyCount != null && row.rank <= qualifyCount }"
        >
          <td class="num rank">{{ row.rank }}</td>
          <td>{{ name(row.entryId) }}</td>
          <td class="num">{{ row.played }}</td>
          <td class="num">{{ row.won }}–{{ row.lost }}</td>
          <td class="num">{{ row.setsFor }}:{{ row.setsAgainst }}</td>
          <td class="num">{{ row.gamesFor }}:{{ row.gamesAgainst }}</td>
          <td class="num" style="font-family: var(--font-display); font-weight: 700; color: var(--text-strong)">{{ row.points }}</td>
        </tr>
      </tbody>
    </table>

    <div style="margin-top: var(--space-5)" class="tc-stack-sm">
      <span class="tc-eyebrow" style="color: var(--text-muted)">Spiele</span>
      <div
        v-for="m in sortedMatches"
        :key="m.id"
        class="tc-spread"
        style="padding: var(--space-2) 0; border-bottom: 1px solid var(--border-soft)"
      >
        <div style="min-width: 0">
          <div style="font-size: var(--text-sm)">
            <span :style="{ fontWeight: m.winnerEntryId === m.entry1Id ? 700 : 400 }">{{ name(m.entry1Id) }}</span>
            <span class="tc-faint"> vs </span>
            <span :style="{ fontWeight: m.winnerEntryId === m.entry2Id ? 700 : 400 }">{{ name(m.entry2Id) }}</span>
          </div>
          <span v-if="m.scheduledAt" class="tc-faint" style="font-size: var(--text-xs)">{{ formatDateTime(m.scheduledAt) }}</span>
        </div>
        <div class="tc-row" style="gap: var(--space-3)">
          <span v-if="m.score" class="match__score">{{ formatScore(m.score) }}</span>
          <span v-else class="tc-faint" style="font-size: var(--text-xs)">offen</span>
          <TcButton
            v-if="editable"
            size="sm"
            :variant="m.status === 'DONE' ? 'ghost' : 'secondary'"
            class="tc-no-print"
            @click="emit('enter', m)"
          >{{ m.status === 'DONE' ? 'Ändern' : 'Eintragen' }}</TcButton>
        </div>
      </div>
    </div>
  </TcCard>
</template>
