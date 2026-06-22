<script setup lang="ts">
/** TC Rot-Weiß Püttlingen — Card. Weiche, warm beschattete Fläche. */
const props = withDefaults(
  defineProps<{
    interactive?: boolean
    padded?: boolean
    accent?: boolean
    to?: string
  }>(),
  { interactive: false, padded: true, accent: false },
)

const style = computed(() => ({
  display: 'block',
  background: 'var(--surface-card)',
  borderRadius: 'var(--radius-lg)',
  boxShadow: 'var(--shadow-sm)',
  border: '1px solid var(--border-soft)',
  borderTop: props.accent ? '4px solid var(--brand)' : '1px solid var(--border-soft)',
  padding: props.padded ? 'var(--space-6)' : '0',
  overflow: 'hidden',
  color: 'inherit',
  textDecoration: 'none',
  transition: 'transform var(--dur) var(--ease-out), box-shadow var(--dur) var(--ease-out)',
  cursor: props.interactive || props.to ? 'pointer' : 'default',
}))
</script>

<template>
  <NuxtLink
    v-if="to"
    :to="to"
    :style="style"
    class="tc-card-interactive"
  >
    <slot />
  </NuxtLink>
  <div v-else :style="style" :class="{ 'tc-card-interactive': interactive }">
    <slot />
  </div>
</template>

<style>
.tc-card-interactive:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}
</style>
