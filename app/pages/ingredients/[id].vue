<template>
  <div class="detail-page">
    <div class="page-head">
      <NuxtLink to="/ingredients" class="back-link"><IconArrowLeft :size="18" /></NuxtLink>
      <h1 class="page-heading">{{ ingredient?.name ?? 'Bahan' }}</h1>
    </div>

    <div v-if="pending" class="skeleton" />

    <div v-else-if="!ingredient" class="empty-state">Bahan tidak ditemukan.</div>

    <template v-else>
      <!-- Info + threshold -->
      <div class="info-card">
        <div class="info-line">
          <span>Kemasan</span>
          <strong>{{ ingredient.package_size }} {{ ingredient.base_unit }} · {{ formatRupiah(ingredient.package_cost) }}</strong>
        </div>
        <div class="info-line">
          <span>Biaya satuan</span>
          <strong>{{ formatRupiah(ingredient.unit_cost) }} / {{ ingredient.base_unit }}</strong>
        </div>
        <div class="threshold-row">
          <label class="form-label" for="threshold">Ambang alert harga (%)</label>
          <div class="threshold-edit">
            <input
              id="threshold"
              v-model.number="thresholdInput"
              type="number"
              min="1"
              max="100"
              step="1"
              class="field field--threshold"
              placeholder="Default 20"
              :disabled="savingThreshold"
            />
            <button type="button" class="ghost-btn" :disabled="savingThreshold || !thresholdChanged" @click="saveThreshold">
              Simpan
            </button>
          </div>
        </div>
      </div>

      <IngredientRestockForm :ingredient="ingredient" :wallets="wallets" @done="onRestockDone" />

      <IngredientPriceHistory :history="history" />
    </template>
  </div>
</template>

<script setup lang="ts">
import { IconArrowLeft } from '@tabler/icons-vue'
import { useToast } from 'vue-toastification'
import { useIngredientApi } from '~/api/ingredient-api'
import { useWalletApi } from '~/api/wallet-api'

const route = useRoute()
const toast = useToast()
const { formatRupiah } = useFormatRupiah()
const ingApi = useIngredientApi()
const walletApi = useWalletApi()

const id = route.params.id as string

const [{ data: ingData, pending, refresh: refreshIng }, { data: walletData }, { data: historyData, refresh: refreshHistory }] =
  await Promise.all([
    useAsyncData(`ingredient-${id}`, () => ingApi.get(id)),
    useAsyncData('restock-wallets', () => walletApi.list()),
    useAsyncData(`price-history-${id}`, () => ingApi.priceHistory(id)),
  ])

const ingredient = computed(() => ingData.value?.data ?? null)
const wallets = computed(() => walletData.value?.data ?? [])
const history = computed(() => historyData.value?.data ?? [])

const thresholdInput = ref<number | null>(ingredient.value?.price_alert_threshold_pct ?? null)
const savingThreshold = ref(false)

watch(ingredient, (ing) => {
  thresholdInput.value = ing?.price_alert_threshold_pct ?? null
})

const thresholdChanged = computed(
  () => (thresholdInput.value ?? null) !== (ingredient.value?.price_alert_threshold_pct ?? null),
)

async function saveThreshold() {
  savingThreshold.value = true
  try {
    const value = typeof thresholdInput.value === 'number' ? thresholdInput.value : null
    await ingApi.update(id, { price_alert_threshold_pct: value })
    toast.success('Ambang alert disimpan')
    await refreshIng()
  } catch {
    toast.error('Gagal menyimpan ambang')
  } finally {
    savingThreshold.value = false
  }
}

async function onRestockDone() {
  await Promise.all([refreshIng(), refreshHistory()])
}
</script>

<style scoped>
.detail-page {
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

.info-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 14px;
}

.info-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 14px;
  color: var(--color-text-subtle);
}

.info-line strong {
  color: var(--color-text);
}

.threshold-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
  border-top: 1px solid var(--color-border);
  padding-top: 12px;
}

.form-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-subtle);
}

.threshold-edit {
  display: flex;
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
}

.field:focus {
  border-color: var(--color-text);
}

.field:disabled {
  opacity: 0.5;
}

.field--threshold {
  width: 120px;
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

.empty-state {
  font-size: 14px;
  color: var(--color-text-subtle);
  text-align: center;
  padding: 2.5rem 1rem;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.skeleton {
  height: 160px;
  background: var(--color-bg-subtle);
  border-radius: var(--radius-md);
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
</style>
