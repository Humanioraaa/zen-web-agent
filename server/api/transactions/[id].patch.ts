import { editTransaction } from '~~/server/services/transactionService'
import { ok } from '~~/server/utils/response'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const body = await readBody(event)
  const transaction = await editTransaction(event, id, body)
  return ok(transaction)
})
