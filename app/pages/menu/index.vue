<template>
  <div class="menu-page">
    <div class="page-head">
      <h1 class="page-heading">Menu</h1>
      <NuxtLink to="/menu/new" class="add-btn">
        <IconPlus :size="16" />
        <span>Tambah Menu</span>
      </NuxtLink>
    </div>

    <!-- Loading -->
    <div v-if="pending" class="skeleton-list">
      <div v-for="n in 4" :key="n" class="skeleton-item" />
    </div>

    <!-- Empty -->
    <div v-else-if="groups.length === 0" class="empty-state">
      Belum ada menu. Tap "Tambah Menu" untuk mulai.
    </div>

    <!-- Grouped by category -->
    <div v-else class="groups">
      <section v-for="g in groups" :key="g.category.id" class="group">
        <h2 class="group-title">{{ g.category.name }}</h2>
        <ul class="menu-list">
          <li v-for="m in g.items" :key="m.id" class="menu-row" @click="goEdit(m.id)">
            <div class="menu-main">
              <span class="menu-name">{{ m.name }}</span>
              <span class="menu-sub">
                Jual {{ formatRupiah(m.selling_price) }} · HPP {{ formatRupiah(m.hpp) }}
              </span>
            </div>
            <div class="menu-right">
              <span class="menu-margin">
                {{ formatRupiah(m.margin) }}
                <span class="menu-marginpct">{{ m.margin_pct === null ? '' : `(${m.margin_pct}%)` }}</span>
              </span>
              <span class="health-badge" :class="healthClass(m.health)">{{ healthLabel(m.health) }}</span>
            </div>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { IconPlus } from '@tabler/icons-vue'
import { useMenuApi } from '~/api/menu-api'
import { useMenuCategoryApi } from '~/api/menu-category-api'

const { formatRupiah } = useFormatRupiah()
const { healthLabel, healthClass } = useMenuHealth()
const menuApi = useMenuApi()
const catApi = useMenuCategoryApi()
const router = useRouter()

const [{ data: menuData, pending: menuPending }, { data: catData, pending: catPending }] = await Promise.all([
  useAsyncData('menu-list', () => menuApi.list()),
  useAsyncData('menu-list-categories', () => catApi.list()),
])

const pending = computed(() => menuPending.value || catPending.value)

const groups = computed(() => {
  const menus = menuData.value?.data ?? []
  const cats = catData.value?.data ?? []
  return cats
    .map((category) => ({ category, items: menus.filter((m) => m.category_id === category.id) }))
    .filter((g) => g.items.length > 0)
})

function goEdit(id: string) {
  router.push(`/menu/${id}`)
}
</script>

<style scoped>
.menu-page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 640px;
  padding-top: 0.5rem;
}

.page-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.page-heading {
  display: none;
  font-size: 22px;
  font-weight: 700;
  color: var(--color-text);
}

.add-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  background: var(--color-text);
  color: #ffffff;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  margin-left: auto;
}

.groups {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.group-title {
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  color: var(--color-text-subtle);
  margin-bottom: 8px;
}

.menu-list {
  list-style: none;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 0 12px;
}

.menu-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 4px;
  border-bottom: 1px solid var(--color-border);
  cursor: pointer;
}

.menu-row:last-child {
  border-bottom: none;
}

.menu-main {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.menu-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
}

.menu-sub {
  font-size: 12px;
  color: var(--color-text-subtle);
}

.menu-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  flex-shrink: 0;
}

.menu-margin {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
  white-space: nowrap;
}

.menu-marginpct {
  font-size: 11px;
  color: var(--color-text-subtle);
  font-weight: 500;
}

.health-badge {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  border-radius: 999px;
  padding: 2px 8px;
}

.health--safe {
  color: var(--color-success);
  background: color-mix(in srgb, var(--color-success) 14%, transparent);
}

.health--warning {
  color: var(--color-warning, #b45309);
  background: color-mix(in srgb, var(--color-warning, #b45309) 14%, transparent);
}

.health--danger {
  color: var(--color-danger);
  background: color-mix(in srgb, var(--color-danger) 14%, transparent);
}

.health--unknown {
  color: var(--color-text-subtle);
  background: var(--color-bg-subtle);
}

.empty-state {
  font-size: 14px;
  color: var(--color-text-subtle);
  text-align: center;
  padding: 2.5rem 1rem;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.skeleton-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.skeleton-item {
  height: 60px;
  background: var(--color-bg-subtle);
  border-radius: var(--radius-sm);
  animation: pulse 1.5s ease-in-out infinite;
}

@media (min-width: 640px) {
  .page-heading {
    display: block;
  }
}
</style>
