<template>
  <div class="history-row" :class="{ 'history-row--open': expanded }">
    <!-- Collapsed summary (always visible) -->
    <button type="button" class="row-head" :aria-expanded="expanded" @click="toggle">
      <div class="row-info">
        <span class="row-label">{{ label }}</span>
        <span class="row-meta">{{ metaLine }}</span>
      </div>
      <div class="row-right">
        <span :class="['row-amount', `row-amount--${transaction.type}`]">
          {{ amountPrefix }}{{ formatRupiah(transaction.amount) }}
        </span>
        <span class="row-time">{{ time }}</span>
      </div>
    </button>

    <!-- Expanded detail / edit -->
    <div v-if="expanded" class="row-body">
      <!-- Edit form -->
      <template v-if="editing">
        <div class="edit-grid">
          <div class="field">
            <label class="field-label">Nominal</label>
            <TransactionAmountInput v-model="edit.amount" :disabled="isSaving" />
          </div>

          <div class="field">
            <label class="field-label">{{ isTransfer ? 'Dari Wallet' : 'Wallet' }}</label>
            <select v-model="edit.wallet_id" class="edit-input" :disabled="isSaving">
              <option value="" disabled>Pilih wallet</option>
              <option v-for="w in wallets" :key="w.id" :value="w.id">{{ w.name }}</option>
            </select>
          </div>

          <div v-if="isTransfer" class="field">
            <label class="field-label">Ke Wallet</label>
            <select v-model="edit.wallet_to_id" class="edit-input" :disabled="isSaving">
              <option value="" disabled>Pilih wallet tujuan</option>
              <option
                v-for="w in wallets.filter((x) => x.id !== edit.wallet_id)"
                :key="w.id"
                :value="w.id"
              >
                {{ w.name }}
              </option>
            </select>
          </div>

          <div v-else class="field">
            <label class="field-label">Kategori</label>
            <select v-model="edit.category_id" class="edit-input" :disabled="isSaving">
              <option value="" disabled>Pilih kategori</option>
              <option v-for="c in editCategories" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
          </div>

          <div class="field">
            <label class="field-label">Tanggal</label>
            <input v-model="edit.date" type="date" class="edit-input" :disabled="isSaving" />
          </div>

          <div class="field">
            <label class="field-label">Catatan</label>
            <input v-model="edit.note" type="text" class="edit-input" placeholder="(opsional)" :disabled="isSaving" />
          </div>
        </div>

        <p v-if="editError" class="edit-error">{{ editError }}</p>

        <div class="row-actions">
          <button type="button" class="act-btn act-btn--ghost" :disabled="isSaving" @click="cancelEdit">
            Batal
          </button>
          <button type="button" class="act-btn act-btn--primary" :disabled="isSaving" @click="saveEdit">
            <IconLoader2 v-if="isSaving" :size="16" class="spin" />
            <span>{{ isSaving ? 'Menyimpan...' : 'Simpan' }}</span>
          </button>
        </div>
      </template>

      <!-- Read-only detail -->
      <template v-else>
        <dl class="detail-list">
          <div class="detail-item">
            <dt>Tipe</dt>
            <dd>{{ typeLabel }}</dd>
          </div>
          <div class="detail-item">
            <dt>Nominal</dt>
            <dd>{{ formatRupiah(transaction.amount) }}</dd>
          </div>
          <div class="detail-item">
            <dt>{{ isTransfer ? 'Dari' : 'Wallet' }}</dt>
            <dd>{{ transaction.wallet?.name ?? '—' }}</dd>
          </div>
          <div v-if="isTransfer" class="detail-item">
            <dt>Ke</dt>
            <dd>{{ transaction.wallet_to?.name ?? '—' }}</dd>
          </div>
          <div v-if="!isTransfer" class="detail-item">
            <dt>Kategori</dt>
            <dd>{{ transaction.category?.name ?? '—' }}</dd>
          </div>
          <div class="detail-item">
            <dt>Tanggal</dt>
            <dd>{{ dateLabel }}</dd>
          </div>
          <div v-if="transaction.note" class="detail-item">
            <dt>Catatan</dt>
            <dd>{{ transaction.note }}</dd>
          </div>
          <div class="detail-item">
            <dt>Diinput</dt>
            <dd>{{ transaction.creator?.name ?? '—' }} · {{ sourceLabel }}</dd>
          </div>
        </dl>

        <div class="row-actions">
          <button type="button" class="act-btn act-btn--ghost" @click="startEdit">
            <IconPencil :size="15" /> Edit
          </button>
          <button type="button" class="act-btn act-btn--danger-ghost" @click="showDelete = true">
            <IconTrash :size="15" /> Hapus
          </button>
        </div>
      </template>
    </div>

    <UiConfirmDialog
      :open="showDelete"
      title="Hapus transaksi?"
      message="Tindakan ini tidak bisa dibatalkan. Saldo wallet akan disesuaikan kembali."
      confirm-label="Hapus"
      danger
      :loading="isDeleting"
      @confirm="handleDelete"
      @cancel="showDelete = false"
    />
  </div>
</template>

<script setup lang="ts">
import { IconPencil, IconTrash, IconLoader2 } from '@tabler/icons-vue'
import { useToast } from 'vue-toastification'
import type { TransactionRecord, Wallet, Category } from '~/types/models'

const props = defineProps<{
  transaction: TransactionRecord
  wallets: Pick<Wallet, 'id' | 'name'>[]
  categories: Pick<Category, 'id' | 'name' | 'type'>[]
}>()

const emit = defineEmits<{ changed: [] }>()

const { formatRupiah } = useFormatRupiah()
const toast = useToast()
const { validateTransaction } = useTransactionValidation()

const expanded = ref(false)
const editing = ref(false)
const isSaving = ref(false)
const isDeleting = ref(false)
const showDelete = ref(false)
const editError = ref('')

const isTransfer = computed(() => props.transaction.type === 'transfer')

const edit = reactive({
  amount: 0,
  wallet_id: '',
  wallet_to_id: '',
  category_id: '',
  date: '',
  note: '',
})

// categories matching this transaction's type (type is locked on edit)
const editCategories = computed(() =>
  props.categories.filter((c) => c.type === props.transaction.type),
)

const label = computed(() => {
  if (props.transaction.note) return props.transaction.note
  if (isTransfer.value) return `Transfer → ${props.transaction.wallet_to?.name ?? '—'}`
  return props.transaction.category?.name ?? '—'
})

const metaLine = computed(() => {
  if (isTransfer.value) return props.transaction.wallet?.name ?? '—'
  return `${props.transaction.category?.name ?? '—'} · ${props.transaction.wallet?.name ?? '—'}`
})

const amountPrefix = computed(() => {
  if (props.transaction.type === 'income') return '+'
  if (props.transaction.type === 'expense') return '-'
  return ''
})

const typeLabel = computed(
  () => ({ income: 'Pemasukan', expense: 'Pengeluaran', transfer: 'Transfer' }[props.transaction.type]),
)

const sourceLabel = computed(() => (props.transaction.source === 'telegram' ? 'Telegram' : 'Web'))

const time = computed(() =>
  new Date(props.transaction.created_at).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  }),
)

const dateLabel = computed(() =>
  new Date(props.transaction.date + 'T00:00:00').toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }),
)

function toggle() {
  if (editing.value) return
  expanded.value = !expanded.value
}

function startEdit() {
  const t = props.transaction
  edit.amount = t.amount
  edit.wallet_id = t.wallet_id
  edit.wallet_to_id = t.wallet_to_id ?? ''
  edit.category_id = t.category_id ?? ''
  edit.date = t.date
  edit.note = t.note ?? ''
  editError.value = ''
  editing.value = true
}

function cancelEdit() {
  editing.value = false
  editError.value = ''
}

async function saveEdit() {
  const err = validateTransaction({
    amount: edit.amount,
    walletId: edit.wallet_id,
    walletToId: edit.wallet_to_id,
    categoryId: edit.category_id,
    isTransfer: isTransfer.value,
  })
  if (err) {
    editError.value = err
    return
  }
  editError.value = ''
  isSaving.value = true

  try {
    await $fetch(`/api/transactions/${props.transaction.id}`, {
      method: 'PATCH',
      body: {
        amount: edit.amount,
        wallet_id: edit.wallet_id,
        wallet_to_id: isTransfer.value ? edit.wallet_to_id : null,
        category_id: isTransfer.value ? null : edit.category_id,
        date: edit.date,
        note: edit.note.trim() || null,
      },
    })
    toast.success('Transaksi diperbarui')
    editing.value = false
    expanded.value = false
    emit('changed')
  } catch {
    toast.error('Gagal memperbarui transaksi')
    isSaving.value = false
  }
}

async function handleDelete() {
  isDeleting.value = true
  try {
    await $fetch(`/api/transactions/${props.transaction.id}`, { method: 'DELETE' })
    toast.success('Transaksi dihapus')
    showDelete.value = false
    emit('changed')
  } catch {
    toast.error('Gagal menghapus transaksi')
    isDeleting.value = false
  }
}
</script>

<style scoped>
.history-row {
  border-bottom: 1px solid var(--color-border);
}

.history-row:last-child {
  border-bottom: none;
}

.row-head {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 4px;
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;
}

.row-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.row-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.row-meta {
  font-size: 12px;
  color: var(--color-text-subtle);
}

.row-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 3px;
  flex-shrink: 0;
}

.row-amount {
  font-size: 14px;
  font-weight: 600;
}

.row-amount--income { color: var(--color-success); }
.row-amount--expense { color: var(--color-danger); }
.row-amount--transfer { color: var(--color-info); }

.row-time {
  font-size: 11px;
  color: var(--color-text-subtle);
}

.row-body {
  padding: 4px 4px 16px;
}

.detail-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 0;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  font-size: 13px;
}

.detail-item dt {
  color: var(--color-text-subtle);
  flex-shrink: 0;
}

.detail-item dd {
  color: var(--color-text);
  text-align: right;
  font-weight: 500;
}

.edit-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px 0;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.field-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text);
}

.edit-input {
  width: 100%;
  padding: 9px 11px;
  font-size: 14px;
  color: var(--color-text);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  outline: none;
  transition: border-color 0.15s;
}

.edit-input:focus {
  border-color: var(--color-text);
}

.edit-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.edit-error {
  font-size: 13px;
  color: var(--color-danger);
  padding: 4px 0;
}

.row-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.act-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 8px 14px;
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
  transition: opacity 0.15s, border-color 0.15s, color 0.15s, background 0.15s;
}

.act-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.act-btn--ghost {
  background: transparent;
  border-color: var(--color-border);
  color: var(--color-text);
}

.act-btn--ghost:hover:not(:disabled) {
  border-color: var(--color-text);
}

.act-btn--danger-ghost {
  background: transparent;
  border-color: var(--color-border);
  color: var(--color-danger);
}

.act-btn--danger-ghost:hover:not(:disabled) {
  border-color: var(--color-danger);
}

.act-btn--primary {
  background: var(--color-text);
  color: #ffffff;
  flex: 1;
}

</style>
