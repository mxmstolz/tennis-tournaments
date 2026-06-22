<script setup lang="ts">
/** TC Rot-Weiß Püttlingen — Button. Pill-CTA, sportlich-freundlich. */
const props = withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'ghost' | 'dark'
    size?: 'sm' | 'md' | 'lg'
    pill?: boolean
    fullWidth?: boolean
    type?: 'button' | 'submit' | 'reset'
    disabled?: boolean
    to?: string
  }>(),
  { variant: 'primary', size: 'md', pill: true, fullWidth: false, type: 'button', disabled: false },
)

const sizes = {
  sm: { padding: '8px 16px', fontSize: 'var(--text-sm)', gap: '6px' },
  md: { padding: '12px 24px', fontSize: 'var(--text-base)', gap: '8px' },
  lg: { padding: '16px 32px', fontSize: 'var(--text-md)', gap: '10px' },
}
const variants = {
  primary: { background: 'var(--brand)', color: 'var(--text-on-brand)', border: '2px solid transparent', boxShadow: 'var(--shadow-brand)' },
  secondary: { background: 'var(--white)', color: 'var(--brand-strong)', border: '2px solid var(--brand)', boxShadow: 'var(--shadow-xs)' },
  ghost: { background: 'transparent', color: 'var(--text-strong)', border: '2px solid transparent', boxShadow: 'none' },
  dark: { background: 'var(--ink-900)', color: 'var(--white)', border: '2px solid transparent', boxShadow: 'var(--shadow-md)' },
}

const style = computed(() => ({
  display: props.fullWidth ? 'flex' : 'inline-flex',
  width: props.fullWidth ? '100%' : 'auto',
  alignItems: 'center',
  justifyContent: 'center',
  gap: sizes[props.size].gap,
  fontFamily: 'var(--font-display)',
  fontWeight: 'var(--weight-bold)',
  fontSize: sizes[props.size].fontSize,
  padding: sizes[props.size].padding,
  borderRadius: props.pill ? 'var(--radius-pill)' : 'var(--radius-md)',
  cursor: props.disabled ? 'not-allowed' : 'pointer',
  opacity: props.disabled ? 0.5 : 1,
  transition: 'transform var(--dur-fast) var(--ease-out), box-shadow var(--dur) var(--ease-out), background var(--dur) var(--ease-out)',
  lineHeight: '1.1',
  textDecoration: 'none',
  ...variants[props.variant],
}))
</script>

<template>
  <NuxtLink v-if="to && !disabled" :to="to" :style="style"><slot /></NuxtLink>
  <button v-else :type="type" :disabled="disabled" :style="style"><slot /></button>
</template>
