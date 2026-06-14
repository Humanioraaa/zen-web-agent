<template>
  <div class="history">
    <h2 class="section-title">Riwayat Harga</h2>

    <div v-if="history.length === 0" class="empty-mini">Belum ada riwayat harga.</div>

    <ul v-else class="history-list">
      <li v-for="point in history" :key="point.id" class="history-row">
        <div class="history-main">
          <span class="history-cost">{{ formatRupiah(point.package_cost) }} / kemasan</span>
          <span class="history-meta">
            {{ formatDate(point.created_at) }} · {{ sourceLabel(point.source) }}
          </span>
        </div>
        <span v-if="point.pct_change !== null" class="history-change" :class="changeClass(point.pct_change)">
          {{ point.pct_change > 0 ? '+' : '' }}{{ point.pct_change }}%
        </span>
        <span v-else class="history-change history-change--base">baseline</span>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import type { PriceHistoryPoint, PriceSource } from '~/types/restock'

defineProps<{ history: PriceHistoryPoint[] }>()

const { formatRupiah } = useFormatRupiah()

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

function sourceLabel(source: PriceSource): string {
  return source === 'restock' ? 'restock' : source === 'manual' ? 'manual' : 'awal'
}

function changeClass(pct: number): string {
  if (pct > 0) return 'history-change--up'
  if (pct < 0) return 'history-change--down'
  return ''
}
</script>

<style scoped>
.history {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.section-title {
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  color: var(--color-text-subtle);
}

.history-list {
  list-style: none;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 0 12px;
}

.history-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 4px;
  border-bottom: 1px solid var(--color-border);
}

.history-row:last-child {
  border-bottom: none;
}

.history-main {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.history-cost {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
}

.history-meta {
  font-size: 12px;
  color: var(--color-text-subtle);
}

.history-change {
  font-size: 13px;
  font-weight: 600;
  flex-shrink: 0;
}

.history-change--up {
  color: var(--color-danger);
}

.history-change--down {
  color: var(--color-success);
}

.history-change--base {
  color: var(--color-text-subtle);
  font-weight: 500;
}

.empty-mini {
  font-size: 13px;
  color: var(--color-text-subtle);
  padding: 1rem;
  text-align: center;
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-sm);
}
</style>
