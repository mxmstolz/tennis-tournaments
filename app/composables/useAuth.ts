/** Admin-Session-Status (Orga-Login). */
export function useAuth() {
  const isAdmin = useState<boolean>('isAdmin', () => false)

  async function refresh() {
    try {
      // useRequestFetch leitet beim SSR die Cookies der Anfrage weiter,
      // damit die Session serverseitig korrekt erkannt wird.
      const fetcher = useRequestFetch()
      const { admin } = await fetcher<{ admin: boolean }>('/api/auth/session')
      isAdmin.value = admin
    } catch {
      isAdmin.value = false
    }
  }

  async function login(password: string) {
    await $fetch('/api/auth/login', { method: 'POST', body: { password } })
    isAdmin.value = true
  }

  async function logout() {
    await $fetch('/api/auth/logout', { method: 'POST' })
    isAdmin.value = false
  }

  return { isAdmin, refresh, login, logout }
}
