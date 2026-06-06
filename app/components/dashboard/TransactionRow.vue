<template>
  <div class="transaction-row">
    <div class="transaction-info">
      <span class="transaction-label">{{ label }}</span>
      <span class="transaction-meta">{{ transaction.category?.name ?? '—' }} · {{ transaction.wallet?.name }}</span>
    </div>
    <div class="transaction-right">
      <span :class="['transaction-amount', `transaction-amount--${transaction.type}`]">
        {{ amountPrefix }}{{ formatRupiah(transaction.amount) }}
      </span>
      <span class="transaction-time">{{ formattedTime }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
const { formatRupiah } = useFormatRupiah()

const props = defineProps<{
  transaction: {
    id: string
    type: 'income' | 'expense' | 'transfer'
    amount: number
    note: string | null
    created_at: string
    wallet: { id: string; name: string } | null
    wallet_to: { id: string; name: string } | null
    category: { id: string; name: string; type: string } | null
  }
}>()

const label = computed(() => {
  if (props.transaction.note) return props.transaction.note
  if (props.transaction.type === 'transfer') {
    return `Transfer → ${props.transaction.wallet_to?.name ?? '—'}`
  }
  return props.transaction.category?.name ?? '—'
})

const amountPrefix = computed(() => {
  if (props.transaction.type === 'income') return '+'
  if (props.transaction.type === 'expense') return '-'
  return ''
})

const formattedTime = computed(() => {
  return new Date(props.transaction.created_at).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  })
})
</script>

<style scoped>
.transaction-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid var(--color-border);
}

.transaction-row:last-child {
  border-bottom: none;
}

.transaction-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.transaction-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.transaction-meta {
  font-size: 12px;
  color: var(--color-text-subtle);
}

.transaction-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 3px;
  flex-shrink: 0;
}

.transaction-amount {
  font-size: 14px;
  font-weight: 600;
}

.transaction-amount--income  { color: var(--color-success); }
.transaction-amount--expense { color: var(--color-danger); }
.transaction-amount--transfer { color: var(--color-info); }

.transaction-time {
  font-size: 11px;
  color: var(--color-text-subtle);
}
</style>
