<template>
  <div class="new-tx">
    <h1 class="page-heading">Tambah Transaksi</h1>

    <TransactionTypeSelector v-model="type" :disabled="isSubmitting" />

    <form class="tx-form" @submit.prevent="handleSubmit">
      <!-- Nominal -->
      <div class="field">
        <label class="field-label">Nominal</label>
        <TransactionAmountInput v-model="amount" :disabled="isSubmitting" />
      </div>

      <!-- Wallet (sumber) -->
      <div class="field">
        <label class="field-label" for="wallet">{{ isTransfer ? 'Dari Wallet' : 'Wallet' }}</label>
        <select id="wallet" v-model="walletId" class="select" :disabled="isSubmitting">
          <option value="" disabled>Pilih wallet</option>
          <option v-for="w in wallets" :key="w.id" :value="w.id">{{ w.name }}</option>
        </select>
      </div>

      <!-- Wallet (tujuan) — transfer saja -->
      <div v-if="isTransfer" class="field">
        <label class="field-label" for="wallet-to">Ke Wallet</label>
        <select id="wallet-to" v-model="walletToId" class="select" :disabled="isSubmitting">
          <option value="" disabled>Pilih wallet tujuan</option>
          <option v-for="w in walletToOptions" :key="w.id" :value="w.id">{{ w.name }}</option>
        </select>
      </div>

      <!-- Kategori — pengeluaran/pemasukan saja -->
      <div v-else class="field">
        <label class="field-label" for="category">Kategori</label>
        <select id="category" v-model="categoryId" class="select" :disabled="isSubmitting">
          <option value="" disabled>Pilih kategori</option>
          <option v-for="c in filteredCategories" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
      </div>

      <!-- Tanggal -->
      <div class="field">
        <label class="field-label" for="date">Tanggal</label>
        <input
          id="date"
          v-model="date"
          type="date"
          class="field-input"
          :disabled="isSubmitting"
        />
      </div>

      <!-- Catatan -->
      <div class="field">
        <label class="field-label" for="note">Catatan <span class="optional">(opsional)</span></label>
        <textarea
          id="note"
          v-model="note"
          class="textarea"
          rows="2"
          placeholder="Misal: beli gula 5kg"
          :disabled="isSubmitting"
        />
      </div>

      <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>

      <div class="actions">
        <NuxtLink to="/dashboard" class="cancel-btn">Batal</NuxtLink>
        <button type="submit" class="submit-btn" :disabled="isSubmitting">
          <IconLoader2 v-if="isSubmitting" :size="18" class="spin" />
          <span>{{ isSubmitting ? 'Menyimpan...' : 'Simpan' }}</span>
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { IconLoader2 } from '@tabler/icons-vue'
import { useToast } from 'vue-toastification'
import type { Wallet, Category } from '~/types/models'

const toast = useToast()
const { todayLocal } = useDateUtils()
const { validateTransaction } = useTransactionValidation()

type TxType = 'expense' | 'income' | 'transfer'

const type = ref<TxType>('expense')
const amount = ref(0)
const walletId = ref('')
const walletToId = ref('')
const categoryId = ref('')
const date = ref(todayLocal())
const note = ref('')

const isSubmitting = ref(false)
const errorMessage = ref('')

const { data: walletsData } = await useFetch<{ data: Wallet[] }>('/api/wallets')
const { data: catData } = await useFetch<{ data: Category[] }>('/api/categories')

const wallets = computed(() => walletsData.value?.data ?? [])
const categories = computed(() => catData.value?.data ?? [])

const isTransfer = computed(() => type.value === 'transfer')

const filteredCategories = computed(() =>
  categories.value.filter((c) => c.type === type.value),
)

const walletToOptions = computed(() =>
  wallets.value.filter((w) => w.id !== walletId.value),
)

// switching type invalidates type-specific selections
watch(type, () => {
  categoryId.value = ''
  walletToId.value = ''
  errorMessage.value = ''
})

// source wallet changed to match destination → clear destination
watch(walletId, () => {
  if (walletToId.value === walletId.value) walletToId.value = ''
})

async function handleSubmit() {
  const err = validateTransaction({
    amount: amount.value,
    walletId: walletId.value,
    walletToId: walletToId.value,
    categoryId: categoryId.value,
    isTransfer: isTransfer.value,
  })
  if (err) {
    errorMessage.value = err
    return
  }

  errorMessage.value = ''
  isSubmitting.value = true

  try {
    await $fetch('/api/transactions', {
      method: 'POST',
      body: {
        type: type.value,
        amount: amount.value,
        wallet_id: walletId.value,
        wallet_to_id: isTransfer.value ? walletToId.value : undefined,
        category_id: isTransfer.value ? undefined : categoryId.value,
        note: note.value.trim() || undefined,
        date: date.value,
      },
    })
    toast.success('Transaksi disimpan')
    await navigateTo('/dashboard')
  } catch {
    toast.error('Gagal menyimpan transaksi')
    isSubmitting.value = false
  }
}
</script>

<style scoped>
.new-tx {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  max-width: 520px;
  padding-top: 0.5rem;
}

.page-heading {
  display: none;
  font-size: 22px;
  font-weight: 700;
  color: var(--color-text);
}

.tx-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text);
}

.optional {
  font-weight: 400;
  color: var(--color-text-subtle);
}

.select,
.field-input,
.textarea {
  width: 100%;
  padding: 11px 12px;
  font-size: 15px;
  color: var(--color-text);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  outline: none;
  transition: border-color 0.15s;
}

.select:focus,
.field-input:focus,
.textarea:focus {
  border-color: var(--color-text);
}

.select:disabled,
.field-input:disabled,
.textarea:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.textarea {
  resize: vertical;
  font-family: inherit;
  line-height: 1.5;
}

.error-message {
  font-size: 14px;
  color: var(--color-danger);
  background: var(--color-danger-bg);
  border: 1px solid var(--color-danger-border);
  border-radius: var(--radius-sm);
  padding: 10px 12px;
}

.actions {
  display: flex;
  gap: 10px;
  margin-top: 4px;
}

.cancel-btn {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 11px 20px;
  background: transparent;
  color: var(--color-text-subtle);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: 15px;
  font-weight: 500;
  text-decoration: none;
  transition: color 0.15s, border-color 0.15s;
}

.cancel-btn:hover {
  color: var(--color-text);
  border-color: var(--color-text);
}

.submit-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 11px;
  background: var(--color-text);
  color: #ffffff;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (min-width: 640px) {
  .page-heading {
    display: block;
  }
}
</style>
