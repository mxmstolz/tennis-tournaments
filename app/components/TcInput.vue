<script setup lang="ts">
/** TC Rot-Weiß Püttlingen — Input. Textfeld mit Label + Hinweis/Fehler. */
const props = defineProps<{
  label?: string
  hint?: string
  error?: string
  type?: string
  placeholder?: string
  modelValue?: string | number | null
  id?: string
}>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const focused = ref(false)
const inputId = computed(
  () => props.id || (props.label ? `inp-${props.label.replace(/\s+/g, '-').toLowerCase()}` : undefined),
)

const inputStyle = computed(() => ({
  width: '100%',
  fontFamily: 'var(--font-body)',
  fontSize: 'var(--text-base)',
  color: 'var(--text-body)',
  padding: '12px 16px',
  borderRadius: 'var(--radius-md)',
  background: 'var(--white)',
  border: `2px solid ${props.error ? 'var(--danger)' : focused.value ? 'var(--brand)' : 'var(--border-default)'}`,
  outline: 'none',
  boxShadow: focused.value ? '0 0 0 4px var(--brand-soft)' : 'none',
  transition: 'border var(--dur-fast), box-shadow var(--dur-fast)',
}))
</script>

<template>
  <div style="display: flex; flex-direction: column; gap: 6px; width: 100%">
    <label
      v-if="label"
      :for="inputId"
      style="font-family: var(--font-display); font-weight: var(--weight-semibold); font-size: var(--text-sm); color: var(--text-strong)"
    >{{ label }}</label>
    <input
      :id="inputId"
      :type="type || 'text'"
      :placeholder="placeholder"
      :value="modelValue ?? ''"
      :style="inputStyle"
      @focus="focused = true"
      @blur="focused = false"
      @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
    <span
      v-if="hint || error"
      :style="{ fontSize: 'var(--text-sm)', color: error ? 'var(--danger)' : 'var(--text-muted)' }"
    >{{ error || hint }}</span>
  </div>
</template>
