<template>
  <div class="co-page">
    <div class="page-head">
      <h1 class="page-heading">Pesanan Custom</h1>
      <NuxtLink to="/custom-orders/new" class="add-btn">
        <IconPlus :size="16" />
        <span>Pesanan Baru</span>
      </NuxtLink>
    </div>
    <p class="page-sub">Pesanan/katering di luar menu. Laba per pesanan = pembayaran − biaya.</p>

    <div class="tabs">
      <button
        v-for="t in tabs"
        :key="t.value"
        type="button"
        :class="['tab', { 'tab--on': activeFilter === t.value }]"
        @click="activeFilter = t.value"
      >
        {{ t.label }} <span class="tab-count">{{ t.count }}</span>
      </button>
    </div>

    <div v-if="pending" class="skeleton-list">
      <div v-for="n in 4" :key="n" class="skeleton-item" />
    </div>

    <div v-else-if="filtered.length === 0" class="empty-state">
      {{ activeFilter === 'all' ? 'Belum ada pesanan custom. Buat dengan tombol "Pesanan Baru".' : 'Tidak ada pesanan di status ini.' }}
    </div>

    <ul v-else class="co-list">
      <li v-for="o in filtered" :key="o.id" class="co-row">
        <NuxtLink :to="`/custom-orders/${o.id}`" class="co-main">
          <span class="co-item">{{ o.item_name }}</span>
          <span class="co-meta">
            {{ o.customer_name }} · {{ o.qty }} pcs
            <template v-if="o.due_date">
              · <span :class="{ 'co-overdue': isOverdue(o) }">tempo {{ formatDate(o.due_date) }}</span>
            </template>
          </span>
        </NuxtLink>
        <div class="co-right">
          <CustomOrderStatusBadge :status="o.status" />
          <span class="co-quoted">{{ formatRupiah(o.quoted_price) }}</span>
          <span v-if="o.outstanding > 0" class="co-outstanding">Sisa {{ formatRupiah(o.outstanding) }}</span>
          <span v-else class="co-lunas">Lunas</span>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { IconPlus } from '@tabler/icons-vue'
import { useCustomOrderApi } from '~/api/custom-order-api'
import type { CustomOrder, CustomOrderStatus } from '~/types/custom-order'

const { formatRupiah } = useFormatRupiah()
const { options } = useCustomOrderStatus()
const api = useCustomOrderApi()

const { data, pending } = await useAsyncData('custom-orders', () => api.list())
const orders = computed<CustomOrder[]>(() => data.value?.data ?? [])

type Filter = 'all' | CustomOrderStatus
const activeFilter = ref<Filter>('all')

const tabs = computed(() => [
  { value: 'all' as Filter, label: 'Semua', count: orders.value.length },
  ...options.map((o) => ({
    value: o.value as Filter,
    label: o.label,
    count: orders.value.filter((x) => x.status === o.value).length,
  })),
])

const filtered = computed(() =>
  activeFilter.value === 'all'
    ? orders.value
    : orders.value.filter((o) => o.status === activeFilter.value),
)

const dateFmt = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
function formatDate(d: string): string {
  return dateFmt.format(new Date(d))
}
function isOverdue(o: CustomOrder): boolean {
  if (!o.due_date || o.status === 'done' || o.status === 'cancelled') return false
  return new Date(o.due_date) < new Date(new Date().toDateString())
}
</script>

<style scoped>
.co-page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 760px;
  padding-top: 0.5rem;
}
.page-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.page-heading {
  font-size: 22px;
  font-weight: 700;
  color: var(--color-text);
}
.page-sub {
  font-size: 13px;
  color: var(--color-text-subtle);
  margin-top: -8px;
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
}
.tabs {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding-bottom: 2px;
}
.tab {
  flex-shrink: 0;
  padding: 7px 12px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-subtle);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 999px;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
}
.tab--on {
  color: var(--color-text);
  border-color: var(--color-text);
}
.tab-count {
  opacity: 0.6;
}
.co-list {
  list-style: none;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 0 12px;
}
.co-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 4px;
  border-bottom: 1px solid var(--color-border);
}
.co-row:last-child {
  border-bottom: none;
}
.co-main {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
  text-decoration: none;
  color: inherit;
}
.co-main:hover .co-item {
  text-decoration: underline;
}
.co-item {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
}
.co-meta {
  font-size: 12px;
  color: var(--color-text-subtle);
}
.co-overdue {
  color: var(--color-danger);
  font-weight: 600;
}
.co-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 3px;
  flex-shrink: 0;
}
.co-quoted {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text);
  white-space: nowrap;
}
.co-outstanding {
  font-size: 11px;
  font-weight: 600;
  color: #92400e;
  white-space: nowrap;
}
.co-lunas {
  font-size: 11px;
  font-weight: 600;
  color: var(--color-success, #166534);
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
  height: 56px;
  background: var(--color-bg-subtle);
  border-radius: var(--radius-sm);
  animation: pulse 1.5s ease-in-out infinite;
}
</style>
