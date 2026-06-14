<template>
  <form class="restock-form" @submit.prevent="onSave">
    <h2 class="section-title">Catat Pembelian (Restock)</h2>

    <div class="grid">
      <label class="form-row">
        <span class="form-label">Jumlah</span>
        <input
          v-model.number="form.qty_value"
          type="number"
          min="0"
          step="any"
          class="field"
          placeholder="mis. 2"
          :disabled="saving"
        />
      </label>
      <label class="form-row">
        <span class="form-label">Satuan</span>
        <select v-model="form.qty_unit" class="field" :disabled="saving">
          <option value="package">kemasan</option>
          <option value="base">{{ ingredient.base_unit }}</option>
        </select>
      </label>
      <label class="form-row">
        <span class="form-label">Total biaya (Rp)</span>
        <input
          v-model.number="form.total_cost"
          type="number"
          min="0"
          step="any"
          class="field"
          placeholder="total dibayar"
          :disabled="saving"
        />
      </label>
      <label class="form-row">
        <span class="form-label">Wallet (sumber dana)</span>
        <select v-model="form.wallet_id" class="field" :disabled="saving">
          <option value="" disabled>Pilih wallet</option>
          <option v-for="w in wallets" :key="w.id" :value="w.id">{{ w.name }}</option>
        </select>
      </label>
    </div>

    <!-- BE-computed preview -->
    <div v-if="preview" class="preview" :class="{ 'preview--anomaly': preview.verdict === 'anomaly' }">
      <div class="preview-line">
        <span>= {{ preview.packages }} kemasan</span>
        <strong>{{ formatRupiah(preview.package_cost) }} / kemasan</strong>
      </div>
      <div class="preview-line preview-line--sub">
        <span>Biaya satuan</span>
        <span>{{ formatRupiah(preview.unit_cost) }} / {{ preview.base_unit }}</span>
      </div>
      <div v-if="preview.pct_change !== null" class="preview-line preview-line--sub">
        <span>vs harga terakhir ({{ formatRupiah(preview.last_package_cost) }})</span>
        <span :class="changeClass">{{ changeLabel }}</span>
      </div>
    </div>

    <!-- Anomaly confirmation -->
    <div v-if="preview && preview.verdict === 'anomaly'" class="anomaly">
      <p class="anomaly-msg">
        Harga {{ preview.direction === 'naik' ? 'naik' : 'turun' }} {{ Math.abs(preview.pct_change ?? 0) }}%
        (lebih dari ambang {{ preview.threshold_pct }}%). Yakin?
      </p>
      <label class="anomaly-accept">
        <input v-model="acceptPrice" type="checkbox" :disabled="saving" />
        <span>Ya, harga memang {{ preview.direction === 'naik' ? 'naik' : 'turun' }} — perbarui biaya bahan</span>
      </label>
      <p class="anomaly-hint">
        Kalau tidak dicentang: pengeluaran tetap dicatat, tapi harga bahan dibiarkan (anggap salah jumlah / beli banyak).
      </p>
    </div>

    <button type="submit" class="save-btn" :disabled="saving || !canSave">
      <IconLoader2 v-if="saving" :size="16" class="spin" />
      <IconShoppingCartPlus v-else :size="16" />
      <span>Simpan Restock</span>
    </button>
  </form>
</template>

<script setup lang="ts">
import { IconLoader2, IconShoppingCartPlus } from '@tabler/icons-vue'
import { useToast } from 'vue-toastification'
import { useRestockApi } from '~/api/restock-api'
import type { Ingredient } from '~/types/ingredient'
import type { Wallet } from '~/types/models'
import type { QtyUnit, RestockPreview } from '~/types/restock'

const props = defineProps<{ ingredient: Ingredient; wallets: Wallet[] }>()
const emit = defineEmits<{ done: [] }>()

const toast = useToast()
const { formatRupiah } = useFormatRupiah()
const api = useRestockApi()

const form = reactive<{ qty_value: number | null; qty_unit: QtyUnit; total_cost: number | null; wallet_id: string }>({
  qty_value: null,
  qty_unit: 'package',
  total_cost: null,
  wallet_id: '',
})
const acceptPrice = ref(false)
const saving = ref(false)
const preview = ref<RestockPreview | null>(null)

const canSave = computed(
  () =>
    typeof form.qty_value === 'number' &&
    form.qty_value > 0 &&
    typeof form.total_cost === 'number' &&
    form.total_cost >= 0 &&
    !!form.wallet_id,
)

const changeLabel = computed(() => {
  const pct = preview.value?.pct_change
  if (pct === null || pct === undefined) return ''
  return `${pct > 0 ? '+' : ''}${pct}%`
})
const changeClass = computed(() => {
  const pct = preview.value?.pct_change ?? 0
  if (pct > 0) return 'change--up'
  if (pct < 0) return 'change--down'
  return ''
})

// Debounced BE preview — no FE price math
let timer: ReturnType<typeof setTimeout> | null = null
watch(
  [() => form.qty_value, () => form.qty_unit, () => form.total_cost],
  () => {
    if (timer) clearTimeout(timer)
    if (typeof form.qty_value !== 'number' || form.qty_value <= 0 || typeof form.total_cost !== 'number' || form.total_cost < 0) {
      preview.value = null
      return
    }
    timer = setTimeout(async () => {
      try {
        const res = await api.preview({
          ingredient_id: props.ingredient.id,
          qty_value: form.qty_value as number,
          qty_unit: form.qty_unit,
          total_cost: form.total_cost as number,
        })
        preview.value = res.data
        if (res.data.verdict !== 'anomaly') acceptPrice.value = false
      } catch {
        preview.value = null
      }
    }, 300)
  },
)

onUnmounted(() => {
  if (timer) clearTimeout(timer)
})

async function onSave() {
  if (!canSave.value) return
  saving.value = true
  try {
    await api.create({
      ingredient_id: props.ingredient.id,
      qty_value: form.qty_value as number,
      qty_unit: form.qty_unit,
      total_cost: form.total_cost as number,
      wallet_id: form.wallet_id,
      accept_price: acceptPrice.value,
    })
    toast.success('Restock dicatat')
    form.qty_value = null
    form.total_cost = null
    acceptPrice.value = false
    preview.value = null
    emit('done')
  } catch {
    toast.error('Gagal mencatat restock')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.restock-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 14px;
}

.section-title {
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  color: var(--color-text-subtle);
}

.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
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

.preview {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px;
  background: var(--color-bg-subtle);
  border-radius: var(--radius-sm);
}

.preview--anomaly {
  background: color-mix(in srgb, var(--color-danger) 8%, transparent);
}

.preview-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 14px;
  color: var(--color-text);
}

.preview-line--sub {
  font-size: 12px;
  color: var(--color-text-subtle);
}

.change--up {
  color: var(--color-danger);
  font-weight: 600;
}

.change--down {
  color: var(--color-success);
  font-weight: 600;
}

.anomaly {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border: 1px solid var(--color-danger);
  border-radius: var(--radius-sm);
  background: color-mix(in srgb, var(--color-danger) 6%, transparent);
}

.anomaly-msg {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-danger);
}

.anomaly-accept {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 13px;
  color: var(--color-text);
}

.anomaly-hint {
  font-size: 11px;
  color: var(--color-text-subtle);
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

.spin {
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
