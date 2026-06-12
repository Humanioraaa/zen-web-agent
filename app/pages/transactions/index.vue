<template>
  <div class="tx-history">
    <div class="page-head">
      <h1 class="page-heading">Transaksi</h1>
      <NuxtLink to="/transactions/new" class="add-link">
        <IconPlus :size="16" /> Tambah
      </NuxtLink>
    </div>

    <TransactionFilterBar v-model="filters" :wallets="wallets" :categories="categories" />

    <!-- Loading (initial) -->
    <div v-if="loading" class="skeleton-list">
      <div v-for="n in 6" :key="n" class="skeleton-item" />
    </div>

    <!-- Empty -->
    <div v-else-if="items.length === 0" class="empty-state">
      <IconReceiptOff :size="32" stroke-width="1.5" />
      <p>{{ hasActiveFilter ? 'Tidak ada transaksi cocok filter.' : 'Belum ada transaksi.' }}</p>
    </div>

    <!-- List grouped by date -->
    <div v-else class="groups">
      <section v-for="group in grouped" :key="group.date" class="group">
        <h2 class="group-date">{{ formatDateHeader(group.date) }}</h2>
        <div class="group-rows">
          <TransactionHistoryRow
            v-for="tx in group.txs"
            :key="tx.id"
            :transaction="tx"
            :wallets="wallets"
            :categories="categories"
            @changed="reload"
          />
        </div>
      </section>

      <button
        v-if="hasMore"
        type="button"
        class="load-more"
        :disabled="loadingMore"
        @click="loadMore"
      >
        <IconLoader2 v-if="loadingMore" :size="16" class="spin" />
        <span>{{ loadingMore ? 'Memuat...' : 'Muat lebih banyak' }}</span>
      </button>

      <p class="count-note">{{ items.length }} dari {{ total }} transaksi</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { IconPlus, IconReceiptOff, IconLoader2 } from '@tabler/icons-vue'
import { useToast } from 'vue-toastification'
import type { TransactionRecord, Wallet, Category } from '~/types/models'

const route = useRoute()
const toast = useToast()

const LIMIT = 20

const filters = reactive({
  type: '',
  wallet_id: (route.query.wallet_id as string) || '',
  category_id: '',
  date_from: '',
  date_to: '',
  search: '',
})

const { data: walletsData } = await useFetch<{ data: Wallet[] }>('/api/wallets')
const { data: catData } = await useFetch<{ data: Category[] }>('/api/categories')
const wallets = computed(() => walletsData.value?.data ?? [])
const categories = computed(() => catData.value?.data ?? [])

const items = ref<TransactionRecord[]>([])
const total = ref(0)
const offset = ref(0)
const loading = ref(true)
const loadingMore = ref(false)

const hasMore = computed(() => items.value.length < total.value)

const hasActiveFilter = computed(
  () =>
    !!filters.type ||
    !!filters.wallet_id ||
    !!filters.category_id ||
    !!filters.date_from ||
    !!filters.date_to ||
    !!filters.search,
)

const grouped = computed(() => {
  const map = new Map<string, TransactionRecord[]>()
  for (const tx of items.value) {
    if (!map.has(tx.date)) map.set(tx.date, [])
    map.get(tx.date)!.push(tx)
  }
  return Array.from(map.entries()).map(([date, txs]) => ({ date, txs }))
})

function buildQuery() {
  const q: Record<string, string | number> = { limit: LIMIT, offset: offset.value }
  if (filters.type) q.type = filters.type
  if (filters.wallet_id) q.wallet_id = filters.wallet_id
  if (filters.category_id) q.category_id = filters.category_id
  if (filters.date_from) q.date_from = filters.date_from
  if (filters.date_to) q.date_to = filters.date_to
  if (filters.search) q.search = filters.search
  return q
}

async function load(reset: boolean) {
  if (reset) {
    offset.value = 0
    loading.value = true
  } else {
    loadingMore.value = true
  }

  try {
    const res = await $fetch<{ data: TransactionRecord[]; total: number }>('/api/transactions', {
      query: buildQuery(),
    })
    items.value = reset ? res.data : [...items.value, ...res.data]
    total.value = res.total
  } catch {
    toast.error('Gagal memuat transaksi')
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

function loadMore() {
  offset.value += LIMIT
  load(false)
}

function reload() {
  load(true)
}

function formatDateHeader(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

let debounce: ReturnType<typeof setTimeout>
watch(
  filters,
  () => {
    clearTimeout(debounce)
    debounce = setTimeout(() => load(true), 300)
  },
  { deep: true },
)

onMounted(() => load(true))
onUnmounted(() => clearTimeout(debounce))
</script>

<style scoped>
.tx-history {
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
}

.page-heading {
  display: none;
  font-size: 22px;
  font-weight: 700;
  color: var(--color-text);
}

.add-link {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 7px 14px;
  background: var(--color-text);
  color: #ffffff;
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
  margin-left: auto;
}

.groups {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.group-date {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-subtle);
  text-transform: capitalize;
  padding: 2px 4px;
}

.group-rows {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 0 12px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 3rem 1rem;
  color: var(--color-text-subtle);
  font-size: 14px;
}

.load-more {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text);
  cursor: pointer;
  transition: border-color 0.15s;
}

.load-more:hover:not(:disabled) {
  border-color: var(--color-text);
}

.load-more:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.count-note {
  text-align: center;
  font-size: 12px;
  color: var(--color-text-subtle);
}

.skeleton-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.skeleton-item {
  height: 52px;
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
