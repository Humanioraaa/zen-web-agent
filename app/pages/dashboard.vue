<template>
  <div class="dashboard">

    <!-- Total balance -->
    <section class="total-balance-section">
      <span class="total-label">Total Saldo</span>
      <span class="total-amount">{{ formatRupiah(totalBalance) }}</span>
    </section>

    <!-- Wallet cards -->
    <section class="section">
      <h2 class="section-title">Wallet</h2>
      <div v-if="walletsPending" class="skeleton-row">
        <div v-for="n in 4" :key="n" class="skeleton-card" />
      </div>
      <div v-else class="wallet-scroll">
        <DashboardWalletCard
          v-for="wallet in wallets"
          :key="wallet.id"
          :wallet="wallet"
        />
      </div>
    </section>

    <!-- Today summary -->
    <section class="section">
      <h2 class="section-title">Hari Ini</h2>
      <div v-if="summaryPending" class="skeleton-block" />
      <DashboardTodaySummary
        v-else
        :income="summary?.income ?? 0"
        :expense="summary?.expense ?? 0"
      />
    </section>

    <!-- Recent transactions -->
    <section class="section">
      <div class="section-header">
        <h2 class="section-title">Transaksi Terbaru</h2>
        <NuxtLink to="/transactions" class="section-link">Lihat semua</NuxtLink>
      </div>

      <div v-if="recentPending" class="skeleton-list">
        <div v-for="n in 5" :key="n" class="skeleton-row-item" />
      </div>

      <div v-else-if="recentTransactions.length === 0" class="empty-state">
        Belum ada transaksi.
      </div>

      <div v-else class="recent-list">
        <DashboardTransactionRow
          v-for="transaction in recentTransactions"
          :key="transaction.id"
          :transaction="transaction"
        />
      </div>
    </section>

  </div>
</template>

<script setup lang="ts">
import type { Wallet, TransactionRecord } from '~/types/models'

const { formatRupiah } = useFormatRupiah()

const { data: walletsData, pending: walletsPending } = await useFetch<{ data: Wallet[] }>('/api/wallets')
const { data: summaryData, pending: summaryPending } = await useFetch<{ data: { income: number; expense: number } }>('/api/transactions/summary')
const { data: recentData, pending: recentPending } = await useFetch<{ data: TransactionRecord[] }>('/api/transactions/recent')

const wallets = computed(() => walletsData.value?.data ?? [])
const summary = computed(() => summaryData.value?.data ?? null)
const recentTransactions = computed(() => recentData.value?.data ?? [])

const totalBalance = computed(() =>
  wallets.value.reduce((sum, w) => sum + w.balance, 0),
)
</script>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-width: 640px;
}

.total-balance-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 1.25rem 0 0.5rem;
}

.total-label {
  font-size: 13px;
  color: var(--color-text-subtle);
  font-weight: 500;
}

.total-amount {
  font-size: 32px;
  font-weight: 800;
  color: var(--color-text);
  letter-spacing: -0.5px;
}

.section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text);
}

.section-link {
  font-size: 13px;
  color: var(--color-text-subtle);
  text-decoration: none;
}

.section-link:hover {
  color: var(--color-text);
}

.wallet-scroll {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding-bottom: 4px;
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.wallet-scroll::-webkit-scrollbar {
  display: none;
}

.recent-list {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 0 16px;
}

.empty-state {
  font-size: 14px;
  color: var(--color-text-subtle);
  padding: 2rem 0;
  text-align: center;
}

/* Skeletons */
.skeleton-row {
  display: flex;
  gap: 10px;
}

.skeleton-card {
  min-width: 140px;
  height: 76px;
  background: var(--color-bg-subtle);
  border-radius: var(--radius-md);
  animation: pulse 1.5s ease-in-out infinite;
}

.skeleton-block {
  height: 68px;
  background: var(--color-bg-subtle);
  border-radius: var(--radius-md);
  animation: pulse 1.5s ease-in-out infinite;
}

.skeleton-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.skeleton-row-item {
  height: 44px;
  background: var(--color-bg-subtle);
  border-radius: var(--radius-sm);
  animation: pulse 1.5s ease-in-out infinite;
}

</style>
