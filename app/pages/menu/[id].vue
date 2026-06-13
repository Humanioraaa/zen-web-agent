<template>
  <div class="builder-page">
    <div class="page-head">
      <NuxtLink to="/menu" class="back-link"><IconArrowLeft :size="18" /></NuxtLink>
      <h1 class="page-heading">Atur Menu</h1>
      <button type="button" class="del-btn" aria-label="Hapus menu" @click="confirmDeleteOpen = true">
        <IconTrash :size="18" />
      </button>
    </div>

    <!-- Menu meta -->
    <div class="meta-card">
      <label class="form-row">
        <span class="form-label">Nama</span>
        <input v-model="meta.name" type="text" class="field" :disabled="saving" />
      </label>
      <div class="meta-grid">
        <label class="form-row">
          <span class="form-label">Kategori</span>
          <select v-model="meta.category_id" class="field" :disabled="saving">
            <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </label>
        <label class="form-row">
          <span class="form-label">Harga jual (Rp)</span>
          <input v-model.number="meta.selling_price" type="number" min="0" step="any" class="field" :disabled="saving" />
        </label>
      </div>
    </div>

    <!-- Recipe builder -->
    <div class="recipe-section">
      <div class="recipe-head">
        <h2 class="section-title">Resep</h2>
        <button type="button" class="ghost-btn" :disabled="saving" @click="addRow">
          <IconPlus :size="15" /><span>Bahan</span>
        </button>
      </div>

      <div v-if="rows.length === 0" class="empty-mini">Belum ada bahan. Tap "Bahan".</div>

      <ul v-else class="row-list">
        <li v-for="(row, idx) in rows" :key="idx" class="recipe-row">
          <select v-model="row.ingredient_id" class="field field--ing" :disabled="saving">
            <option value="" disabled>Pilih bahan</option>
            <option v-for="ing in ingredients" :key="ing.id" :value="ing.id">{{ ing.name }} ({{ ing.base_unit }})</option>
          </select>
          <input
            v-model.number="row.quantity"
            type="number"
            min="0"
            step="any"
            class="field field--qty"
            :placeholder="unitOf(row.ingredient_id)"
            :disabled="saving"
          />
          <span class="line-cost">{{ lineCostOf(row.ingredient_id) }}</span>
          <button type="button" class="icon-btn icon-btn--danger" aria-label="Hapus baris" :disabled="saving" @click="removeRow(idx)">
            <IconX :size="16" />
          </button>
        </li>
      </ul>
    </div>

    <!-- Live totals (computed by BE) -->
    <div class="totals-card">
      <div class="total-line">
        <span>HPP</span>
        <strong>{{ preview ? formatRupiah(preview.hpp) : '—' }}</strong>
      </div>
      <div class="total-line">
        <span>Margin</span>
        <strong>
          {{ preview ? formatRupiah(preview.margin) : '—' }}
          <span v-if="preview && preview.margin_pct !== null" class="pct">({{ preview.margin_pct }}%)</span>
        </strong>
      </div>
      <div class="total-line">
        <span>Status</span>
        <span v-if="preview" class="health-badge" :class="healthClass(preview.health)">{{ healthLabel(preview.health) }}</span>
        <span v-else>—</span>
      </div>
    </div>

    <button type="button" class="save-btn" :disabled="saving || !canSave" @click="save">
      <IconLoader2 v-if="saving" :size="16" class="spin" />
      <IconDeviceFloppy v-else :size="16" />
      <span>Simpan</span>
    </button>

    <UiConfirmDialog
      :open="confirmDeleteOpen"
      title="Hapus menu?"
      :message="`Hapus menu &quot;${meta.name}&quot;? Resepnya ikut terhapus.`"
      confirm-label="Hapus"
      danger
      :loading="deleting"
      @confirm="doDelete"
      @cancel="confirmDeleteOpen = false"
    />
  </div>
</template>

<script setup lang="ts">
import { IconArrowLeft, IconPlus, IconX, IconTrash, IconLoader2, IconDeviceFloppy } from '@tabler/icons-vue'
import { useToast } from 'vue-toastification'
import { useMenuApi } from '~/api/menu-api'
import { useIngredientApi } from '~/api/ingredient-api'
import { useMenuCategoryApi } from '~/api/menu-category-api'
import type { MenuCalculateResult } from '~/types/menu'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const { formatRupiah } = useFormatRupiah()
const { healthLabel, healthClass } = useMenuHealth()
const menuApi = useMenuApi()
const ingApi = useIngredientApi()
const catApi = useMenuCategoryApi()

const id = route.params.id as string

const [{ data: detailData }, { data: ingData }, { data: catData }] = await Promise.all([
  useAsyncData(`menu-detail-${id}`, () => menuApi.get(id)),
  useAsyncData('builder-ingredients', () => ingApi.list(true)),
  useAsyncData('builder-categories', () => catApi.list()),
])

const ingredients = computed(() => ingData.value?.data ?? [])
const categories = computed(() => catData.value?.data ?? [])

interface Row {
  ingredient_id: string
  quantity: number | null
}

const detail = detailData.value?.data
const meta = reactive({
  name: detail?.name ?? '',
  category_id: detail?.category_id ?? '',
  selling_price: detail?.selling_price ?? 0,
})
const rows = ref<Row[]>((detail?.recipe ?? []).map((r) => ({ ingredient_id: r.ingredient_id, quantity: r.quantity })))

const preview = ref<MenuCalculateResult | null>(detail
  ? { hpp: detail.hpp, margin: detail.margin, margin_pct: detail.margin_pct, health: detail.health, lines: detail.recipe.map((r) => ({ ingredient_id: r.ingredient_id, line_cost: r.line_cost })) }
  : null)

const saving = ref(false)
const confirmDeleteOpen = ref(false)
const deleting = ref(false)

function unitOf(ingredientId: string): string {
  return ingredients.value.find((i) => i.id === ingredientId)?.base_unit ?? 'jumlah'
}

function lineCostOf(ingredientId: string): string {
  const line = preview.value?.lines.find((l) => l.ingredient_id === ingredientId)
  return line ? formatRupiah(line.line_cost) : '—'
}

function validRows(): { ingredient_id: string; quantity: number }[] {
  return rows.value
    .filter((r) => r.ingredient_id && typeof r.quantity === 'number' && r.quantity > 0)
    .map((r) => ({ ingredient_id: r.ingredient_id, quantity: r.quantity as number }))
}

const canSave = computed(() => meta.name.trim().length > 0 && !!meta.category_id && typeof meta.selling_price === 'number')

function addRow() {
  rows.value.push({ ingredient_id: '', quantity: null })
}

function removeRow(idx: number) {
  rows.value.splice(idx, 1)
}

// Debounced BE preview — all math on the backend
let debounceTimer: ReturnType<typeof setTimeout> | null = null
async function recompute() {
  if (!meta.category_id || typeof meta.selling_price !== 'number') return
  try {
    const res = await menuApi.calculate({
      category_id: meta.category_id,
      selling_price: meta.selling_price,
      items: validRows(),
    })
    preview.value = res.data
  } catch {
    // preview failure is non-fatal; leave last value
  }
}

watch(
  [() => meta.category_id, () => meta.selling_price, rows],
  () => {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(recompute, 300)
  },
  { deep: true },
)

onUnmounted(() => {
  if (debounceTimer) clearTimeout(debounceTimer)
})

async function save() {
  if (!canSave.value) return
  // guard duplicate ingredients before hitting API
  const ids = validRows().map((r) => r.ingredient_id)
  if (new Set(ids).size !== ids.length) {
    toast.error('Ada bahan dobel di resep')
    return
  }
  saving.value = true
  try {
    await menuApi.update(id, {
      name: meta.name.trim(),
      category_id: meta.category_id,
      selling_price: meta.selling_price,
    })
    const res = await menuApi.saveRecipe(id, validRows())
    preview.value = {
      hpp: res.data.hpp,
      margin: res.data.margin,
      margin_pct: res.data.margin_pct,
      health: res.data.health,
      lines: res.data.recipe.map((r) => ({ ingredient_id: r.ingredient_id, line_cost: r.line_cost })),
    }
    toast.success('Menu disimpan')
  } catch {
    toast.error('Gagal menyimpan menu')
  } finally {
    saving.value = false
  }
}

async function doDelete() {
  deleting.value = true
  try {
    await menuApi.remove(id)
    toast.success('Menu dihapus')
    router.push('/menu')
  } catch {
    toast.error('Gagal menghapus menu')
    deleting.value = false
    confirmDeleteOpen.value = false
  }
}
</script>

<style scoped>
.builder-page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 640px;
  padding-top: 0.5rem;
}

.page-head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.back-link {
  display: inline-flex;
  color: var(--color-text-subtle);
}

.page-heading {
  font-size: 20px;
  font-weight: 700;
  color: var(--color-text);
  flex: 1;
}

.del-btn {
  display: inline-flex;
  background: transparent;
  border: none;
  color: var(--color-text-subtle);
  cursor: pointer;
}

.del-btn:hover {
  color: var(--color-danger);
}

.meta-card,
.totals-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 14px;
}

.meta-grid {
  display: flex;
  gap: 10px;
}

.meta-grid .form-row {
  flex: 1;
  min-width: 0;
}

.form-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-subtle);
}

.field {
  padding: 10px 12px;
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

.recipe-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.recipe-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-title {
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  color: var(--color-text-subtle);
}

.ghost-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}

.row-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.recipe-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.field--ing {
  flex: 1;
  min-width: 0;
}

.field--qty {
  width: 96px;
  flex-shrink: 0;
}

.line-cost {
  width: 90px;
  text-align: right;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
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
  flex-shrink: 0;
}

.icon-btn--danger:hover:not(:disabled) {
  color: var(--color-danger);
}

.empty-mini {
  font-size: 13px;
  color: var(--color-text-subtle);
  padding: 1rem;
  text-align: center;
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-sm);
}

.total-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 14px;
  color: var(--color-text-subtle);
}

.total-line strong {
  color: var(--color-text);
  font-size: 15px;
}

.pct {
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-subtle);
}

.health-badge {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  border-radius: 999px;
  padding: 2px 8px;
}

.health--safe {
  color: var(--color-success);
  background: color-mix(in srgb, var(--color-success) 14%, transparent);
}

.health--warning {
  color: var(--color-warning, #b45309);
  background: color-mix(in srgb, var(--color-warning, #b45309) 14%, transparent);
}

.health--danger {
  color: var(--color-danger);
  background: color-mix(in srgb, var(--color-danger) 14%, transparent);
}

.health--unknown {
  color: var(--color-text-subtle);
  background: var(--color-bg-subtle);
}

.save-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px 16px;
  background: var(--color-text);
  color: #ffffff;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.save-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
