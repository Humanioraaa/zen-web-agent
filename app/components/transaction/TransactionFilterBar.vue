<template>
  <div class="filter-bar">
    <!-- Type tabs -->
    <div class="type-tabs">
      <button
        v-for="t in typeOptions"
        :key="t.value"
        type="button"
        :class="['type-tab', { 'type-tab--active': model.type === t.value }]"
        @click="model.type = t.value"
      >
        {{ t.label }}
      </button>
    </div>

    <!-- Search -->
    <div class="search-wrapper">
      <IconSearch :size="16" class="search-icon" />
      <input
        v-model="model.search"
        type="text"
        class="search-input"
        placeholder="Cari catatan..."
      />
    </div>

    <!-- Dropdown + date filters -->
    <div class="filter-grid">
      <select v-model="model.wallet_id" class="filter-select">
        <option value="">Semua wallet</option>
        <option v-for="w in wallets" :key="w.id" :value="w.id">{{ w.name }}</option>
      </select>

      <select v-model="model.category_id" class="filter-select">
        <option value="">Semua kategori</option>
        <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
      </select>

      <input v-model="model.date_from" type="date" class="filter-select" aria-label="Dari tanggal" />
      <input v-model="model.date_to" type="date" class="filter-select" aria-label="Sampai tanggal" />
    </div>

    <button v-if="hasActiveFilter" type="button" class="reset-btn" @click="reset">
      <IconX :size="14" /> Reset filter
    </button>
  </div>
</template>

<script setup lang="ts">
import { IconSearch, IconX } from '@tabler/icons-vue'

interface Filters {
  type: string
  wallet_id: string
  category_id: string
  date_from: string
  date_to: string
  search: string
}

const model = defineModel<Filters>({ required: true })

defineProps<{
  wallets: { id: string; name: string }[]
  categories: { id: string; name: string; type: string }[]
}>()

const typeOptions = [
  { value: '', label: 'Semua' },
  { value: 'expense', label: 'Pengeluaran' },
  { value: 'income', label: 'Pemasukan' },
  { value: 'transfer', label: 'Transfer' },
]

const hasActiveFilter = computed(
  () =>
    !!model.value.type ||
    !!model.value.wallet_id ||
    !!model.value.category_id ||
    !!model.value.date_from ||
    !!model.value.date_to ||
    !!model.value.search,
)

function reset() {
  model.value.type = ''
  model.value.wallet_id = ''
  model.value.category_id = ''
  model.value.date_from = ''
  model.value.date_to = ''
  model.value.search = ''
}
</script>

<style scoped>
.filter-bar {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.type-tabs {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.type-tabs::-webkit-scrollbar {
  display: none;
}

.type-tab {
  flex-shrink: 0;
  padding: 7px 14px;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 999px;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-subtle);
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}

.type-tab--active {
  background: var(--color-text);
  border-color: var(--color-text);
  color: #ffffff;
}

.search-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 12px;
  color: var(--color-text-subtle);
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 10px 12px 10px 34px;
  font-size: 14px;
  color: var(--color-text);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  outline: none;
  transition: border-color 0.15s;
}

.search-input:focus {
  border-color: var(--color-text);
}

.filter-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.filter-select {
  width: 100%;
  padding: 9px 10px;
  font-size: 13px;
  color: var(--color-text);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  outline: none;
  transition: border-color 0.15s;
}

.filter-select:focus {
  border-color: var(--color-text);
}

.reset-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  align-self: flex-start;
  padding: 4px 2px;
  background: transparent;
  border: none;
  font-size: 13px;
  color: var(--color-text-subtle);
  cursor: pointer;
}

.reset-btn:hover {
  color: var(--color-text);
}

@media (min-width: 640px) {
  .filter-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}
</style>
