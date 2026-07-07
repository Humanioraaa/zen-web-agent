<template>
  <div class="co-new">
    <h1 class="page-heading">Pesanan Custom Baru</h1>

    <form class="co-form" @submit.prevent="handleSubmit">
      <div class="field">
        <label class="field-label" for="customer">Nama Customer</label>
        <input id="customer" v-model="customerName" type="text" class="field-input" :disabled="submitting" placeholder="Misal: Bu Sinta" />
      </div>

      <div class="field">
        <label class="field-label" for="item">Item / Menu</label>
        <input id="item" v-model="itemName" type="text" class="field-input" :disabled="submitting" placeholder="Misal: Pudding Pandan" />
      </div>

      <div class="row">
        <div class="field">
          <label class="field-label" for="qty">Qty</label>
          <input id="qty" v-model.number="qty" type="number" min="1" step="1" class="field-input" :disabled="submitting" placeholder="0" />
        </div>
        <div class="field">
          <label class="field-label" for="unit">Harga Satuan <span class="optional">(opsional)</span></label>
          <input id="unit" v-model.number="unitPrice" type="number" min="0" step="1" class="field-input" :disabled="submitting" placeholder="0" @input="syncQuoted" />
        </div>
      </div>

      <div class="field">
        <label class="field-label" for="quoted">Total Harga (deal)</label>
        <input id="quoted" v-model.number="quotedPrice" type="number" min="0" step="1" class="field-input" :disabled="submitting" placeholder="0" />
        <span v-if="qty > 0 && unitPrice > 0" class="hint">≈ {{ formatRupiah(qty * unitPrice) }} ({{ qty }} × {{ formatRupiah(unitPrice) }})</span>
      </div>

      <div class="row">
        <div class="field">
          <label class="field-label" for="order-date">Tanggal Order</label>
          <input id="order-date" v-model="orderDate" type="date" class="field-input" :disabled="submitting" />
        </div>
        <div class="field">
          <label class="field-label" for="due-date">Jatuh Tempo <span class="optional">(opsional)</span></label>
          <input id="due-date" v-model="dueDate" type="date" class="field-input" :disabled="submitting" />
        </div>
      </div>

      <div class="field">
        <label class="field-label" for="status">Status</label>
        <select id="status" v-model="status" class="select" :disabled="submitting">
          <option v-for="o in options" :key="o.value" :value="o.value">{{ o.label }}</option>
        </select>
      </div>

      <div class="field">
        <label class="field-label" for="notes">Catatan <span class="optional">(opsional)</span></label>
        <textarea id="notes" v-model="notes" class="textarea" rows="2" :disabled="submitting" placeholder="Detail pesanan, alamat antar, dll" />
      </div>

      <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>

      <div class="actions">
        <NuxtLink to="/custom-orders" class="cancel-btn">Batal</NuxtLink>
        <button type="submit" class="submit-btn" :disabled="submitting">
          <IconLoader2 v-if="submitting" :size="18" class="spin" />
          <span>{{ submitting ? 'Menyimpan...' : 'Simpan' }}</span>
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { IconLoader2 } from '@tabler/icons-vue'
import { useToast } from 'vue-toastification'
import { useCustomOrderApi } from '~/api/custom-order-api'
import type { CustomOrderStatus } from '~/types/custom-order'

const toast = useToast()
const { todayLocal } = useDateUtils()
const { formatRupiah } = useFormatRupiah()
const { options } = useCustomOrderStatus()
const api = useCustomOrderApi()

const customerName = ref('')
const itemName = ref('')
const qty = ref(0)
const unitPrice = ref(0)
const quotedPrice = ref(0)
const orderDate = ref(todayLocal())
const dueDate = ref('')
const status = ref<CustomOrderStatus>('quote')
const notes = ref('')

const submitting = ref(false)
const errorMessage = ref('')

// Convenience: keep the total in sync with qty × unit while the owner hasn't overridden it.
let quotedTouched = false
function syncQuoted() {
  if (!quotedTouched && qty.value > 0 && unitPrice.value > 0) {
    quotedPrice.value = qty.value * unitPrice.value
  }
}
watch(quotedPrice, (v) => {
  if (qty.value > 0 && unitPrice.value > 0 && v !== qty.value * unitPrice.value) quotedTouched = true
})

async function handleSubmit() {
  if (!customerName.value.trim()) return (errorMessage.value = 'Nama customer wajib diisi')
  if (!itemName.value.trim()) return (errorMessage.value = 'Nama item wajib diisi')
  if (!qty.value || qty.value <= 0) return (errorMessage.value = 'Qty harus lebih dari 0')
  if (quotedPrice.value < 0) return (errorMessage.value = 'Total harga tidak valid')

  errorMessage.value = ''
  submitting.value = true
  try {
    const res = await api.create({
      customer_name: customerName.value.trim(),
      item_name: itemName.value.trim(),
      qty: qty.value,
      unit_price: unitPrice.value > 0 ? unitPrice.value : null,
      quoted_price: quotedPrice.value,
      order_date: orderDate.value,
      due_date: dueDate.value || null,
      status: status.value,
      notes: notes.value.trim() || null,
    })
    toast.success('Pesanan dibuat')
    await navigateTo(`/custom-orders/${res.data.id}`)
  } catch {
    toast.error('Gagal membuat pesanan')
    submitting.value = false
  }
}
</script>

<style scoped>
.co-new {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  max-width: 520px;
  padding-top: 0.5rem;
}
.page-heading {
  font-size: 22px;
  font-weight: 700;
  color: var(--color-text);
}
.co-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
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
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text);
}
.optional {
  font-weight: 400;
  color: var(--color-text-subtle);
}
.hint {
  font-size: 12px;
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
}
.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.spin {
  animation: spin 0.8s linear infinite;
}
</style>
