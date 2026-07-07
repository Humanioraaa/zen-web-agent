<template>
  <div class="units-card">
    <div class="units-head">
      <h3 class="units-title">Satuan / Kemasan</h3>
      <button v-if="!editing" type="button" class="ghost-btn" @click="startEdit">Edit</button>
    </div>

    <!-- view -->
    <ul v-if="!editing" class="units-view">
      <li v-for="u in unitsSorted" :key="u.id" class="unit-line">
        <span class="unit-name">1 {{ u.label }}</span>
        <span v-if="!u.is_base" class="unit-eq">= {{ formatNum(u.factor_to_base) }} {{ base }}</span>
        <span v-else class="unit-base">satuan dasar (resep)</span>
      </li>
    </ul>

    <!-- edit -->
    <div v-else class="units-edit">
      <div v-for="(row, i) in rows" :key="i" class="edit-row">
        <input v-model="row.label" class="field field--label" placeholder="karton" :disabled="saving" />
        <span class="eq">berisi</span>
        <input v-model.number="row.per" type="number" min="0" step="any" class="field field--per" placeholder="12" :disabled="saving" />
        <span class="next">{{ nextLabel(i) }}</span>
        <button type="button" class="x-btn" :disabled="saving" @click="removeRow(i)">×</button>
      </div>
      <div class="base-row">1 {{ base }} — satuan dasar</div>
      <div class="edit-actions">
        <button type="button" class="ghost-btn" :disabled="saving" @click="addRow">+ Tingkat</button>
        <span class="spacer" />
        <button type="button" class="ghost-btn" :disabled="saving" @click="cancel">Batal</button>
        <button type="button" class="primary-btn" :disabled="saving" @click="save">{{ saving ? '...' : 'Simpan' }}</button>
      </div>
      <p class="hint">Urut dari terbesar ke terkecil. Contoh: "1 karton berisi 12 pcs", "1 pcs berisi 100 ml".</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useToast } from 'vue-toastification'
import { useIngredientApi } from '~/api/ingredient-api'
import type { Ingredient, IngredientUnit } from '~/types/ingredient'

const props = defineProps<{ ingredient: Ingredient }>()
const toast = useToast()
const api = useIngredientApi()

const base = computed(() => props.ingredient.base_unit)
const { data, refresh } = useAsyncData(`ingredient-units-${props.ingredient.id}`, () => api.units(props.ingredient.id))
const units = computed<IngredientUnit[]>(() => data.value?.data ?? [])
const unitsSorted = computed(() => [...units.value].sort((a, b) => a.sort_order - b.sort_order))

const editing = ref(false)
const saving = ref(false)
const rows = ref<{ label: string; per: number }[]>([])

const numFmt = new Intl.NumberFormat('id-ID')
function formatNum(n: number): string {
  return numFmt.format(n)
}

// next-smaller unit name for row i (next row's label, or the base unit for the last row)
function nextLabel(i: number): string {
  return rows.value[i + 1]?.label?.trim() || base.value
}

function startEdit() {
  // non-base tiers largest→smallest; convert absolute factors back to relative `per`
  const nonBase = unitsSorted.value.filter((u) => !u.is_base)
  const factors = [...nonBase.map((u) => u.factor_to_base), 1] // append base factor (1)
  rows.value = nonBase.map((u, i) => ({ label: u.label, per: factors[i]! / factors[i + 1]! }))
  editing.value = true
}
function addRow() {
  rows.value.push({ label: '', per: 1 })
}
function removeRow(i: number) {
  rows.value.splice(i, 1)
}
function cancel() {
  editing.value = false
}

async function save() {
  saving.value = true
  try {
    await api.saveUnits(props.ingredient.id, rows.value.map((r) => ({ label: r.label.trim(), per: r.per })))
    toast.success('Satuan disimpan')
    await refresh()
    editing.value = false
  } catch (e) {
    const m = e as { data?: { statusMessage?: string }; statusMessage?: string }
    toast.error(m?.data?.statusMessage ?? m?.statusMessage ?? 'Gagal menyimpan satuan')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.units-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 14px;
}
.units-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.units-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text);
}
.units-view {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.unit-line {
  display: flex;
  gap: 8px;
  font-size: 14px;
  color: var(--color-text);
}
.unit-name {
  font-weight: 600;
  min-width: 90px;
}
.unit-eq {
  color: var(--color-text-subtle);
}
.unit-base {
  color: var(--color-text-subtle);
  font-style: italic;
}
.units-edit {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.edit-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.eq,
.next {
  font-size: 13px;
  color: var(--color-text-subtle);
  white-space: nowrap;
}
.base-row {
  font-size: 13px;
  color: var(--color-text-subtle);
  font-style: italic;
  padding: 2px 0;
}
.field {
  padding: 8px 10px;
  font-size: 14px;
  color: var(--color-text);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  outline: none;
}
.field:focus {
  border-color: var(--color-text);
}
.field:disabled {
  opacity: 0.5;
}
.field--label {
  width: 110px;
}
.field--per {
  width: 80px;
}
.edit-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
}
.spacer {
  flex: 1;
}
.x-btn {
  width: 28px;
  height: 28px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text-subtle);
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
}
.ghost-btn {
  padding: 8px 14px;
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}
.ghost-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.primary-btn {
  padding: 8px 16px;
  background: var(--color-text);
  color: #ffffff;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
.primary-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.hint {
  font-size: 12px;
  color: var(--color-text-subtle);
}
</style>
