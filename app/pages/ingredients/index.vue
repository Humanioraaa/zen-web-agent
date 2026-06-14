<template>
  <div class="ingredients-page">
    <h1 class="page-heading">Bahan Baku</h1>

    <!-- Add / edit form -->
    <form class="ing-form" @submit.prevent="submitForm">
      <input
        v-model="form.name"
        type="text"
        class="field field--name"
        placeholder="Nama bahan (mis. Susu UHT)"
        :disabled="saving"
      />
      <select v-model="form.base_unit" class="field field--unit" :disabled="saving">
        <option value="ml">ml</option>
        <option value="g">g</option>
        <option value="pcs">pcs</option>
      </select>
      <input
        v-model.number="form.package_size"
        type="number"
        min="0"
        step="any"
        class="field field--num"
        placeholder="Isi kemasan"
        :disabled="saving"
      />
      <input
        v-model.number="form.package_cost"
        type="number"
        min="0"
        step="any"
        class="field field--num"
        placeholder="Harga kemasan"
        :disabled="saving"
      />
      <button type="submit" class="add-btn" :disabled="saving || !formValid">
        <IconLoader2 v-if="saving" :size="16" class="spin" />
        <component :is="editingId ? IconCheck : IconPlus" v-else :size="16" />
        <span>{{ editingId ? 'Simpan' : 'Tambah' }}</span>
      </button>
      <button v-if="editingId" type="button" class="cancel-btn" :disabled="saving" @click="resetForm">
        Batal
      </button>
    </form>

    <p v-if="unitCostPreview !== null" class="unit-preview">
      Perkiraan biaya satuan: <strong>{{ formatRupiah(unitCostPreview) }} / {{ form.base_unit }}</strong>
    </p>

    <!-- Loading -->
    <div v-if="pending" class="skeleton-list">
      <div v-for="n in 5" :key="n" class="skeleton-item" />
    </div>

    <!-- Empty -->
    <div v-else-if="ingredients.length === 0" class="empty-state">
      Belum ada bahan baku. Tambah lewat form di atas.
    </div>

    <!-- List -->
    <ul v-else class="ing-list">
      <li v-for="ing in ingredients" :key="ing.id" class="ing-row" :class="{ 'ing-row--inactive': !ing.is_active }">
        <NuxtLink :to="`/ingredients/${ing.id}`" class="ing-main">
          <span class="ing-name">{{ ing.name }}</span>
          <span class="ing-meta">
            {{ ing.package_size }} {{ ing.base_unit }} · {{ formatRupiah(ing.package_cost) }}
          </span>
        </NuxtLink>
        <span class="ing-unitcost">{{ formatRupiah(ing.unit_cost) }} / {{ ing.base_unit }}</span>
        <div class="row-actions">
          <button
            type="button"
            class="icon-btn"
            :aria-label="ing.is_active ? 'Nonaktifkan' : 'Aktifkan'"
            :disabled="togglingId === ing.id"
            @click="toggleActive(ing)"
          >
            <IconEye v-if="ing.is_active" :size="16" />
            <IconEyeOff v-else :size="16" />
          </button>
          <button type="button" class="icon-btn" aria-label="Edit" @click="startEdit(ing)">
            <IconPencil :size="16" />
          </button>
          <button
            type="button"
            class="icon-btn icon-btn--danger"
            aria-label="Hapus"
            @click="deleteTarget = ing"
          >
            <IconTrash :size="16" />
          </button>
        </div>
      </li>
    </ul>

    <UiConfirmDialog
      :open="!!deleteTarget"
      title="Hapus bahan?"
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
import { IconPlus, IconPencil, IconTrash, IconLoader2, IconCheck, IconEye, IconEyeOff } from '@tabler/icons-vue'
import { useToast } from 'vue-toastification'
import { useIngredientApi } from '~/api/ingredient-api'
import type { BaseUnit, Ingredient } from '~/types/ingredient'

const toast = useToast()
const { formatRupiah } = useFormatRupiah()
const api = useIngredientApi()

const { data, pending, refresh } = await useAsyncData('ingredients', () => api.list())
const ingredients = computed(() => data.value?.data ?? [])

interface FormState {
  name: string
  base_unit: BaseUnit
  package_size: number | null
  package_cost: number | null
}

function emptyForm(): FormState {
  return { name: '', base_unit: 'ml', package_size: null, package_cost: null }
}

const form = reactive<FormState>(emptyForm())
const editingId = ref<string | null>(null)
const saving = ref(false)
const togglingId = ref<string | null>(null)

// Live unit-cost preview — computed by the BE (no FE math)
const unitCostPreview = ref<number | null>(null)
let previewTimer: ReturnType<typeof setTimeout> | null = null

watch(
  [() => form.package_size, () => form.package_cost],
  () => {
    if (previewTimer) clearTimeout(previewTimer)
    const size = form.package_size
    const cost = form.package_cost
    if (typeof size !== 'number' || size <= 0 || typeof cost !== 'number' || cost < 0) {
      unitCostPreview.value = null
      return
    }
    previewTimer = setTimeout(async () => {
      try {
        const res = await api.calcUnitCost(size, cost)
        unitCostPreview.value = res.data.unit_cost
      } catch {
        unitCostPreview.value = null
      }
    }, 300)
  },
)

onUnmounted(() => {
  if (previewTimer) clearTimeout(previewTimer)
})

const deleteTarget = ref<Ingredient | null>(null)
const deleting = ref(false)

const deleteMessage = computed(() =>
  deleteTarget.value
    ? `Hapus bahan "${deleteTarget.value.name}"? Bahan yang dipakai di resep tidak bisa dihapus.`
    : '',
)

const formValid = computed(
  () =>
    form.name.trim().length > 0 &&
    typeof form.package_size === 'number' &&
    form.package_size > 0 &&
    typeof form.package_cost === 'number' &&
    form.package_cost >= 0,
)

function resetForm() {
  Object.assign(form, emptyForm())
  editingId.value = null
}

function startEdit(ing: Ingredient) {
  editingId.value = ing.id
  form.name = ing.name
  form.base_unit = ing.base_unit
  form.package_size = ing.package_size
  form.package_cost = ing.package_cost
}

async function submitForm() {
  if (!formValid.value || form.package_size === null || form.package_cost === null) return
  saving.value = true
  const payload = {
    name: form.name.trim(),
    base_unit: form.base_unit,
    package_size: form.package_size,
    package_cost: form.package_cost,
  }
  try {
    if (editingId.value) {
      await api.update(editingId.value, payload)
      toast.success('Bahan diperbarui')
    } else {
      await api.create(payload)
      toast.success('Bahan ditambah')
    }
    resetForm()
    await refresh()
  } catch {
    toast.error('Gagal menyimpan bahan')
  } finally {
    saving.value = false
  }
}

async function toggleActive(ing: Ingredient) {
  togglingId.value = ing.id
  try {
    await api.update(ing.id, { is_active: !ing.is_active })
    await refresh()
  } catch {
    toast.error('Gagal mengubah status bahan')
  } finally {
    togglingId.value = null
  }
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    await api.remove(deleteTarget.value.id)
    toast.success('Bahan dihapus')
    deleteTarget.value = null
    await refresh()
  } catch (error) {
    const status = (error as { statusCode?: number })?.statusCode
    toast.error(status === 409 ? 'Bahan dipakai di resep, tidak bisa dihapus' : 'Gagal menghapus bahan')
  } finally {
    deleting.value = false
  }
}
</script>

<style scoped>
.ingredients-page {
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

.ing-form {
  display: flex;
  flex-wrap: wrap;
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

.field--unit {
  flex: 0 0 80px;
}

.field--num {
  flex: 1 1 120px;
  min-width: 0;
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

.unit-preview {
  font-size: 13px;
  color: var(--color-text-subtle);
  margin-top: -4px;
}

.unit-preview strong {
  color: var(--color-text);
}

.ing-list {
  list-style: none;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 0 12px;
}

.ing-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 4px;
  border-bottom: 1px solid var(--color-border);
}

.ing-row:last-child {
  border-bottom: none;
}

.ing-row--inactive {
  opacity: 0.55;
}

.ing-main {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
  text-decoration: none;
  color: inherit;
  cursor: pointer;
}

.ing-main:hover .ing-name {
  text-decoration: underline;
}

.ing-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
}

.ing-meta {
  font-size: 12px;
  color: var(--color-text-subtle);
}

.ing-unitcost {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
  white-space: nowrap;
  flex-shrink: 0;
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

.icon-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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
