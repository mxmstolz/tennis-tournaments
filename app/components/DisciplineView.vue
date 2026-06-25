<script setup lang="ts">
import type { DisciplineData, MatchDto } from '~/types'

const props = defineProps<{ data: DisciplineData; editable?: boolean }>()
const emit = defineEmits<{ enter: [match: MatchDto]; schedule: [match: MatchDto] }>()

const d = computed(() => props.data.discipline)
const entryMap = computed(() => Object.fromEntries(props.data.entries.map((e) => [e.id, e])))
const name = (id: number | null | undefined) => (id != null ? entryMap.value[id]?.name ?? '—' : '—')

const consolationMatches = computed(() => props.data.matches.filter((m) => m.stage === 'CONSOLATION'))
// Finalrunde (Gruppenturnier mit 2 Gruppen): Finale + Spiel um Platz 3.
// Nur im FINALS-Modus – das THIRD_PLACE-Spiel eines KO-Baums wird dort im Baum gezeigt.
const isFinals = computed(() => props.data.discipline.consolationFormat === 'FINALS')
const finalMatch = computed(() =>
  isFinals.value ? props.data.matches.find((m) => m.stage === 'FINAL') ?? null : null,
)
const thirdPlaceMatch = computed(() =>
  isFinals.value ? props.data.matches.find((m) => m.stage === 'THIRD_PLACE') ?? null : null,
)
const finalsMatches = computed(() =>
  [finalMatch.value, thirdPlaceMatch.value].filter((m): m is MatchDto => m != null),
)
const groupNos = computed(() =>
  Object.keys(props.data.standings).map(Number).sort((a, b) => a - b),
)

// Podium (Sieger / Finalist / Platz 3)
const podium = computed(() => {
  if (d.value.format === 'KO') {
    const mains = props.data.matches.filter((m) => m.stage === 'MAIN')
    if (!mains.length) return null
    const maxRound = Math.max(...mains.map((m) => m.round))
    const final = mains.find((m) => m.round === maxRound)
    if (!final || final.status !== 'DONE') return null
    const champ = final.winnerEntryId
    const runner = final.winnerEntryId === final.entry1Id ? final.entry2Id : final.entry1Id
    const third = props.data.matches.find((m) => m.stage === 'THIRD_PLACE' && m.status === 'DONE')
    return { first: champ, second: runner, third: third?.winnerEntryId ?? null }
  }
  if (d.value.format === 'GROUP' && d.value.consolationFormat === 'FINALS') {
    const fin = finalMatch.value
    if (!fin || fin.status !== 'DONE') return null
    const first = fin.winnerEntryId
    const second = fin.winnerEntryId === fin.entry1Id ? fin.entry2Id : fin.entry1Id
    const third = thirdPlaceMatch.value?.status === 'DONE' ? thirdPlaceMatch.value : null
    return { first, second, third: third?.winnerEntryId ?? null }
  }
  if (d.value.format === 'GROUP' && groupNos.value.length === 1) {
    const rows = props.data.standings[groupNos.value[0]]
    if (!rows?.length || d.value.status !== 'DONE') return null
    return { first: rows[0]?.entryId ?? null, second: rows[1]?.entryId ?? null, third: rows[2]?.entryId ?? null }
  }
  return null
})

const groupMatches = (g: number) => props.data.matches.filter((m) => m.stage === 'GROUP' && m.groupNo === g)
</script>

<template>
  <div class="tc-stack">
    <!-- Podium -->
    <TcCard v-if="podium" padded style="background: linear-gradient(135deg, var(--red-50), var(--white))">
      <TcSectionHeading eyebrow="Endstand" title="Platzierungen" />
      <div class="tc-row-wrap" style="margin-top: var(--space-4); gap: var(--space-5)">
        <div class="tc-row" style="gap: var(--space-2)"><TcBadge>1. Platz</TcBadge><strong>{{ name(podium.first) }}</strong></div>
        <div class="tc-row" style="gap: var(--space-2)"><TcBadge variant="soft">2. Platz</TcBadge><span>{{ name(podium.second) }}</span></div>
        <div v-if="podium.third" class="tc-row" style="gap: var(--space-2)"><TcBadge variant="clay">3. Platz</TcBadge><span>{{ name(podium.third) }}</span></div>
      </div>
    </TcCard>

    <!-- KO -->
    <template v-if="d.format === 'KO'">
      <TcCard padded>
        <h3 style="margin: 0 0 var(--space-5)">Turnierbaum</h3>
        <BracketView :matches="data.matches" :entries="data.entries" stage="MAIN" :editable="editable" @enter="emit('enter', $event)" @schedule="emit('schedule', $event)" />
      </TcCard>
    </template>

    <!-- Gruppen -->
    <template v-else>
      <div class="tc-grid" :style="{ gridTemplateColumns: groupNos.length > 1 ? 'repeat(auto-fit, minmax(340px, 1fr))' : '1fr' }">
        <GroupTable
          v-for="g in groupNos"
          :key="g"
          :title="`Gruppe ${g}`"
          :rows="data.standings[g]"
          :matches="groupMatches(g)"
          :entries="data.entries"
          :editable="editable"
          @enter="emit('enter', $event)"
          @schedule="emit('schedule', $event)"
        />
      </div>
    </template>

    <!-- Finalrunde (Gruppenturnier mit 2 Gruppen): Finale + Spiel um Platz 3 -->
    <TcCard v-if="finalsMatches.length" padded>
      <h3 style="margin: 0 0 var(--space-5)">Finalrunde</h3>
      <div class="tc-row-wrap" style="gap: var(--space-5); align-items: flex-start">
        <div v-for="m in finalsMatches" :key="m.id" class="tc-stack-sm">
          <div style="font-family: var(--font-display); font-weight: 600; font-size: var(--text-sm)">{{ m.label }}</div>
          <MatchCard
            :match="m"
            :entry-map="entryMap"
            :editable="editable"
            @enter="emit('enter', $event)"
            @schedule="emit('schedule', $event)"
          />
        </div>
      </div>
    </TcCard>

    <!-- Nebenrunde (für alle Formate) -->
    <TcCard v-if="consolationMatches.length" padded>
      <h3 style="margin: 0 0 var(--space-5)">Nebenrunde</h3>
      <BracketView
        v-if="d.consolationFormat === 'KO'"
        :matches="data.matches"
        :entries="data.entries"
        stage="CONSOLATION"
        :editable="editable"
        @enter="emit('enter', $event)"
        @schedule="emit('schedule', $event)"
      />
      <GroupTable
        v-else-if="data.consolationStandings"
        title="Trostrunde"
        :rows="data.consolationStandings"
        :matches="consolationMatches"
        :entries="data.entries"
        :editable="editable"
        @enter="emit('enter', $event)"
        @schedule="emit('schedule', $event)"
      />
    </TcCard>
  </div>
</template>
