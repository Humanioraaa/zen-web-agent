import { removeTransaction } from '~~/server/services/transactionService'
import { ok } from '~~/server/utils/response'

export default defineEventHandler(async (event) => {
  const id = requireIdParam(event)
  await removeTransaction(event, id)
  return ok({ success: true })
})
