<script setup lang="ts">
const { isAdmin, logout } = useAuth()
const route = useRoute()

const nav = [
  { label: 'Turniere', to: '/' },
  { label: 'Personen', to: '/admin/players', adminOnly: true },
]

function isActive(to: string) {
  return to === '/' ? route.path === '/' : route.path.startsWith(to)
}

async function onLogout() {
  await logout()
  await navigateTo('/')
}
</script>

<template>
  <header
    class="tc-no-print"
    style="position: sticky; top: 0; z-index: 20; background: rgba(255,255,255,0.92); backdrop-filter: blur(10px); border-bottom: 1px solid var(--border-soft)"
  >
    <div class="tc-container" style="display: flex; align-items: center; gap: 20px; height: var(--header-h)">
      <NuxtLink to="/" style="display: flex; align-items: center; gap: 12px; text-decoration: none">
        <img src="/assets/logo-crest.png" alt="TC Rot-Weiß Püttlingen" style="height: 52px" />
        <span style="font-family: var(--font-display); font-weight: 800; font-size: 17px; line-height: 1.05; color: var(--ink-900)">
          TC Rot-Weiß<br /><span style="color: var(--brand)">Püttlingen</span>
        </span>
      </NuxtLink>

      <nav style="display: flex; gap: 4px; margin-left: auto">
        <template v-for="item in nav" :key="item.to">
          <NuxtLink
            v-if="!item.adminOnly || isAdmin"
            :to="item.to"
            :style="{
              padding: '9px 14px',
              borderRadius: 'var(--radius-pill)',
              fontFamily: 'var(--font-display)',
              fontWeight: 600,
              fontSize: '15px',
              textDecoration: 'none',
              transition: 'background var(--dur-fast), color var(--dur-fast)',
              color: isActive(item.to) ? 'var(--brand)' : 'var(--text-body)',
              background: isActive(item.to) ? 'var(--red-50)' : 'transparent',
            }"
          >{{ item.label }}</NuxtLink>
        </template>
      </nav>

      <TcButton v-if="isAdmin" size="sm" variant="ghost" @click="onLogout">Abmelden</TcButton>
      <TcButton v-else size="sm" to="/admin/login">Orga-Login</TcButton>
    </div>
  </header>

  <main class="tc-main">
    <div class="tc-container">
      <slot />
    </div>
  </main>

  <footer class="tc-no-print" style="background: var(--ink-900); color: var(--white)">
    <div class="tc-stripes" style="height: 6px" />
    <div
      class="tc-container"
      style="padding: 40px 24px; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 20px"
    >
      <div style="display: flex; align-items: center; gap: 12px">
        <img src="/assets/logo-crest.png" alt="" style="height: 48px" />
        <span style="font-family: var(--font-display); font-weight: 800; font-size: 16px">
          TC Rot-Weiß Püttlingen e.V.<br />
          <span style="font-weight: 400; font-size: 13px; color: rgba(255,255,255,.7)">Stadtmeisterschaften</span>
        </span>
      </div>
      <span style="font-size: 13px; color: rgba(255,255,255,.55)">© {{ new Date().getFullYear() }} TC Rot-Weiß Püttlingen e.V.</span>
    </div>
  </footer>
</template>
