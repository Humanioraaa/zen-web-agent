<template>
  <div class="opname-page">
    <div class="page-head">
      <h1 class="page-heading">Stock Opname</h1>
      <button type="button" class="add-btn" :disabled="creating" @click="startNew">
        <IconLoader2 v-if="creating" :size="16" class="spin" />
        <IconClipboardList v-else :size="16" />
        <span>Opname Baru</span>
      </button>
    </div>

    <p class="page-sub">
      Hitung fisik stok berkala. Konsumsi nyata = stok awal + pembelian − stok akhir.
    </p>

    <div v-if="pending" class="skeleton-list">
      <div v-for="n in 4" :key="n" class="skeleton-item" />
    </div>

    <div v-else-if="sessions.length === 0" class="empty-state">
      Belum ada sesi opname. Mulai dengan tombol "Opname Baru".
    </div>

    <ul v-else class="session-list">
      <li v-for="s in sessions" :key="s.id" class="session-row">
        <NuxtLink :to="`/stock-opname/${s.id}`" class="session-main">
          <span class="session-date">{{ formatDate(s.count_date) }}</span>
          <span class="session-meta">
            {{ s.item_count }} bahan
            <template v-if="s.note"> · {{ s.note }}</template>
          </span>
        </NuxtLink>
        <div class="session-right">
          <span v-if="s.total_value !== null" class="session-value">{{ formatRupiah(s.total_value) }}</span>
          <span :class="['badge', s.status === 'finalized' ? 'badge--final' : 'badge--draft']">
            {{ s.status === 'finalized' ? 'Final' : 'Draft' }}
          </span>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { IconClipboardList, IconLoader2 } from '@tabler/icons-vue'
import { useToast } from 'vue-toastification'
import { useStockCountApi } from '~/api/stock-count-api'

const toast = useToast()
const { formatRupiah } = useFormatRupiah()
const api = useStockCountApi()

const { data, pending } = await useAsyncData('stock-counts', () => api.list())
const sessions = computed(() => data.value?.data ?? [])

const dateFmt = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
function formatDate(d: string): string {
  return dateFmt.format(new Date(d))
}

const creating = ref(false)
async function startNew() {
  creating.value = true
  try {
    const res = await api.create()
    await navigateTo(`/stock-opname/${res.data.id}`)
  } catch {
    toast.error('Gagal membuat sesi opname')
    creating.value = false
  }
}
</script>

<style scoped>
.opname-page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 720px;
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
  cursor: pointer;
  transition: opacity 0.15s;
}

.add-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.session-list {
  list-style: none;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 0 12px;
}

.session-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 4px;
  border-bottom: 1px solid var(--color-border);
}

.session-row:last-child {
  border-bottom: none;
}

.session-main {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
  text-decoration: none;
  color: inherit;
}

.session-main:hover .session-date {
  text-decoration: underline;
}

.session-date {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
}

.session-meta {
  font-size: 12px;
  color: var(--color-text-subtle);
}

.session-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.session-value {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
  white-space: nowrap;
}

.badge {
  font-size: 11px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 999px;
}

.badge--final {
  background: var(--color-success-bg, #dcfce7);
  color: var(--color-success, #166534);
}

.badge--draft {
  background: var(--color-bg-subtle);
  color: var(--color-text-subtle);
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
  height: 54px;
  background: var(--color-bg-subtle);
  border-radius: var(--radius-sm);
  animation: pulse 1.5s ease-in-out infinite;
}

.spin {
  animation: spin 0.8s linear infinite;
}
</style>
