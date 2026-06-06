<template>
  <div class="today-summary">
    <div class="summary-item summary-item--income">
      <span class="summary-label">Pemasukan</span>
      <span class="summary-amount">{{ formatRupiah(income) }}</span>
    </div>
    <div class="summary-divider" />
    <div class="summary-item summary-item--expense">
      <span class="summary-label">Pengeluaran</span>
      <span class="summary-amount">{{ formatRupiah(expense) }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
const { formatRupiah } = useFormatRupiah()

defineProps<{
  income: number
  expense: number
}>()
</script>

<style scoped>
.today-summary {
  display: flex;
  align-items: center;
  gap: 0;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.summary-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 14px 16px;
}

.summary-divider {
  width: 1px;
  height: 40px;
  background: var(--color-border);
}

.summary-label {
  font-size: 12px;
  color: var(--color-text-subtle);
  font-weight: 500;
}

.summary-amount {
  font-size: 16px;
  font-weight: 700;
}

.summary-item--income .summary-amount {
  color: var(--color-success);
}

.summary-item--expense .summary-amount {
  color: var(--color-danger);
}
</style>
