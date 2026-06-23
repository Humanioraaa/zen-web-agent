<template>
  <div class="opname-detail">
    <NuxtLink to="/stock-opname" class="back-link">
      <IconChevronLeft :size="16" /> Kembali
    </NuxtLink>

    <div v-if="pending" class="skeleton-list">
      <div v-for="n in 6" :key="n" class="skeleton-item" />
    </div>

    <template v-else-if="detail">
      <!-- Header -->
      <div class="head">
        <div>
          <h1 class="page-heading">Opname {{ formatDate(detail.count_date) }}</h1>
          <span :class="['badge', detail.status === 'finalized' ? 'badge--final' : 'badge--draft']">
            {{ detail.status === 'finalized' ? 'Final' : 'Draft' }}
          </span>
        </div>
        <div class="head-actions">
          <template v-if="detail.status === 'draft'">
            <button type="button" class="btn btn--ghost" :disabled="saving || finalizing" @click="save">
              <IconLoader2 v-if="saving" :size="16" class="spin" /><IconDeviceFloppy v-else :size="16" />
              <span>Simpan</span>
            </button>
            <button type="button" class="btn btn--primary" :disabled="saving || finalizing" @click="finalize">
              <IconLoader2 v-if="finalizing" :size="16" class="spin" /><IconCheck v-else :size="16" />
              <span>Finalisasi</span>
            </button>
            <button type="button" class="btn btn--danger-ghost" :disabled="saving || finalizing" @click="confirmDelete = true">
              <IconTrash :size="16" />
            </button>
          </template>
        </div>
      </div>

      <!-- Totals -->
      <div class="totals">
        <div class="total-card">
          <span class="total-label">Nilai stok on-hand</span>
          <span class="total-value">{{ formatRupiah(onHandValue) }}</span>
        </div>
        <div v-if="detail.total_consumed_value !== null" class="total-card">
          <span class="total-label">Konsumsi nyata (COGS aktual)</span>
          <span class="total-value">{{ formatRupiah(detail.total_consumed_value) }}</span>
        </div>
        <div v-if="detail.total_theoretical_value !== null" class="total-card">
          <span class="total-label">Pemakaian teoretis (terjual)</span>
          <span class="total-value">{{ formatRupiah(detail.total_theoretical_value) }}</span>
        </div>
        <div v-if="detail.total_variance_value !== null" class="total-card">
          <span class="total-label">Selisih (waste + susut)</span>
          <span class="total-value total-value--accent">{{ formatRupiah(detail.total_variance_value) }}</span>
        </div>
      </div>

      <p v-if="!hasBaseline" class="hint">
        Ini opname pertama (belum ada baseline). Konsumsi periode akan terhitung mulai opname berikutnya.
      </p>

      <!-- Period sales → theoretical usage (only meaningful once a baseline exists) -->
      <StockOpnameSalesForm v-if="hasBaseline" :stock-count-id="id" @saved="refresh" />

      <!-- Count entry / report grouped by category -->
      <div v-for="group in groups" :key="group.category" class="cat-group">
        <h2 class="cat-title">{{ group.category }}</h2>
        <div class="rows">
          <div v-for="item in group.items" :key="item.id" class="row">
            <div class="row-main">
              <span class="row-name">{{ item.ingredient_name }}</span>
              <span class="row-ref">
                <template v-if="hasBaseline">
                  awal {{ fmtQty(item.opening_qty) }} · beli {{ fmtQty(item.purchased_qty) }} {{ item.base_unit }}
                </template>
                <template v-else>{{ formatRupiah(item.unit_cost_snapshot) }} / {{ item.base_unit }}</template>
              </span>
            </div>

            <!-- Draft: editable physical count -->
            <div v-if="detail.status === 'draft'" class="row-input">
              <input
                v-model.number="counts[item.id]"
                type="number"
                min="0"
                step="any"
                class="qty-field"
                :aria-label="`Stok fisik ${item.ingredient_name}`"
              />
              <span class="qty-unit">{{ item.base_unit }}</span>
            </div>

            <!-- Finalized: read-only count + consumption (+ variance when sales entered) -->
            <div v-else class="row-report">
              <span class="rep-counted">{{ fmtQty(item.counted_qty) }} {{ item.base_unit }}</span>
              <span v-if="item.variance_value !== null" class="rep-variance" :class="{ 'rep-variance--bad': (item.variance_qty ?? 0) > 0 }">
                selisih {{ fmtQty(item.variance_qty) }} {{ item.base_unit }} · {{ formatRupiah(item.variance_value) }}
              </span>
              <span v-if="item.variance_value !== null" class="rep-detail">
                nyata {{ fmtQty(item.consumed_qty) }} − teoretis {{ fmtQty(item.theoretical_qty) }}
              </span>
              <span v-else-if="item.consumed_value !== null" class="rep-consumed" :class="{ 'rep-consumed--neg': (item.consumed_qty ?? 0) < 0 }">
                pakai {{ fmtQty(item.consumed_qty) }} {{ item.base_unit }} · {{ formatRupiah(item.consumed_value) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </template>

    <UiConfirmDialog
      :open="confirmDelete"
      title="Hapus sesi opname?"
      message="Sesi draft ini akan dihapus permanen."
      confirm-label="Hapus"
      danger
      :loading="deleting"
      @confirm="doDelete"
      @cancel="confirmDelete = false"
    />
  </div>
</template>

<script setup lang="ts">
import {
  IconChevronLeft, IconLoader2, IconDeviceFloppy, IconCheck, IconTrash,
} from '@tabler/icons-vue'
import { useToast } from 'vue-toastification'
import { useStockCountApi } from '~/api/stock-count-api'
import type { StockCountLine } from '~/types/stock-count'

const route = useRoute()
const toast = useToast()
const { formatRupiah } = useFormatRupiah()
const api = useStockCountApi()
const id = route.params.id as string

const { data, pending, refresh } = await useAsyncData(`stock-count-${id}`, () => api.get(id))
const detail = computed(() => data.value?.data ?? null)

// Local editable physical counts keyed by item id
const counts = reactive<Record<string, number>>({})
watch(detail, (d) => {
  if (!d) return
  for (const it of d.items) counts[it.id] = it.counted_qty
}, { immediate: true })

const hasBaseline = computed(() => detail.value?.items.some((i) => i.opening_qty !== null) ?? false)

// Live on-hand value reflects the in-progress counts (display aid; server is source of truth)
const onHandValue = computed(() => {
  const d = detail.value
  if (!d) return 0
  return d.items.reduce((sum, it) => sum + (counts[it.id] ?? 0) * it.unit_cost_snapshot, 0)
})

interface Group { category: string; items: StockCountLine[] }
const groups = computed<Group[]>(() => {
  const d = detail.value
  if (!d) return []
  const map = new Map<string, StockCountLine[]>()
  for (const it of d.items) {
    const key = it.category_name ?? 'Lainnya'
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(it)
  }
  return [...map.entries()].map(([category, items]) => ({ category, items }))
})

const dateFmt = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
function formatDate(d: string): string {
  return dateFmt.format(new Date(d))
}
function fmtQty(q: number | null): string {
  if (q === null) return '—'
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(q)
}

const saving = ref(false)
async function save(): Promise<boolean> {
  saving.value = true
  try {
    const items = (detail.value?.items ?? []).map((it) => ({
      item_id: it.id,
      counted_qty: Number(counts[it.id] ?? 0),
    }))
    await api.saveItems(id, { items })
    toast.success('Hitungan disimpan')
    return true
  } catch {
    toast.error('Gagal menyimpan')
    return false
  } finally {
    saving.value = false
  }
}

const finalizing = ref(false)
async function finalize() {
  if (!(await save())) return
  finalizing.value = true
  try {
    await api.finalize(id)
    toast.success('Opname difinalisasi')
    await refresh()
  } catch {
    toast.error('Gagal finalisasi')
  } finally {
    finalizing.value = false
  }
}

const confirmDelete = ref(false)
const deleting = ref(false)
async function doDelete() {
  deleting.value = true
  try {
    await api.remove(id)
    toast.success('Sesi dihapus')
    await navigateTo('/stock-opname')
  } catch {
    toast.error('Gagal menghapus')
    deleting.value = false
    confirmDelete.value = false
  }
}
</script>

<style scoped>
.opname-detail {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 720px;
  padding-top: 0.5rem;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: var(--color-text-subtle);
  text-decoration: none;
  width: fit-content;
}

.back-link:hover {
  color: var(--color-text);
}

.head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.page-heading {
  font-size: 20px;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 6px;
}

.head-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 14px;
  border-radius: var(--radius-sm);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
  transition: opacity 0.15s, background 0.15s;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn--primary {
  background: var(--color-text);
  color: #ffffff;
}

.btn--ghost {
  background: transparent;
  color: var(--color-text);
  border-color: var(--color-border);
}

.btn--danger-ghost {
  background: transparent;
  color: var(--color-text-subtle);
  border-color: var(--color-border);
  padding: 9px 11px;
}

.btn--danger-ghost:hover:not(:disabled) {
  color: var(--color-danger);
}

.totals {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.total-card {
  flex: 1 1 200px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 14px;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.total-label {
  font-size: 12px;
  color: var(--color-text-subtle);
}

.total-value {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-text);
}

.total-value--accent {
  color: var(--color-danger, #b91c1c);
}

.hint {
  font-size: 13px;
  color: var(--color-text-subtle);
  background: var(--color-bg-subtle);
  padding: 10px 12px;
  border-radius: var(--radius-sm);
}

.cat-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.cat-title {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-subtle);
  padding-top: 6px;
}

.rows {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 0 12px;
}

.row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 4px;
  border-bottom: 1px solid var(--color-border);
}

.row:last-child {
  border-bottom: none;
}

.row-main {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.row-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
}

.row-ref {
  font-size: 12px;
  color: var(--color-text-subtle);
}

.row-input {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.qty-field {
  width: 90px;
  padding: 8px 10px;
  font-size: 14px;
  text-align: right;
  color: var(--color-text);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  outline: none;
}

.qty-field:focus {
  border-color: var(--color-text);
}

.qty-unit {
  font-size: 12px;
  color: var(--color-text-subtle);
  width: 28px;
}

.row-report {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  flex-shrink: 0;
}

.rep-counted {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
}

.rep-consumed {
  font-size: 12px;
  color: var(--color-text-subtle);
}

.rep-consumed--neg {
  color: var(--color-danger, #b91c1c);
}

.rep-variance {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-success, #166534);
}

.rep-variance--bad {
  color: var(--color-danger, #b91c1c);
}

.rep-detail {
  font-size: 11px;
  color: var(--color-text-subtle);
}

.skeleton-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.skeleton-item {
  height: 48px;
  background: var(--color-bg-subtle);
  border-radius: var(--radius-sm);
  animation: pulse 1.5s ease-in-out infinite;
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

.spin {
  animation: spin 0.8s linear infinite;
}
</style>
