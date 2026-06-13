<template>
  <div class="menu-new-page">
    <div class="page-head">
      <NuxtLink to="/menu" class="back-link"><IconArrowLeft :size="18" /></NuxtLink>
      <h1 class="page-heading">Menu Baru</h1>
    </div>

    <form class="menu-form" @submit.prevent="submit">
      <label class="form-row">
        <span class="form-label">Nama menu</span>
        <input v-model="name" type="text" class="field" placeholder="mis. Es Kopi Susu" :disabled="saving" />
      </label>

      <label class="form-row">
        <span class="form-label">Kategori</span>
        <select v-model="categoryId" class="field" :disabled="saving || catPending">
          <option value="" disabled>Pilih kategori</option>
          <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
      </label>

      <label class="form-row">
        <span class="form-label">Harga jual (Rp)</span>
        <input v-model.number="sellingPrice" type="number" min="0" step="any" class="field" placeholder="mis. 18000" :disabled="saving" />
      </label>

      <button type="submit" class="add-btn" :disabled="saving || !valid">
        <IconLoader2 v-if="saving" :size="16" class="spin" />
        <IconCheck v-else :size="16" />
        <span>Buat & atur resep</span>
      </button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { IconArrowLeft, IconCheck, IconLoader2 } from '@tabler/icons-vue'
import { useToast } from 'vue-toastification'
import { useMenuApi } from '~/api/menu-api'
import { useMenuCategoryApi } from '~/api/menu-category-api'

const toast = useToast()
const router = useRouter()
const menuApi = useMenuApi()
const catApi = useMenuCategoryApi()

const { data: catData, pending: catPending } = await useAsyncData('menu-new-categories', () => catApi.list())
const categories = computed(() => catData.value?.data ?? [])

const name = ref('')
const categoryId = ref('')
const sellingPrice = ref<number | null>(null)
const saving = ref(false)

const valid = computed(
  () => name.value.trim().length > 0 && !!categoryId.value && typeof sellingPrice.value === 'number' && sellingPrice.value >= 0,
)

async function submit() {
  if (!valid.value || sellingPrice.value === null) return
  saving.value = true
  try {
    const res = await menuApi.create({
      name: name.value.trim(),
      category_id: categoryId.value,
      selling_price: sellingPrice.value,
    })
    toast.success('Menu dibuat')
    router.push(`/menu/${res.data.id}`)
  } catch {
    toast.error('Gagal membuat menu')
    saving.value = false
  }
}
</script>

<style scoped>
.menu-new-page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 480px;
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
}

.menu-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.form-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 13px;
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
  transition: border-color 0.15s;
}

.field:focus {
  border-color: var(--color-text);
}

.field:disabled {
  opacity: 0.5;
}

.add-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 11px 16px;
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
</style>
