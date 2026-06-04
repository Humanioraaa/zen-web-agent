import { addTransaction } from '~~/server/services/transactionService'
import { ok } from '~~/server/utils/response'

const VALID_TYPES = ['income', 'expense', 'transfer'] as const

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  // type
  if (!VALID_TYPES.includes(body.type)) {
    throw createError({ statusCode: 400, statusMessage: 'type must be income, expense, or transfer' })
  }

  // amount
  const amount = Number(body.amount)
  if (!Number.isFinite(amount) || amount <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'amount must be greater than 0' })
  }

  // source wallet
  if (!body.wallet_id) {
    throw createError({ statusCode: 400, statusMessage: 'wallet_id is required' })
  }

  // type-specific
  if (body.type === 'transfer') {
    if (!body.wallet_to_id) {
      throw createError({ statusCode: 400, statusMessage: 'wallet_to_id is required for transfer' })
    }
    if (body.wallet_to_id === body.wallet_id) {
      throw createError({ statusCode: 400, statusMessage: 'wallet_to_id must differ from wallet_id' })
    }
  } else {
    if (!body.category_id) {
      throw createError({ statusCode: 400, statusMessage: 'category_id is required' })
    }
  }

  const transaction = await addTransaction(event, {
    type: body.type,
    amount,
    wallet_id: body.wallet_id,
    wallet_to_id: body.type === 'transfer' ? body.wallet_to_id : undefined,
    category_id: body.type === 'transfer' ? undefined : body.category_id,
    note: body.note || undefined,
    date: body.date || undefined,
    source: body.source || undefined,
  })

  setResponseStatus(event, 201)
  return ok(transaction)
})
