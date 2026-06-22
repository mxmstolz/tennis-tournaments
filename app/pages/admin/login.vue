<script setup lang="ts">
const { login } = useAuth()
const password = ref('')
const error = ref('')
const busy = ref(false)

async function submit() {
  error.value = ''
  busy.value = true
  try {
    await login(password.value)
    await navigateTo('/')
  } catch {
    error.value = 'Falsches Passwort.'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div style="max-width: var(--container-narrow); margin: var(--space-7) auto">
    <TcCard padded accent>
      <TcSectionHeading eyebrow="Orga-Bereich" title="Anmelden" intro="Melde dich an, um Turniere zu verwalten und Ergebnisse einzutragen." />
      <form class="tc-stack" style="margin-top: var(--space-5)" @submit.prevent="submit">
        <TcInput v-model="password" label="Passwort" type="password" :error="error" />
        <TcButton type="submit" :disabled="busy || !password" full-width>Anmelden</TcButton>
      </form>
    </TcCard>
  </div>
</template>
