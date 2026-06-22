<script setup lang="ts">
/** TC Rot-Weiß Püttlingen — Badge. Kleines Status-/Kategorie-Label. */
const props = withDefaults(
  defineProps<{
    variant?: 'brand' | 'soft' | 'clay' | 'court' | 'neutral' | 'outline'
    size?: 'sm' | 'md'
  }>(),
  { variant: 'brand', size: 'md' },
)

const variants = {
  brand: { background: 'var(--red-500)', color: 'var(--white)' },
  soft: { background: 'var(--red-50)', color: 'var(--brand-strong)' },
  clay: { background: 'var(--clay-100)', color: 'var(--clay-700)' },
  court: { background: 'var(--court-100)', color: 'var(--court-700)' },
  neutral: { background: 'var(--ink-100)', color: 'var(--ink-700)' },
  outline: { background: 'transparent', color: 'var(--brand-strong)', boxShadow: 'inset 0 0 0 1.5px var(--brand)' },
}
const sizes = {
  sm: { fontSize: '0.6875rem', padding: '3px 9px' },
  md: { fontSize: 'var(--text-xs)', padding: '5px 12px' },
}

const style = computed(() => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '5px',
  fontFamily: 'var(--font-display)',
  fontWeight: 'var(--weight-bold)',
  letterSpacing: 'var(--tracking-wide)',
  textTransform: 'uppercase' as const,
  borderRadius: 'var(--radius-pill)',
  lineHeight: '1.2',
  whiteSpace: 'nowrap' as const,
  ...sizes[props.size],
  ...variants[props.variant],
}))
</script>

<template>
  <span :style="style"><slot /></span>
</template>
