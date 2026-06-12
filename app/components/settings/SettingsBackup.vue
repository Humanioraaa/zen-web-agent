<template>
  <section class="card">
    <h2 class="card-title">Backup Data</h2>
    <p class="field-hint">
      Unduh seluruh riwayat transaksi sebagai file CSV (dapat dibuka di Excel
      atau Google Sheets).
    </p>
    <button
      type="button"
      class="btn btn--primary backup-btn"
      :disabled="exporting"
      @click="exportTransactions"
    >
      <IconLoader2 v-if="exporting" :size="16" class="spin" />
      <IconDownload v-else :size="16" />
      <span>Export Semua Transaksi</span>
    </button>
  </section>
</template>

<script setup lang="ts">
import { IconLoader2, IconDownload } from '@tabler/icons-vue'
import { useToast } from 'vue-toastification'

interface ExportTransaction {
  date: string
  type: string
  amount: number
  note: string | null
  source: string
  created_at: string
  wallet: { name: string } | null
  wallet_to: { name: string } | null
  category: { name: string } | null
  created_by: { name: string } | null
}

const toast = useToast()
const exporting = ref(false)

const CSV_HEADERS = [
  'date',
  'type',
  'amount',
  'wallet',
  'wallet_to',
  'category',
  'note',
  'source',
  'created_by',
  'created_at',
]

function csvCell(value: unknown): string {
  const s = value === null || value === undefined ? '' : String(value)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

async function exportTransactions() {
  exporting.value = true
  try {
    const res = await $fetch<{ data: ExportTransaction[] }>('/api/transactions', {
      query: { limit: 9999, offset: 0 },
    })
    const rows = (res.data ?? []).map((t) => [
      t.date,
      t.type,
      t.amount,
      t.wallet?.name ?? '',
      t.wallet_to?.name ?? '',
      t.category?.name ?? '',
      t.note ?? '',
      t.source,
      t.created_by?.name ?? '',
      t.created_at,
    ])

    const csv = [CSV_HEADERS, ...rows]
      .map((row) => row.map(csvCell).join(','))
      .join('\r\n')

    const today = new Date().toISOString().slice(0, 10)
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `zen-coffee-transactions-${today}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  } catch {
    toast.error('Gagal mengekspor transaksi')
  } finally {
    exporting.value = false
  }
}
</script>

<style scoped>
.card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 16px;
}

.card-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--color-text);
}

.field-hint {
  font-size: 12px;
  color: var(--color-text-subtle);
  line-height: 1.5;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 16px;
  border-radius: var(--radius-sm);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
  flex-shrink: 0;
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

.backup-btn {
  align-self: flex-start;
}
</style>
