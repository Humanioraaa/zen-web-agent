import { z } from 'zod'
import { buildSalesImportPreview } from '~~/server/services/sales-import-service'
import { ok } from '~~/server/utils/response'
import { readZodBody, requireIdParam } from '~~/server/utils/validation'

// Owner uploads one or more Kasir Pintar per-day sales exports (read to text on the
// client). Returns a matched/unmatched preview — no write; save via PUT /sales.
const schema = z.object({
  files: z.array(z.string().min(1)).min(1, 'Tidak ada file').max(60, 'Terlalu banyak file (maks 60)'),
})

export default defineEventHandler(async (event) => {
  const id = requireIdParam(event)
  const input = await readZodBody(event, schema)
  const preview = await buildSalesImportPreview(event, id, input.files)
  return ok(preview)
})
