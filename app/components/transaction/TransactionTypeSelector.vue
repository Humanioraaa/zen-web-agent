<template>
  <div class="type-selector">
    <button
      v-for="opt in options"
      :key="opt.value"
      type="button"
      :class="['type-btn', `type-btn--${opt.value}`, { 'type-btn--active': model === opt.value }]"
      :disabled="disabled"
      @click="model = opt.value"
    >
      <component :is="opt.icon" :size="18" stroke-width="2" />
      <span>{{ opt.label }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { IconShoppingCart, IconCash, IconArrowsExchange } from '@tabler/icons-vue'

type TxType = 'expense' | 'income' | 'transfer'

const model = defineModel<TxType>({ required: true })
defineProps<{ disabled?: boolean }>()

const options = [
  { value: 'expense', label: 'Pengeluaran', icon: IconShoppingCart },
  { value: 'income', label: 'Pemasukan', icon: IconCash },
  { value: 'transfer', label: 'Transfer', icon: IconArrowsExchange },
] as const
</script>

<style scoped>
.type-selector {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.type-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 14px 8px;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-subtle);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s, background 0.15s;
}

.type-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.type-btn--active {
  border-color: var(--color-text);
  color: var(--color-text);
  background: var(--color-bg-subtle);
}

.type-btn--expense.type-btn--active {
  border-color: #dc2626;
  color: #dc2626;
}

.type-btn--income.type-btn--active {
  border-color: #16a34a;
  color: #16a34a;
}

.type-btn--transfer.type-btn--active {
  border-color: #2563eb;
  color: #2563eb;
}
</style>
