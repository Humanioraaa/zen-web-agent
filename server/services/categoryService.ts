import type { H3Event } from 'h3'
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  countCategoryTransactions,
} from '../repositories/categoryRepository'

export async function listCategories(event: H3Event, type?: string) {
  return getCategories(event, type)
}

export async function addCategory(
  event: H3Event,
  payload: { name: string; type: 'income' | 'expense' },
) {
  return createCategory(event, payload)
}

export async function editCategory(event: H3Event, id: string, payload: { name: string }) {
  return updateCategory(event, id, payload)
}

export async function removeCategory(event: H3Event, id: string) {
  const linked = await countCategoryTransactions(event, id)
  if (linked > 0) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Category has linked transactions and cannot be deleted',
    })
  }
  await deleteCategory(event, id)
}
