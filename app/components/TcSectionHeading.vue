<script setup lang="ts">
/** TC Rot-Weiß Püttlingen — SectionHeading. Eyebrow + Titel + optionaler Intro. */
withDefaults(defineProps<{ eyebrow?: string; title?: string; intro?: string }>(), {})
</script>

<template>
  <div class="tc-stack-sm">
    <span v-if="eyebrow" class="tc-eyebrow">
      <span style="width: 22px; height: 3px; background: var(--brand); border-radius: 2px" />
      {{ eyebrow }}
    </span>
    <h2 v-if="title" style="margin: 0; font-size: var(--text-2xl)">{{ title }}</h2>
    <p v-if="intro" style="margin: 0; font-size: var(--text-md); color: var(--text-muted)">{{ intro }}</p>
    <slot />
  </div>
</template>
