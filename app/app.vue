<script setup lang="ts">
const { refresh } = useAuth()
await refresh()
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
