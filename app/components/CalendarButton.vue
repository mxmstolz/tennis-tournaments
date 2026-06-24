<script setup lang="ts">
/** Kleiner Icon-Button zum Festlegen eines Spieltermins. */
withDefaults(defineProps<{ active?: boolean; title?: string }>(), { active: false, title: 'Termin festlegen' })
const emit = defineEmits<{ click: [] }>()
</script>

<template>
  <button
    type="button"
    class="cal-btn tc-no-print"
    :class="{ 'cal-btn--active': active }"
    :title="title"
    :aria-label="title"
    @click.stop="emit('click')"
  >
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  </button>
</template>

<style scoped>
.cal-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  padding: 0;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-sm);
  background: var(--white);
  color: var(--text-muted);
  cursor: pointer;
  transition: border-color var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out);
}
.cal-btn:hover {
  border-color: var(--brand);
  color: var(--brand);
}
.cal-btn--active {
  border-color: var(--brand);
  color: var(--brand);
}
</style>
