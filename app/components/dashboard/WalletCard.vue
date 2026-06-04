<template>
  <NuxtLink :to="`/transactions?wallet_id=${wallet.id}`" class="wallet-card">
    <span class="wallet-name">{{ wallet.name }}</span>
    <span class="wallet-balance">{{ formatRupiah(wallet.balance) }}</span>
  </NuxtLink>
</template>

<script setup lang="ts">
const { formatRupiah } = useFormatRupiah()

defineProps<{
  wallet: {
    id: string
    name: string
    balance: number
  }
}>()
</script>

<style scoped>
.wallet-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 16px;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  text-decoration: none;
  color: var(--color-text);
  min-width: 140px;
  flex-shrink: 0;
  transition: border-color 0.15s;
}

.wallet-card:hover {
  border-color: var(--color-text-subtle);
}

.wallet-name {
  font-size: 13px;
  color: var(--color-text-subtle);
  font-weight: 500;
}

.wallet-balance {
  font-size: 18px;
  font-weight: 700;
}
</style>
