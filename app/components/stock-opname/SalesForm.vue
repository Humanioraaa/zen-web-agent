<template>
  <section class="sales-section">
    <button type="button" class="sales-head" @click="open = !open">
      <div class="sales-head-text">
        <span class="sales-title">Penjualan Periode</span>
        <span class="sales-sub">Jumlah terjual per menu → hitung pemakaian teoretis</span>
      </div>
      <component :is="open ? IconChevronUp : IconChevronDown" :size="18" />
    </button>

    <div v-if="open" class="sales-body">
      <div v-if="pending" class="skeleton-list">
        <div v-for="n in 4" :key="n" class="skeleton-item" />
      </div>

      <template v-else>
        <div class="import-bar">
          <input
            ref="fileInput"
            type="file"
            accept=".json,application/json"
            multiple
            class="file-hidden"
            @change="onFiles"
          />
          <button type="button" class="import-btn" :disabled="importing" @click="fileInput?.click()">
            <IconFileImport :size="16" />
            <span>{{ importing ? 'Mengimpor…' : 'Import Kasir Pintar' }}</span>
          </button>
          <span class="import-hint">upload file .json export penjualan (boleh beberapa hari)</span>
        </div>

        <div v-if="fuzzyLines.length" class="note note-info">
          <strong>ℹ️ Perkiraan otomatis — cek angkanya:</strong>
          <ul>
            <li v-for="f in fuzzyLines" :key="f.menu_id">{{ f.kp_name }} → {{ f.menu_name }} ({{ f.qty_sold }})</li>
          </ul>
        </div>

        <div v-if="unmatched.length" class="note note-warn">
          <strong>⚠️ {{ unmatched.length }} item KP tak cocok (diabaikan):</strong>
          <ul>
            <li v-for="u in unmatched" :key="u.kp_name">
              {{ u.kp_name }} ({{ u.qty_sold }})<template v-if="u.suggestions.length"> — mirip: {{ u.suggestions.map((s) => s.menu_name).join(', ') }}</template>
            </li>
          </ul>
        </div>

        <div v-for="group in groups" :key="group.category" class="cat-group">
          <h3 class="cat-title">{{ group.category }}</h3>
          <div class="rows">
            <div v-for="m in group.items" :key="m.menu_id" class="row">
              <span class="row-name">{{ m.menu_name }}</span>
              <div class="row-input">
                <input
                  v-model.number="qty[m.menu_id]"
                  type="number"
                  min="0"
                  step="1"
                  class="qty-field"
                  :aria-label="`Terjual ${m.menu_name}`"
                />
                <span class="qty-unit">cup</span>
              </div>
            </div>
          </div>
        </div>

        <button type="button" class="save-btn" :disabled="saving" @click="save">
          <IconLoader2 v-if="saving" :size="16" class="spin" /><IconDeviceFloppy v-else :size="16" />
          <span>Simpan Penjualan</span>
        </button>
      </template>
    </div>
  </section>
</template>

<script setup lang="ts">
import {
  IconChevronDown, IconChevronUp, IconDeviceFloppy, IconLoader2, IconFileImport,
} from '@tabler/icons-vue'
import { useToast } from 'vue-toastification'
import { useStockCountApi } from '~/api/stock-count-api'
import type {
  PeriodSaleLine,
  SalesImportMatchedLine,
  SalesImportUnmatchedLine,
} from '~/types/stock-count'

const props = defineProps<{ stockCountId: string }>()
const emit = defineEmits<{ saved: [] }>()

const toast = useToast()
const api = useStockCountApi()
const open = ref(false)

const { data, pending } = await useAsyncData(
  `period-sales-${props.stockCountId}`,
  () => api.getSales(props.stockCountId),
)
const lines = computed(() => data.value?.data ?? [])

const qty = reactive<Record<string, number>>({})
watch(lines, (ls) => {
  for (const l of ls) qty[l.menu_id] = l.qty_sold
}, { immediate: true })

interface Group { category: string; items: PeriodSaleLine[] }
const groups = computed<Group[]>(() => {
  const map = new Map<string, PeriodSaleLine[]>()
  for (const l of lines.value) {
    const key = l.category_name ?? 'Lainnya'
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(l)
  }
  return [...map.entries()].map(([category, items]) => ({ category, items }))
})

// --- Fase 4: Kasir Pintar sales import (prefill qty from an uploaded KP export) ---
const fileInput = ref<HTMLInputElement | null>(null)
const importing = ref(false)
const unmatched = ref<SalesImportUnmatchedLine[]>([])
const fuzzyLines = ref<SalesImportMatchedLine[]>([])

async function onFiles(e: Event) {
  const input = e.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  if (!files.length) return
  importing.value = true
  try {
    const texts = await Promise.all(files.map((f) => f.text()))
    const { data: preview } = await api.importSales(props.stockCountId, texts)
    // Import is authoritative for the period → overwrite qty for matched menus.
    for (const m of preview.matched) qty[m.menu_id] = m.qty_sold
    fuzzyLines.value = preview.matched.filter((m) => m.confidence === 'fuzzy')
    unmatched.value = preview.unmatched
    const fuzzy = fuzzyLines.value.length
    toast.success(
      `Impor: ${preview.matched.length} cocok${fuzzy ? ` (${fuzzy} perkiraan)` : ''}, ${preview.unmatched.length} diabaikan. Cek lalu Simpan.`,
    )
  } catch (err) {
    const msg = (err as { data?: { message?: string } })?.data?.message ?? 'Gagal mengimpor file'
    toast.error(msg)
  } finally {
    importing.value = false
    input.value = '' // let the same file be re-selected
  }
}

const saving = ref(false)
async function save() {
  saving.value = true
  try {
    const items = lines.value.map((l) => ({ menu_id: l.menu_id, qty_sold: Number(qty[l.menu_id] ?? 0) }))
    await api.saveSales(props.stockCountId, { items })
    toast.success('Penjualan disimpan')
    emit('saved')
  } catch {
    toast.error('Gagal menyimpan penjualan')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.sales-section {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.sales-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 14px 16px;
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--color-text);
}

.sales-head-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  text-align: left;
}

.sales-title {
  font-size: 14px;
  font-weight: 700;
}

.sales-sub {
  font-size: 12px;
  color: var(--color-text-subtle);
}

.sales-body {
  padding: 0 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.import-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  padding-top: 6px;
}

.file-hidden {
  display: none;
}

.import-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: var(--color-bg-subtle);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.import-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.import-hint {
  font-size: 11px;
  color: var(--color-text-subtle);
}

.note {
  font-size: 12px;
  border-radius: var(--radius-sm);
  padding: 8px 10px;
  line-height: 1.5;
}

.note ul {
  margin: 4px 0 0;
  padding-left: 18px;
}

.note-info {
  background: color-mix(in srgb, var(--color-info, #2563eb) 8%, transparent);
  border: 1px solid color-mix(in srgb, var(--color-info, #2563eb) 30%, transparent);
}

.note-warn {
  background: color-mix(in srgb, var(--color-warning, #d97706) 8%, transparent);
  border: 1px solid color-mix(in srgb, var(--color-warning, #d97706) 30%, transparent);
}

.cat-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.cat-title {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-subtle);
  padding-top: 6px;
}

.rows {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 0 10px;
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 2px;
  border-bottom: 1px solid var(--color-border);
}

.row:last-child {
  border-bottom: none;
}

.row-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text);
}

.row-input {
  display: flex;
  align-items: center;
  gap: 6px;
}

.qty-field {
  width: 72px;
  padding: 7px 9px;
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
  width: 26px;
}

.save-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  align-self: flex-start;
  padding: 9px 16px;
  background: var(--color-text);
  color: #ffffff;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.save-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.skeleton-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 8px;
}

.skeleton-item {
  height: 40px;
  background: var(--color-bg-subtle);
  border-radius: var(--radius-sm);
  animation: pulse 1.5s ease-in-out infinite;
}

.spin {
  animation: spin 0.8s linear infinite;
}
</style>
