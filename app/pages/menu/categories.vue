<template>
  <div class="menucat-page">
    <h1 class="page-heading">Kategori Menu</h1>

    <!-- Add / edit form -->
    <form class="cat-form" @submit.prevent="submitForm">
      <input
        v-model="form.name"
        type="text"
        class="field field--name"
        placeholder="Nama kategori (mis. Classic Coffee)"
        :disabled="saving"
      />
      <label class="field-group">
        <span class="field-label">Urut</span>
        <input v-model.number="form.sort_order" type="number" min="0" class="field field--mini" :disabled="saving" />
      </label>
      <label class="field-group">
        <span class="field-label">🟢 Aman ≥</span>
        <input v-model.number="form.safe_threshold" type="number" min="0" max="100" class="field field--mini" :disabled="saving" />
      </label>
      <label class="field-group">
        <span class="field-label">🟡 Waspada ≥</span>
        <input v-model.number="form.warning_threshold" type="number" min="0" max="100" class="field field--mini" :disabled="saving" />
      </label>
      <button type="submit" class="add-btn" :disabled="saving || !formValid">
        <IconLoader2 v-if="saving" :size="16" class="spin" />
        <component :is="editingId ? IconCheck : IconPlus" v-else :size="16" />
        <span>{{ editingId ? 'Simpan' : 'Tambah' }}</span>
      </button>
      <button v-if="editingId" type="button" class="cancel-btn" :disabled="saving" @click="resetForm">
        Batal
      </button>
    </form>
    <p v-if="thresholdError" class="form-error">{{ thresholdError }}</p>

    <!-- Loading -->
    <div v-if="pending" class="skeleton-list">
      <div v-for="n in 6" :key="n" class="skeleton-item" />
    </div>

    <!-- Empty -->
    <div v-else-if="categories.length === 0" class="empty-state">
      Belum ada kategori menu.
    </div>

    <!-- List -->
    <ul v-else class="cat-list">
      <li v-for="cat in categories" :key="cat.id" class="cat-row">
        <div class="cat-main">
          <span class="cat-name">
            {{ cat.name }}
            <span class="badge">{{ cat.menu_count ?? 0 }} menu</span>
          </span>
          <span class="cat-meta">🟢 ≥{{ cat.safe_threshold }}% · 🟡 ≥{{ cat.warning_threshold }}% · 🔴 sisanya</span>
        </div>
        <div class="row-actions">
          <button type="button" class="icon-btn" aria-label="Edit" @click="startEdit(cat)">
            <IconPencil :size="16" />
          </button>
          <button type="button" class="icon-btn icon-btn--danger" aria-label="Hapus" @click="deleteTarget = cat">
            <IconTrash :size="16" />
          </button>
        </div>
      </li>
    </ul>

    <UiConfirmDialog
      :open="!!deleteTarget"
      title="Hapus kategori menu?"
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
import { IconPlus, IconPencil, IconTrash, IconLoader2, IconCheck } from '@tabler/icons-vue'
import { useToast } from 'vue-toastification'
import { useMenuCategoryApi } from '~/api/menu-category-api'
import type { MenuCategory } from '~/types/menu'

const toast = useToast()
const api = useMenuCategoryApi()

const { data, pending, refresh } = await useAsyncData('menu-categories', () => api.list())
const categories = computed(() => data.value?.data ?? [])

interface FormState {
  name: string
  sort_order: number | null
  safe_threshold: number
  warning_threshold: number
}

function emptyForm(): FormState {
  return { name: '', sort_order: null, safe_threshold: 65, warning_threshold: 50 }
}

const form = reactive<FormState>(emptyForm())
const editingId = ref<string | null>(null)
const saving = ref(false)

const deleteTarget = ref<MenuCategory | null>(null)
const deleting = ref(false)

const deleteMessage = computed(() =>
  deleteTarget.value
    ? `Hapus kategori "${deleteTarget.value.name}"? Kategori yang dipakai menu tidak bisa dihapus.`
    : '',
)

const thresholdError = computed(() =>
  form.warning_threshold > form.safe_threshold ? '🟡 Waspada tidak boleh lebih besar dari 🟢 Aman.' : '',
)

const formValid = computed(() => form.name.trim().length > 0 && !thresholdError.value)

function resetForm() {
  Object.assign(form, emptyForm())
  editingId.value = null
}

function startEdit(cat: MenuCategory) {
  editingId.value = cat.id
  form.name = cat.name
  form.sort_order = cat.sort_order
  form.safe_threshold = cat.safe_threshold
  form.warning_threshold = cat.warning_threshold
}

async function submitForm() {
  if (!formValid.value) return
  saving.value = true
  const payload = {
    name: form.name.trim(),
    ...(form.sort_order === null ? {} : { sort_order: form.sort_order }),
    safe_threshold: form.safe_threshold,
    warning_threshold: form.warning_threshold,
  }
  try {
    if (editingId.value) {
      await api.update(editingId.value, payload)
      toast.success('Kategori diperbarui')
    } else {
      await api.create(payload)
      toast.success('Kategori ditambah')
    }
    resetForm()
    await refresh()
  } catch {
    toast.error('Gagal menyimpan kategori')
  } finally {
    saving.value = false
  }
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    await api.remove(deleteTarget.value.id)
    toast.success('Kategori dihapus')
    deleteTarget.value = null
    await refresh()
  } catch (error) {
    const status = (error as { statusCode?: number })?.statusCode
    toast.error(status === 409 ? 'Kategori dipakai menu, tidak bisa dihapus' : 'Gagal menghapus kategori')
  } finally {
    deleting.value = false
  }
}
</script>

<style scoped>
.menucat-page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 640px;
  padding-top: 0.5rem;
}

.page-heading {
  display: none;
  font-size: 22px;
  font-weight: 700;
  color: var(--color-text);
}

.cat-form {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 8px;
}

.field {
  padding: 10px 12px;
  font-size: 14px;
  color: var(--color-text);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  outline: none;
  transition: border-color 0.15s;
}

.field:focus {
  border-color: var(--color-text);
}

.field:disabled {
  opacity: 0.5;
}

.field--name {
  flex: 1 1 100%;
}

.field--mini {
  width: 72px;
  padding: 8px 10px;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.field-label {
  font-size: 11px;
  color: var(--color-text-subtle);
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
  transition: opacity 0.15s;
}

.add-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.cancel-btn {
  padding: 10px 14px;
  background: transparent;
  color: var(--color-text-subtle);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.form-error {
  font-size: 12px;
  color: var(--color-danger);
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

.cat-main {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.cat-name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
}

.cat-meta {
  font-size: 12px;
  color: var(--color-text-subtle);
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
  transition: background 0.15s, color 0.15s;
}

.icon-btn:hover:not(:disabled) {
  background: var(--color-bg-subtle);
  color: var(--color-text);
}

.icon-btn--danger:hover:not(:disabled) {
  color: var(--color-danger);
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
  height: 54px;
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
