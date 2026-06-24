<script setup lang="ts">
import type { EntryDto, MatchDto } from '~/types'
import type { MatchScore } from '~/utils/tennis'

const props = defineProps<{ match: MatchDto; entryMap: Record<number, EntryDto> }>()
const emit = defineEmits<{
  save: [payload: { score: MatchScore | null }]
  clear: []
  close: []
}>()

const name1 = computed(() => (props.match.entry1Id != null ? props.entryMap[props.match.entry1Id]?.name : '—'))
const name2 = computed(() => (props.match.entry2Id != null ? props.entryMap[props.match.entry2Id]?.name : '—'))
const canScore = computed(() => props.match.entry1Id != null && props.match.entry2Id != null)

type Cell = { p1: number | null; p2: number | null }
const sets = reactive<Cell[]>([
  { p1: null, p2: null },
  { p1: null, p2: null },
  { p1: null, p2: null }, // Match-Tiebreak
])
const mode = ref<'normal' | 'walkover'>('normal')
const walkoverSide = ref<'p1' | 'p2'>('p2')
const retired = ref<'' | 'p1' | 'p2'>('')
const error = ref('')

// vorhandenes Ergebnis vorbefüllen
onMounted(() => {
  const s = props.match.score
  if (!s) return
  if (s.walkover) {
    mode.value = 'walkover'
    walkoverSide.value = s.walkover
    return
  }
  s.sets.forEach((set, i) => {
    if (i < 3) {
      sets[i].p1 = set.p1
      sets[i].p2 = set.p2
    }
  })
  if (s.retired) retired.value = s.retired
})

function num(v: number | null): number {
  return v == null || Number.isNaN(v) ? 0 : v
}

function build(): MatchScore | null {
  if (!canScore.value) return null
  if (mode.value === 'walkover') return { sets: [], walkover: walkoverSide.value }
  const used = sets.filter((s) => s.p1 != null || s.p2 != null)
  if (!used.length) return null // kein Ergebnis eingetragen
  const score: MatchScore = { sets: used.map((s) => ({ p1: num(s.p1), p2: num(s.p2) })) }
  if (retired.value) score.retired = retired.value
  return score
}

function onSave() {
  error.value = ''
  emit('save', { score: build() })
}
</script>

<template>
  <div
    class="tc-no-print"
    style="position: fixed; inset: 0; z-index: 50; background: rgba(26,20,19,0.55); display: flex; align-items: center; justify-content: center; padding: var(--space-4)"
    @click.self="emit('close')"
  >
    <TcCard padded style="width: 100%; max-width: 460px; max-height: 90vh; overflow: auto">
      <div class="tc-spread" style="margin-bottom: var(--space-4)">
        <h3 style="margin: 0">Ergebnis</h3>
        <button style="border: none; background: none; cursor: pointer; font-size: 22px; color: var(--text-muted)" @click="emit('close')">×</button>
      </div>

      <div class="tc-stack-sm" style="margin-bottom: var(--space-5)">
        <div class="tc-spread"><strong>{{ name1 }}</strong><TcBadge size="sm" variant="neutral">Spieler 1</TcBadge></div>
        <div class="tc-spread"><strong>{{ name2 }}</strong><TcBadge size="sm" variant="neutral">Spieler 2</TcBadge></div>
      </div>

      <p v-if="!canScore" class="tc-faint" style="font-size: var(--text-sm); margin: 0 0 var(--space-4)">
        Teilnehmer stehen noch nicht fest – Ergebnis kann noch nicht eingetragen werden.
      </p>

      <template v-if="canScore">
      <div class="tc-row-wrap" style="margin-bottom: var(--space-5)">
        <label class="tc-row" style="gap: 6px; cursor: pointer">
          <input v-model="mode" type="radio" value="normal" /> Ergebnis
        </label>
        <label class="tc-row" style="gap: 6px; cursor: pointer">
          <input v-model="mode" type="radio" value="walkover" /> w.o. (nicht angetreten)
        </label>
      </div>

      <template v-if="mode === 'normal'">
        <table class="tc-table" style="margin-bottom: var(--space-4)">
          <thead>
            <tr><th></th><th class="num">{{ name1 }}</th><th class="num">{{ name2 }}</th></tr>
          </thead>
          <tbody>
            <tr><td>1. Satz</td>
              <td class="num"><input v-model.number="sets[0].p1" type="number" min="0" class="score-cell" /></td>
              <td class="num"><input v-model.number="sets[0].p2" type="number" min="0" class="score-cell" /></td>
            </tr>
            <tr><td>2. Satz</td>
              <td class="num"><input v-model.number="sets[1].p1" type="number" min="0" class="score-cell" /></td>
              <td class="num"><input v-model.number="sets[1].p2" type="number" min="0" class="score-cell" /></td>
            </tr>
            <tr><td>Match-Tiebreak</td>
              <td class="num"><input v-model.number="sets[2].p1" type="number" min="0" class="score-cell" /></td>
              <td class="num"><input v-model.number="sets[2].p2" type="number" min="0" class="score-cell" /></td>
            </tr>
          </tbody>
        </table>
        <p class="tc-faint" style="font-size: var(--text-xs); margin: 0 0 var(--space-4)">
          2 Gewinnsätze · 3. Satz = Match-Tiebreak (bis 10). Tiebreak nur bei 1:1 ausfüllen.
        </p>
        <label class="tc-row" style="gap: 6px; margin-bottom: var(--space-4); cursor: pointer">
          <input
            type="checkbox"
            :checked="retired !== ''"
            @change="retired = ($event.target as HTMLInputElement).checked ? 'p2' : ''"
          />
          Aufgabe
        </label>
        <div v-if="retired !== ''" class="tc-row-wrap" style="margin-bottom: var(--space-4)">
          <label class="tc-row" style="gap: 6px"><input v-model="retired" type="radio" value="p1" /> {{ name1 }} gibt auf</label>
          <label class="tc-row" style="gap: 6px"><input v-model="retired" type="radio" value="p2" /> {{ name2 }} gibt auf</label>
        </div>
      </template>

      <div v-else class="tc-stack-sm" style="margin-bottom: var(--space-4)">
        <label class="tc-row" style="gap: 6px"><input v-model="walkoverSide" type="radio" value="p1" /> {{ name1 }} nicht angetreten</label>
        <label class="tc-row" style="gap: 6px"><input v-model="walkoverSide" type="radio" value="p2" /> {{ name2 }} nicht angetreten</label>
      </div>
      </template>

      <p v-if="error" style="color: var(--danger); font-size: var(--text-sm)">{{ error }}</p>

      <div class="tc-spread" style="margin-top: var(--space-5)">
        <TcButton v-if="match.status === 'DONE'" variant="ghost" size="sm" @click="emit('clear')">Zurücksetzen</TcButton>
        <span v-else />
        <div class="tc-row">
          <TcButton variant="ghost" size="sm" @click="emit('close')">Abbrechen</TcButton>
          <TcButton size="sm" @click="onSave">Speichern</TcButton>
        </div>
      </div>
    </TcCard>
  </div>
</template>

<style scoped>
.score-cell {
  width: 56px;
  text-align: center;
  font-family: var(--font-display);
  font-size: var(--text-base);
  padding: 6px;
  border: 2px solid var(--border-default);
  border-radius: var(--radius-sm);
  outline: none;
}
.score-cell:focus { border-color: var(--brand); }
</style>
