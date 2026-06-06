<template>
  <div class="settings-page">
    <h1 class="page-heading">Settings</h1>

    <!-- Akun Saya -->
    <section class="card">
      <h2 class="card-title">Akun Saya</h2>

      <div v-if="mePending" class="skeleton-block" />
      <template v-else-if="me">
        <div class="field">
          <span class="field-label">Nama</span>
          <span class="field-value">{{ me.name }}</span>
        </div>
        <div class="field">
          <span class="field-label">Email</span>
          <span class="field-value">{{ me.email }}</span>
        </div>

        <div class="field field--stack">
          <label class="field-label" for="tg-id">Telegram User ID</label>
          <p class="field-hint">
            ID numerik Telegram untuk input transaksi via bot. Kirim
            <code>/start</code> ke bot lalu salin ID yang dibalas.
          </p>
          <div class="inline-edit">
            <input
              id="tg-id"
              v-model="telegramInput"
              type="text"
              inputmode="numeric"
              class="text-input"
              placeholder="cth. 123456789"
              :disabled="savingProfile"
            />
            <button
              type="button"
              class="btn btn--primary"
              :disabled="savingProfile || !profileDirty"
              @click="saveProfile"
            >
              <IconLoader2 v-if="savingProfile" :size="16" class="spin" />
              <span>Simpan</span>
            </button>
          </div>
        </div>
      </template>
    </section>

    <!-- Tim -->
    <section class="card">
      <h2 class="card-title">Tim</h2>
      <div v-if="usersPending" class="skeleton-block" />
      <ul v-else class="team-list">
        <li v-for="u in users" :key="u.id" class="team-row">
          <span class="team-name">
            {{ u.name }}
            <span v-if="u.id === me?.id" class="badge">kamu</span>
          </span>
          <span :class="['tg-status', u.telegram_user_id ? 'tg-status--on' : 'tg-status--off']">
            <IconBrandTelegram :size="14" />
            {{ u.telegram_user_id ? 'Tersambung' : 'Belum' }}
          </span>
        </li>
      </ul>
    </section>

    <!-- Dompet -->
    <section class="card">
      <h2 class="card-title">Dompet</h2>
      <p class="field-hint">
        Ubah nama, saldo, atau nonaktifkan dompet. Saldo di sini menimpa nilai
        saat ini — gunakan dengan hati-hati.
      </p>

      <div v-if="walletsPending" class="skeleton-block" />
      <ul v-else class="wallet-list">
        <li v-for="w in wallets" :key="w.id" class="wallet-row">
          <input
            v-model="w.name"
            type="text"
            class="text-input wallet-name"
            :disabled="w.saving"
            aria-label="Nama dompet"
          />
          <TransactionAmountInput v-model="w.balance" :disabled="w.saving" />
          <div class="wallet-row-bottom">
            <label class="switch">
              <input v-model="w.is_active" type="checkbox" :disabled="w.saving" />
              <span>Aktif</span>
            </label>
            <button
              type="button"
              class="btn btn--primary"
              :disabled="w.saving || !walletDirty(w)"
              @click="saveWallet(w)"
            >
              <IconLoader2 v-if="w.saving" :size="16" class="spin" />
              <span>Simpan</span>
            </button>
          </div>
        </li>
      </ul>
    </section>

    <!-- Bot Settings -->
    <section class="card">
      <h2 class="card-title">Bot Settings</h2>
      <ul class="info-list">
        <li class="info-item">
          PIN threshold: Transaksi di atas Rp500.000 memerlukan konfirmasi PIN
        </li>
        <li class="info-item">Reminder harian: Aktif pukul 18:00 WIB</li>
        <li class="info-item">
          Untuk mengubah konfigurasi bot, edit file .env lalu redeploy.
        </li>
      </ul>
    </section>

    <!-- Backup Data -->
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

    <!-- Keluar -->
    <section class="card">
      <button type="button" class="btn btn--danger-outline" @click="logout">
        <IconLogout :size="18" />
        <span>Keluar</span>
      </button>
    </section>
  </div>
</template>

<script setup lang="ts">
import {
  IconLoader2,
  IconLogout,
  IconBrandTelegram,
  IconDownload,
} from '@tabler/icons-vue'
import { useToast } from 'vue-toastification'
import type { UserProfile } from '~/composables/useCurrentUser'
import type { Wallet } from '~/types/models'

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

interface WalletEdit extends Wallet {
  saving: boolean
  _orig: { name: string; balance: number; is_active: boolean }
}

const toast = useToast()
const { logout } = useLogout()

// --- Akun Saya ---
const { data: meData, pending: mePending, refresh: refreshMe } = await useFetch<{ data: UserProfile }>('/api/auth/me')
const me = computed(() => meData.value?.data ?? null)

const telegramInput = ref('')
watchEffect(() => {
  telegramInput.value = me.value?.telegram_user_id ?? ''
})

const savingProfile = ref(false)
const profileDirty = computed(
  () => telegramInput.value.trim() !== (me.value?.telegram_user_id ?? ''),
)

async function saveProfile() {
  if (!me.value || !profileDirty.value) return
  savingProfile.value = true
  try {
    await $fetch(`/api/users/${me.value.id}`, {
      method: 'PATCH',
      body: { telegram_user_id: telegramInput.value.trim() || null },
    })
    toast.success('Profil diperbarui')
    await Promise.all([refreshUsers(), refreshMe()])
  } catch {
    toast.error('Gagal memperbarui profil')
  } finally {
    savingProfile.value = false
  }
}

// --- Tim ---
const { data: usersData, pending: usersPending, refresh: refreshUsers } =
  await useFetch<{ data: UserProfile[] }>('/api/users')
const users = computed(() => usersData.value?.data ?? [])

// --- Dompet ---
const { data: walletsData, pending: walletsPending } = await useFetch<{ data: Wallet[] }>('/api/wallets')
const wallets = ref<WalletEdit[]>([])

watchEffect(() => {
  const list = walletsData.value?.data ?? []
  wallets.value = list.map((w) => ({
    ...w,
    balance: Number(w.balance),
    saving: false,
    _orig: { name: w.name, balance: Number(w.balance), is_active: w.is_active },
  }))
})

function walletDirty(w: WalletEdit): boolean {
  return (
    w.name.trim() !== w._orig.name ||
    w.balance !== w._orig.balance ||
    w.is_active !== w._orig.is_active
  )
}

async function saveWallet(w: WalletEdit) {
  if (!w.name.trim() || !walletDirty(w)) return
  w.saving = true
  try {
    const res = await $fetch<{ data: Wallet }>(`/api/wallets/${w.id}`, {
      method: 'PATCH',
      body: { name: w.name.trim(), balance: w.balance, is_active: w.is_active },
    })
    const saved = res.data
    w.name = saved.name
    w.balance = Number(saved.balance)
    w.is_active = saved.is_active
    w._orig = { name: saved.name, balance: Number(saved.balance), is_active: saved.is_active }
    toast.success('Dompet diperbarui')
  } catch {
    toast.error('Gagal memperbarui dompet')
  } finally {
    w.saving = false
  }
}

// --- Backup ---
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
      Number(t.amount),
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
.settings-page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 560px;
  padding-top: 0.5rem;
}

.page-heading {
  display: none;
  font-size: 22px;
  font-weight: 700;
  color: var(--color-text);
}

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

.field {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.field--stack {
  flex-direction: column;
  align-items: stretch;
  gap: 6px;
}

.field-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-subtle);
}

.field-value {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text);
  text-align: right;
  word-break: break-word;
}

.field-hint {
  font-size: 12px;
  color: var(--color-text-subtle);
  line-height: 1.5;
}

.field-hint code {
  background: var(--color-bg-subtle);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  padding: 1px 5px;
  font-size: 11px;
}

.inline-edit {
  display: flex;
  gap: 8px;
}

.text-input {
  flex: 1;
  min-width: 0;
  padding: 10px 12px;
  font-size: 14px;
  color: var(--color-text);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  outline: none;
  transition: border-color 0.15s;
}

.text-input:focus {
  border-color: var(--color-text);
}

.text-input:disabled {
  opacity: 0.5;
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
  transition: opacity 0.15s, background 0.15s, color 0.15s;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn--primary {
  background: var(--color-text);
  color: #ffffff;
}

.btn--danger-outline {
  width: 100%;
  background: transparent;
  border-color: var(--color-border);
  color: var(--color-danger);
}

.btn--danger-outline:hover {
  background: var(--color-bg-subtle);
}

.team-list,
.wallet-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.team-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 12px;
  background: var(--color-bg-subtle);
  border-radius: var(--radius-sm);
}

.team-name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text);
}

.badge {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  color: var(--color-text-subtle);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 999px;
  padding: 2px 7px;
}

.tg-status {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 600;
}

.tg-status--on {
  color: var(--color-success);
}

.tg-status--off {
  color: var(--color-text-subtle);
}

.wallet-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}

.wallet-name {
  font-weight: 600;
}

.wallet-row-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.switch {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text);
  cursor: pointer;
}

.switch input {
  width: 16px;
  height: 16px;
  accent-color: var(--color-text);
  cursor: pointer;
}

.info-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-item {
  font-size: 13px;
  line-height: 1.5;
  color: var(--color-text-subtle);
  padding: 10px 12px;
  background: var(--color-bg-subtle);
  border-radius: var(--radius-sm);
}

.backup-btn {
  align-self: flex-start;
}

.skeleton-block {
  height: 64px;
  background: var(--color-bg-subtle);
  border-radius: var(--radius-sm);
  animation: pulse 1.5s ease-in-out infinite;
}

@media (min-width: 640px) {
  .page-heading {
    display: block;
  }
}
</style>
