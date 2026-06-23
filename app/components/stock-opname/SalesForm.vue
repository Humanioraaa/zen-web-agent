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
  IconChevronDown, IconChevronUp, IconDeviceFloppy, IconLoader2,
} from '@tabler/icons-vue'
import { useToast } from 'vue-toastification'
import { useStockCountApi } from '~/api/stock-count-api'
import type { PeriodSaleLine } from '~/types/stock-count'

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
