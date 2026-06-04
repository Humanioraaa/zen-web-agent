<template>
  <div class="categories-page">
    <h1 class="page-heading">Kategori</h1>

    <!-- Type tabs -->
    <div class="tabs">
      <button
        type="button"
        :class="['tab', { 'tab--active': activeType === 'expense' }]"
        @click="setTab('expense')"
      >
        Pengeluaran
      </button>
      <button
        type="button"
        :class="['tab', { 'tab--active': activeType === 'income' }]"
        @click="setTab('income')"
      >
        Pemasukan
      </button>
    </div>

    <!-- Add form -->
    <form class="add-form" @submit.prevent="addCat">
      <input
        v-model="newName"
        type="text"
        class="add-input"
        :placeholder="`Kategori ${activeType === 'expense' ? 'pengeluaran' : 'pemasukan'} baru`"
        :disabled="adding"
      />
      <button type="submit" class="add-btn" :disabled="adding || !newName.trim()">
        <IconLoader2 v-if="adding" :size="16" class="spin" />
        <IconPlus v-else :size="16" />
        <span>Tambah</span>
      </button>
    </form>

    <!-- Loading -->
    <div v-if="pending" class="skeleton-list">
      <div v-for="n in 5" :key="n" class="skeleton-item" />
    </div>

    <!-- Empty -->
    <div v-else-if="filtered.length === 0" class="empty-state">
      Belum ada kategori {{ activeType === 'expense' ? 'pengeluaran' : 'pemasukan' }}.
    </div>

    <!-- List -->
    <ul v-else class="cat-list">
      <li v-for="c in filtered" :key="c.id" class="cat-row">
        <!-- Editing -->
        <template v-if="editingId === c.id">
          <input
            v-model="editName"
            type="text"
            class="edit-input"
            :disabled="savingEdit"
            @keyup.enter="saveEdit(c)"
            @keyup.esc="cancelEdit"
          />
          <div class="row-actions">
            <button
              type="button"
              class="icon-btn icon-btn--primary"
              :disabled="savingEdit || !editName.trim()"
              aria-label="Simpan"
              @click="saveEdit(c)"
            >
              <IconLoader2 v-if="savingEdit" :size="16" class="spin" />
              <IconCheck v-else :size="16" />
            </button>
            <button
              type="button"
              class="icon-btn"
              :disabled="savingEdit"
              aria-label="Batal"
              @click="cancelEdit"
            >
              <IconX :size="16" />
            </button>
          </div>
        </template>

        <!-- Display -->
        <template v-else>
          <span class="cat-name">
            {{ c.name }}
            <span v-if="c.is_default" class="badge">default</span>
          </span>
          <div class="row-actions">
            <button type="button" class="icon-btn" aria-label="Edit" @click="startEdit(c)">
              <IconPencil :size="16" />
            </button>
            <button
              type="button"
              class="icon-btn icon-btn--danger"
              aria-label="Hapus"
              @click="deleteTarget = c"
            >
              <IconTrash :size="16" />
            </button>
          </div>
        </template>
      </li>
    </ul>

    <UiConfirmDialog
      :open="!!deleteTarget"
      title="Hapus kategori?"
      :message="deleteMessage"
      confirm-label="Hapus"
      danger
      :loading="deleting"
      @confirm="confirmDelete"
      @cancel="deleteTarget = null"
    />
  </div>
</template>

<script setup lang="ts">
import { IconPlus, IconPencil, IconTrash, IconLoader2, IconCheck, IconX } from '@tabler/icons-vue'
import { useToast } from 'vue-toastification'

interface Category {
  id: string
  name: string
  type: 'income' | 'expense'
  is_default: boolean
}

const toast = useToast()

const { data, pending, refresh } = await useFetch('/api/categories')
const categories = computed<Category[]>(() => (data.value as any)?.data ?? [])

const activeType = ref<'expense' | 'income'>('expense')
const filtered = computed(() => categories.value.filter((c) => c.type === activeType.value))

// Add
const newName = ref('')
const adding = ref(false)

// Edit
const editingId = ref<string | null>(null)
const editName = ref('')
const savingEdit = ref(false)

// Delete
const deleteTarget = ref<Category | null>(null)
const deleting = ref(false)

const deleteMessage = computed(() =>
  deleteTarget.value
    ? `Hapus kategori "${deleteTarget.value.name}"? Kategori yang sudah dipakai transaksi tidak bisa dihapus.`
    : '',
)

function setTab(t: 'expense' | 'income') {
  activeType.value = t
  cancelEdit()
}

async function addCat() {
  const name = newName.value.trim()
  if (!name) return
  adding.value = true
  try {
    await $fetch('/api/categories', {
      method: 'POST',
      body: { name, type: activeType.value },
    })
    newName.value = ''
    toast.success('Kategori ditambah')
    await refresh()
  } catch {
    toast.error('Gagal menambah kategori')
  } finally {
    adding.value = false
  }
}

function startEdit(c: Category) {
  editingId.value = c.id
  editName.value = c.name
}

function cancelEdit() {
  editingId.value = null
  editName.value = ''
}

async function saveEdit(c: Category) {
  const name = editName.value.trim()
  if (!name) return
  savingEdit.value = true
  try {
    await $fetch(`/api/categories/${c.id}`, { method: 'PATCH', body: { name } })
    toast.success('Kategori diperbarui')
    editingId.value = null
    await refresh()
  } catch {
    toast.error('Gagal memperbarui kategori')
  } finally {
    savingEdit.value = false
  }
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    await $fetch(`/api/categories/${deleteTarget.value.id}`, { method: 'DELETE' })
    toast.success('Kategori dihapus')
    deleteTarget.value = null
    await refresh()
  } catch (e: any) {
    const status = e?.statusCode ?? e?.response?.status
    if (status === 409) {
      toast.error('Kategori punya transaksi, tidak bisa dihapus')
    } else {
      toast.error('Gagal menghapus kategori')
    }
    deleting.value = false
  }
}
</script>

<style scoped>
.categories-page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 520px;
  padding-top: 0.5rem;
}

.page-heading {
  display: none;
  font-size: 22px;
  font-weight: 700;
  color: var(--color-text);
}

.tabs {
  display: flex;
  gap: 6px;
  background: var(--color-bg-subtle);
  padding: 4px;
  border-radius: var(--radius-sm);
}

.tab {
  flex: 1;
  padding: 8px;
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-subtle);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.tab--active {
  background: var(--color-bg);
  color: var(--color-text);
  font-weight: 600;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
}

.add-form {
  display: flex;
  gap: 8px;
}

.add-input {
  flex: 1;
  padding: 10px 12px;
  font-size: 14px;
  color: var(--color-text);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  outline: none;
  transition: border-color 0.15s;
}

.add-input:focus {
  border-color: var(--color-text);
}

.add-input:disabled {
  opacity: 0.5;
}

.add-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  background: var(--color-text);
  color: #ffffff;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  flex-shrink: 0;
  transition: opacity 0.15s;
}

.add-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.cat-list {
  list-style: none;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 0 12px;
}

.cat-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 4px;
  border-bottom: 1px solid var(--color-border);
}

.cat-row:last-child {
  border-bottom: none;
}

.cat-name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text);
  min-width: 0;
}

.badge {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  color: var(--color-text-subtle);
  background: var(--color-bg-subtle);
  border: 1px solid var(--color-border);
  border-radius: 999px;
  padding: 2px 7px;
}

.edit-input {
  flex: 1;
  padding: 7px 10px;
  font-size: 14px;
  color: var(--color-text);
  background: var(--color-bg);
  border: 1px solid var(--color-text);
  border-radius: var(--radius-sm);
  outline: none;
}

.edit-input:disabled {
  opacity: 0.5;
}

.row-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  color: var(--color-text-subtle);
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}

.icon-btn:hover:not(:disabled) {
  background: var(--color-bg-subtle);
  color: var(--color-text);
}

.icon-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.icon-btn--danger:hover:not(:disabled) {
  color: #dc2626;
}

.icon-btn--primary {
  color: #16a34a;
}

.empty-state {
  font-size: 14px;
  color: var(--color-text-subtle);
  text-align: center;
  padding: 2.5rem 1rem;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.skeleton-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.skeleton-item {
  height: 46px;
  background: var(--color-bg-subtle);
  border-radius: var(--radius-sm);
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.spin {
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (min-width: 640px) {
  .page-heading {
    display: block;
  }
}
</style>
