<script setup lang="ts">
import type { EntryDto, MatchDto } from '~/types'

const props = defineProps<{ match: MatchDto; entryMap: Record<number, EntryDto> }>()
const emit = defineEmits<{
  save: [payload: { scheduledAt: string | null }]
  close: []
}>()

const name1 = computed(() => (props.match.entry1Id != null ? props.entryMap[props.match.entry1Id]?.name : '—'))
const name2 = computed(() => (props.match.entry2Id != null ? props.entryMap[props.match.entry2Id]?.name : '—'))

const scheduledLocal = ref('')

function toLocalInput(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

onMounted(() => {
  if (props.match.scheduledAt) scheduledLocal.value = toLocalInput(props.match.scheduledAt)
})

function onSave() {
  emit('save', { scheduledAt: scheduledLocal.value ? new Date(scheduledLocal.value).toISOString() : null })
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
        <h3 style="margin: 0">Termin</h3>
        <button style="border: none; background: none; cursor: pointer; font-size: 22px; color: var(--text-muted)" @click="emit('close')">×</button>
      </div>

      <div class="tc-stack-sm" style="margin-bottom: var(--space-5)">
        <div class="tc-spread"><strong>{{ name1 }}</strong><TcBadge size="sm" variant="neutral">Spieler 1</TcBadge></div>
        <div class="tc-spread"><strong>{{ name2 }}</strong><TcBadge size="sm" variant="neutral">Spieler 2</TcBadge></div>
      </div>

      <label class="tc-stack-sm" style="margin-bottom: var(--space-5)">
        <span style="font-family: var(--font-display); font-weight: 600; font-size: var(--text-sm)">Termin</span>
        <input v-model="scheduledLocal" type="datetime-local" class="tc-datetime" />
      </label>

      <div class="tc-spread" style="margin-top: var(--space-5)">
        <TcButton v-if="match.scheduledAt" variant="ghost" size="sm" @click="scheduledLocal = ''">Termin entfernen</TcButton>
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
.tc-datetime {
  font-family: var(--font-body);
  font-size: var(--text-base);
  padding: 10px 14px;
  border-radius: var(--radius-md);
  border: 2px solid var(--border-default);
  background: var(--white);
  outline: none;
}
.tc-datetime:focus { border-color: var(--brand); }
</style>
