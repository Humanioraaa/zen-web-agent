<template>
  <form class="cotx-form" @submit.prevent="submit">
    <div class="seg-group">
      <button type="button" :class="['seg', { 'seg--on': type === 'income' }]" :disabled="submitting" @click="setType('income')">
        Pembayaran
      </button>
      <button type="button" :class="['seg', { 'seg--on': type === 'expense' }]" :disabled="submitting" @click="setType('expense')">
        Biaya
      </button>
    </div>

    <div class="row">
      <div class="field">
        <label class="field-label">Nominal</label>
        <input v-model.number="amount" type="number" min="0" step="1" class="field-input" :disabled="submitting" placeholder="0" />
      </div>
      <div class="field">
        <label class="field-label">Wallet</label>
        <select v-model="walletId" class="select" :disabled="submitting">
          <option value="" disabled>Pilih</option>
          <option v-for="w in wallets" :key="w.id" :value="w.id">{{ w.name }}</option>
        </select>
      </div>
    </div>

    <div class="field">
      <label class="field-label">Kategori</label>
      <select v-model="categoryId" class="select" :disabled="submitting">
        <option value="" disabled>Pilih kategori</option>
        <option v-for="c in filteredCategories" :key="c.id" :value="c.id">{{ c.name }}</option>
      </select>
    </div>

    <div class="row">
      <div class="field">
        <label class="field-label">Tanggal</label>
        <input v-model="date" type="date" class="field-input" :disabled="submitting" />
      </div>
      <div class="field">
        <label class="field-label">Catatan <span class="opt">(opsional)</span></label>
        <input v-model="note" type="text" class="field-input" :disabled="submitting" placeholder="Misal: DP" />
      </div>
    </div>

    <p v-if="error" class="error-message">{{ error }}</p>

    <button type="submit" class="submit-btn" :disabled="submitting">
      <IconLoader2 v-if="submitting" :size="16" class="spin" />
      <span>{{ type === 'income' ? 'Tambah Pembayaran' : 'Tambah Biaya' }}</span>
    </button>
  </form>
</template>

<script setup lang="ts">
import { IconLoader2 } from '@tabler/icons-vue'
import { useToast } from 'vue-toastification'
import { useCustomOrderApi } from '~/api/custom-order-api'
import { useWalletApi } from '~/api/wallet-api'
import { useCategoryApi } from '~/api/category-api'

const props = defineProps<{ orderId: string }>()
const emit = defineEmits<{ added: [] }>()

const toast = useToast()
const { todayLocal } = useDateUtils()
const api = useCustomOrderApi()
const walletApi = useWalletApi()
const categoryApi = useCategoryApi()

const type = ref<'income' | 'expense'>('income')
const amount = ref(0)
const walletId = ref('')
const categoryId = ref('')
const date = ref(todayLocal())
const note = ref('')
const submitting = ref(false)
const error = ref('')

const { data: walletsData } = await useAsyncData('cotx-wallets', () => walletApi.list())
const { data: catData } = await useAsyncData('cotx-categories', () => categoryApi.list())
const wallets = computed(() => walletsData.value?.data ?? [])
const categories = computed(() => catData.value?.data ?? [])
const filteredCategories = computed(() => categories.value.filter((c) => c.type === type.value))

function setType(t: 'income' | 'expense') {
  type.value = t
  categoryId.value = ''
  error.value = ''
}

async function submit() {
  if (!amount.value || amount.value <= 0) return (error.value = 'Nominal harus lebih dari 0')
  if (!walletId.value) return (error.value = 'Pilih wallet')
  if (!categoryId.value) return (error.value = 'Pilih kategori')
  error.value = ''
  submitting.value = true
  try {
    await api.addTransaction(props.orderId, {
      type: type.value,
      amount: amount.value,
      wallet_id: walletId.value,
      category_id: categoryId.value,
      note: note.value.trim() || undefined,
      date: date.value,
    })
    toast.success(type.value === 'income' ? 'Pembayaran ditambahkan' : 'Biaya ditambahkan')
    amount.value = 0
    note.value = ''
    emit('added')
  } catch {
    toast.error('Gagal menambah transaksi')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.cotx-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.seg-group {
  display: flex;
  gap: 6px;
}
.seg {
  flex: 1;
  padding: 9px;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-subtle);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s, background 0.15s;
}
.seg--on {
  color: #ffffff;
  background: var(--color-text);
  border-color: var(--color-text);
}
.row {
  display: flex;
  gap: 10px;
}
.row .field {
  flex: 1;
  min-width: 0;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.field-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text);
}
.opt {
  font-weight: 400;
  color: var(--color-text-subtle);
}
.select,
.field-input {
  width: 100%;
  padding: 10px 12px;
  font-size: 15px;
  color: var(--color-text);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  outline: none;
  transition: border-color 0.15s;
}
.select:focus,
.field-input:focus {
  border-color: var(--color-text);
}
.select:disabled,
.field-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.error-message {
  font-size: 13px;
  color: var(--color-danger);
  background: var(--color-danger-bg);
  border: 1px solid var(--color-danger-border);
  border-radius: var(--radius-sm);
  padding: 9px 12px;
}
.submit-btn {
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
.spin {
  animation: spin 0.8s linear infinite;
}
</style>
