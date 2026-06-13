import type { H3Event } from 'h3'
import type { MenuCategory, MenuCategoryCreateInput, MenuCategoryUpdateInput } from '~/types/menu'
import {
  getMenuCategories,
  createMenuCategory,
  updateMenuCategory,
  deleteMenuCategory,
  countMenuCategoryUsage,
} from '../repositories/menu-category-repository'

interface CategoryRowBase {
  id: string
  name: string
  sort_order: number | string
  safe_threshold: number | string
  warning_threshold: number | string
}

function toMenuCategory(row: CategoryRowBase, menuCount?: number): MenuCategory {
  return {
    id: row.id,
    name: row.name,
    sort_order: Number(row.sort_order),
    safe_threshold: Number(row.safe_threshold),
    warning_threshold: Number(row.warning_threshold),
    ...(menuCount === undefined ? {} : { menu_count: menuCount }),
  }
}

export async function listMenuCategories(event: H3Event): Promise<MenuCategory[]> {
  const rows = await getMenuCategories(event)
  return rows.map((row) => {
    const embedded = (row as { menu_items?: { count: number }[] }).menu_items
    const menuCount = embedded?.[0]?.count ?? 0
    return toMenuCategory(row as CategoryRowBase, menuCount)
  })
}

export async function addMenuCategory(event: H3Event, payload: MenuCategoryCreateInput): Promise<MenuCategory> {
  const row = await createMenuCategory(event, payload)
  return toMenuCategory(row as CategoryRowBase)
}

export async function editMenuCategory(event: H3Event, id: string, payload: MenuCategoryUpdateInput): Promise<MenuCategory> {
  const row = await updateMenuCategory(event, id, payload)
  return toMenuCategory(row as CategoryRowBase)
}

export async function removeMenuCategory(event: H3Event, id: string): Promise<void> {
  const used = await countMenuCategoryUsage(event, id)
  if (used > 0) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Kategori dipakai oleh menu, tidak bisa dihapus',
    })
  }
  await deleteMenuCategory(event, id)
}
