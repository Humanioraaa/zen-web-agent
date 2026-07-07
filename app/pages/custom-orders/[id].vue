<template>
  <div class="co-detail">
    <NuxtLink to="/custom-orders" class="back-link">
      <IconChevronLeft :size="16" /> Pesanan Custom
    </NuxtLink>

    <div v-if="pending" class="skeleton-card" />

    <template v-else-if="order">
      <header class="co-header">
        <div class="co-title-wrap">
          <h1 class="co-title">{{ order.item_name }}</h1>
          <p class="co-subtitle">{{ order.customer_name }} · {{ order.qty }} pcs</p>
        </div>
        <CustomOrderStatusBadge :status="order.status" />
      </header>

      <!-- Status pipeline control -->
      <div class="status-control">
        <label class="field-label" for="status">Status</label>
        <select id="status" v-model="statusModel" class="select" :disabled="savingStatus" @change="updateStatus">
          <option v-for="o in options" :key="o.value" :value="o.value">{{ o.label }}</option>
        </select>
      </div>

      <!-- P&L card -->
      <div class="pnl-card">
        <div class="pnl-cell">
          <span class="pnl-label">Total Deal</span>
          <span class="pnl-value">{{ formatRupiah(order.quoted_price) }}</span>
        </div>
        <div class="pnl-cell">
          <span class="pnl-label">Dibayar</span>
          <span class="pnl-value pnl-green">{{ formatRupiah(order.paid) }}</span>
        </div>
        <div class="pnl-cell">
          <span class="pnl-label">Biaya</span>
          <span class="pnl-value pnl-red">{{ formatRupiah(order.cost) }}</span>
        </div>
        <div class="pnl-cell">
          <span class="pnl-label">Laba</span>
          <span :class="['pnl-value', order.margin >= 0 ? 'pnl-green' : 'pnl-red']">
            {{ formatRupiah(order.margin) }}
            <span v-if="order.margin_pct !== null" class="pnl-pct">({{ order.margin_pct }}%)</span>
          </span>
        </div>
        <div class="pnl-cell pnl-cell--wide">
          <span class="pnl-label">Sisa Tagihan</span>
          <span :class="['pnl-value', order.outstanding > 0 ? 'pnl-amber' : 'pnl-green']">
            {{ order.outstanding > 0 ? formatRupiah(order.outstanding) : 'Lunas' }}
          </span>
        </div>
      </div>

      <!-- Meta -->
      <dl class="meta">
        <div class="meta-row">
          <dt>Tanggal order</dt>
          <dd>{{ formatDate(order.order_date) }}</dd>
        </div>
        <div class="meta-row">
          <dt>Jatuh tempo</dt>
          <dd :class="{ 'co-overdue': isOverdue }">{{ order.due_date ? formatDate(order.due_date) : '—' }}</dd>
        </div>
        <div v-if="order.notes" class="meta-row">
          <dt>Catatan</dt>
          <dd>{{ order.notes }}</dd>
        </div>
      </dl>

      <!-- Tagged transactions -->
      <section class="tx-section">
        <h2 class="section-title">Pembayaran &amp; Biaya</h2>
        <ul v-if="order.transactions.length" class="tx-list">
          <li v-for="t in order.transactions" :key="t.id" class="tx-row">
            <div class="tx-info">
              <span :class="['tx-type', t.type === 'income' ? 'tx-in' : 'tx-out']">
                {{ t.type === 'income' ? 'Pembayaran' : 'Biaya' }}
              </span>
              <span class="tx-meta">{{ formatDate(t.date) }}<template v-if="t.note"> · {{ t.note }}</template></span>
            </div>
            <span :class="['tx-amount', t.type === 'income' ? 'pnl-green' : 'pnl-red']">
              {{ t.type === 'income' ? '+' : '−' }}{{ formatRupiah(t.amount) }}
            </span>
          </li>
        </ul>
        <p v-else class="tx-empty">Belum ada pembayaran/biaya. Tambah di bawah.</p>

        <CustomOrderTxForm :order-id="order.id" @added="refresh" />
      </section>

      <button type="button" class="delete-btn" @click="confirmOpen = true">
        <IconTrash :size="16" /> Hapus Pesanan
      </button>
    </template>

    <UiConfirmDialog
      :open="confirmOpen"
      title="Hapus pesanan?"
      message="Pesanan dihapus. Transaksi yang sudah ditandai tetap ada (tag dilepas), tidak ikut terhapus."
      confirm-label="Hapus"
      danger
      :loading="deleting"
      @confirm="handleDelete"
      @cancel="confirmOpen = false"
    />
  </div>
</template>

<script setup lang="ts">
import { IconChevronLeft, IconTrash } from '@tabler/icons-vue'
import { useToast } from 'vue-toastification'
import { useCustomOrderApi } from '~/api/custom-order-api'
import type { CustomOrderStatus } from '~/types/custom-order'

const route = useRoute()
const toast = useToast()
const { formatRupiah } = useFormatRupiah()
const { options } = useCustomOrderStatus()
const api = useCustomOrderApi()

const id = route.params.id as string
const { data, pending, refresh } = await useAsyncData(`custom-order-${id}`, () => api.get(id))
const order = computed(() => data.value?.data)

const dateFmt = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
function formatDate(d: string): string {
  return dateFmt.format(new Date(d))
}
const isOverdue = computed(() => {
  const o = order.value
  if (!o?.due_date || o.status === 'done' || o.status === 'cancelled') return false
  return new Date(o.due_date) < new Date(new Date().toDateString())
})

// Status pipeline control
const statusModel = ref<CustomOrderStatus>('quote')
watch(order, (o) => { if (o) statusModel.value = o.status }, { immediate: true })
const savingStatus = ref(false)
async function updateStatus() {
  if (!order.value || statusModel.value === order.value.status) return
  savingStatus.value = true
  try {
    await api.update(id, { status: statusModel.value })
    await refresh()
    toast.success('Status diperbarui')
  } catch {
    toast.error('Gagal memperbarui status')
    statusModel.value = order.value.status
  } finally {
    savingStatus.value = false
  }
}

// Delete
const confirmOpen = ref(false)
const deleting = ref(false)
async function handleDelete() {
  deleting.value = true
  try {
    await api.remove(id)
    toast.success('Pesanan dihapus')
    await navigateTo('/custom-orders')
  } catch {
    toast.error('Gagal menghapus pesanan')
    deleting.value = false
    confirmOpen.value = false
  }
}
</script>

<style scoped>
.co-detail {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 620px;
  padding-top: 0.5rem;
}
.back-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-subtle);
  text-decoration: none;
  width: fit-content;
}
.back-link:hover {
  color: var(--color-text);
}
.co-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.co-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--color-text);
}
.co-subtitle {
  font-size: 13px;
  color: var(--color-text-subtle);
  margin-top: 2px;
}
.status-control {
  display: flex;
  align-items: center;
  gap: 10px;
}
.status-control .select {
  flex: 1;
  max-width: 200px;
}
.field-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text);
}
.select {
  padding: 9px 12px;
  font-size: 14px;
  color: var(--color-text);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  outline: none;
}
.select:focus {
  border-color: var(--color-text);
}
.select:disabled {
  opacity: 0.5;
}
.pnl-card {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1px;
  background: var(--color-border);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
}
.pnl-cell {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 12px 14px;
  background: var(--color-bg);
}
.pnl-cell--wide {
  grid-column: 1 / -1;
}
.pnl-label {
  font-size: 12px;
  color: var(--color-text-subtle);
}
.pnl-value {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-text);
}
.pnl-pct {
  font-size: 12px;
  font-weight: 600;
}
.pnl-green {
  color: var(--color-success, #166534);
}
.pnl-red {
  color: var(--color-danger, #b91c1c);
}
.pnl-amber {
  color: #92400e;
}
.meta {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.meta-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 13px;
}
.meta-row dt {
  color: var(--color-text-subtle);
}
.meta-row dd {
  color: var(--color-text);
  font-weight: 500;
  text-align: right;
}
.co-overdue {
  color: var(--color-danger);
  font-weight: 600;
}
.tx-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 8px;
  border-top: 1px solid var(--color-border);
}
.section-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--color-text);
}
.tx-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 0 12px;
}
.tx-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid var(--color-border);
}
.tx-row:last-child {
  border-bottom: none;
}
.tx-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.tx-type {
  font-size: 13px;
  font-weight: 600;
}
.tx-in {
  color: var(--color-success, #166534);
}
.tx-out {
  color: var(--color-danger, #b91c1c);
}
.tx-meta {
  font-size: 12px;
  color: var(--color-text-subtle);
}
.tx-amount {
  font-size: 14px;
  font-weight: 700;
  white-space: nowrap;
}
.tx-empty {
  font-size: 13px;
  color: var(--color-text-subtle);
  padding: 4px 0;
}
.delete-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  align-self: flex-start;
  padding: 9px 14px;
  margin-top: 4px;
  background: transparent;
  color: var(--color-danger);
  border: 1px solid var(--color-danger-border, var(--color-border));
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
.delete-btn:hover {
  background: var(--color-danger-bg);
}
.skeleton-card {
  height: 320px;
  background: var(--color-bg-subtle);
  border-radius: var(--radius-md);
  animation: pulse 1.5s ease-in-out infinite;
}
</style>
