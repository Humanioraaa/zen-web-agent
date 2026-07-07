import { z } from 'zod'
import { editCustomOrder } from '~~/server/services/custom-order-service'
import { ok } from '~~/server/utils/response'
import { readZodBody, requireIdParam } from '~~/server/utils/validation'

const DATE = /^\d{4}-\d{2}-\d{2}$/
const STATUS = ['quote', 'confirmed', 'in_progress', 'done', 'cancelled'] as const

const schema = z.object({
  customer_name: z.string().trim().min(1, 'Nama customer wajib diisi').optional(),
  item_name: z.string().trim().min(1, 'Nama item wajib diisi').optional(),
  qty: z.number().positive('Qty harus > 0').optional(),
  unit_price: z.number().min(0, 'Harga satuan tidak boleh negatif').nullable().optional(),
  quoted_price: z.number().min(0, 'Harga tidak boleh negatif').optional(),
  order_date: z.string().regex(DATE, 'Format tanggal YYYY-MM-DD').optional(),
  due_date: z.string().regex(DATE, 'Format tanggal YYYY-MM-DD').nullable().optional(),
  status: z.enum(STATUS).optional(),
  notes: z.string().trim().max(1000, 'Catatan maksimal 1000 karakter').nullable().optional(),
})

export default defineEventHandler(async (event) => {
  const id = requireIdParam(event)
  const data = await readZodBody(event, schema)
  const order = await editCustomOrder(event, id, data)
  return ok(order)
})
