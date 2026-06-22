export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  return { admin: (session.user as { admin?: boolean } | undefined)?.admin === true }
})
