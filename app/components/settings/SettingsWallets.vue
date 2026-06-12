<template>
  <section class="card">
    <h2 class="card-title">Dompet</h2>
    <p class="field-hint">
      Ubah nama, saldo, atau nonaktifkan dompet. Saldo di sini menimpa nilai
      saat ini — gunakan dengan hati-hati.
    </p>

    <div v-if="pending" class="skeleton-block" />
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
</template>

<script setup lang="ts">
import { IconLoader2 } from '@tabler/icons-vue'
import { useToast } from 'vue-toastification'
import type { Wallet } from '~/types/models'

interface WalletEdit extends Wallet {
  saving: boolean
  _orig: { name: string; balance: number; is_active: boolean }
}

const toast = useToast()

const { data: walletsData, pending } = await useFetch<{ data: Wallet[] }>('/api/wallets')
const wallets = ref<WalletEdit[]>([])

watchEffect(() => {
  const list = walletsData.value?.data ?? []
  wallets.value = list.map((w) => ({
    ...w,
    saving: false,
    _orig: { name: w.name, balance: w.balance, is_active: w.is_active },
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
    w.balance = saved.balance
    w.is_active = saved.is_active
    w._orig = { name: saved.name, balance: saved.balance, is_active: saved.is_active }
    toast.success('Dompet diperbarui')
  } catch {
    toast.error('Gagal memperbarui dompet')
  } finally {
    w.saving = false
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

.wallet-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 10px;
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

.skeleton-block {
  height: 64px;
  background: var(--color-bg-subtle);
  border-radius: var(--radius-sm);
  animation: pulse 1.5s ease-in-out infinite;
}
</style>
