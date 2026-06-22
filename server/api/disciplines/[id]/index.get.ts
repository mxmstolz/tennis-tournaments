import { getDisciplineData } from '../../../utils/disciplineData'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const data = await getDisciplineData(id)
  if (!data) throw createError({ statusCode: 404, statusMessage: 'Disziplin nicht gefunden.' })
  return data
})
