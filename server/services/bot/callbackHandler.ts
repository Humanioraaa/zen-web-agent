import { serverSupabaseServiceRole } from '#supabase/server'
import type { H3Event, AppUser, BotSession } from './types'
import {
  saveSession,
  clearSession,
} from '~~/server/repositories/botSessionRepository'
import { getCategories } from '~~/server/repositories/categoryRepository'
import { getIngredientById } from '~~/server/repositories/ingredient-repository'
import {
  sendMessage,
  editMessage,
  categoryKeyboard,
} from '~~/server/services/telegramService'
import {
  saveTransactionFromSession,
  editConfirmationMessage,
  updateSmartLearning,
} from './utils'
import { startRestockFlow, commitOrPin } from './restockHandler'

export async function handleCallbackQuery(
  event: H3Event,
  user: AppUser,
  session: BotSession,
  chatId: number,
  callbackData: string,
  messageId: number,
): Promise<void> {
  // --- Sprint 12: restock disambiguation ---
  if (callbackData === 'disambig_none' && session.state === 'AWAITING_DISAMBIGUATION') {
    await clearSession(event, session.telegram_user_id)
    await editMessage(chatId, messageId, '🚫 Oke, dianggap bukan bahan. Kalau mau dicatat sebagai pengeluaran biasa, ketik ulang dengan nama lain.')
    return
  }

  if (callbackData.startsWith('disambig_') && session.state === 'AWAITING_DISAMBIGUATION') {
    const ingredientId = callbackData.replace('disambig_', '')
    const ctx = session.context
    if (!ctx || ctx.total_cost == null) {
      await clearSession(event, session.telegram_user_id)
      return
    }
    const client = serverSupabaseServiceRole(event)
    const ing = await getIngredientById(event, ingredientId, client)
    await editMessage(chatId, messageId, `✅ ${ing.name}`)
    await startRestockFlow(event, session, chatId, {
      ingredient_id: ing.id,
      ingredient_name: ing.name,
      base_unit: ing.base_unit,
      total_cost: ctx.total_cost,
      wallet_id: ctx.wallet_id,
      qty_value: ctx.qty_value ?? null,
      qty_unit: ctx.qty_unit ?? null,
    })
    return
  }

  // --- Sprint 12: restock confirm / anomaly ---
  if (callbackData === 'restock_confirm_yes' && session.state === 'AWAITING_RESTOCK_CONFIRM') {
    await editMessage(chatId, messageId, '⏳ Memproses…')
    await commitOrPin(event, user, session, chatId)
    return
  }

  if (callbackData === 'restock_anomaly_accept' && session.state === 'AWAITING_RESTOCK_ANOMALY') {
    if (session.context) session.context.accept_price = true
    await editMessage(chatId, messageId, '⏳ Memproses…')
    await commitOrPin(event, user, session, chatId)
    return
  }

  if (callbackData === 'restock_anomaly_keep' && session.state === 'AWAITING_RESTOCK_ANOMALY') {
    if (session.context) session.context.accept_price = false
    await editMessage(chatId, messageId, '⏳ Memproses…')
    await commitOrPin(event, user, session, chatId)
    return
  }

  if (callbackData === 'restock_anomaly_reqty' && session.state === 'AWAITING_RESTOCK_ANOMALY') {
    session.state = 'AWAITING_RESTOCK_QTY'
    await saveSession(event, session)
    await editMessage(chatId, messageId, 'Oke, berapa jumlah yang benar?\nContoh: 2 pack atau 2000 ml')
    return
  }

  if (callbackData === 'restock_cancel') {
    await clearSession(event, session.telegram_user_id)
    await editMessage(chatId, messageId, '❌ Restock dibatalkan.')
    return
  }

  if (callbackData === 'confirm_yes' && session.state === 'AWAITING_CONFIRMATION') {
    if (session.context && session.context.amount > 500_000) {
      session.state = 'AWAITING_PIN'
      session.context.pin_attempts = 0
      await saveSession(event, session)
      await editMessage(chatId, messageId, 'Masukkan PIN untuk konfirmasi transaksi ini:')
      return
    }

    await saveTransactionFromSession(event, user, session)
    await clearSession(event, session.telegram_user_id)
    await editMessage(chatId, messageId, '✅ Dicatat!')
    return
  }

  if (callbackData === 'confirm_edit' && session.state === 'AWAITING_CONFIRMATION') {
    session.state = 'AWAITING_EDIT'
    await saveSession(event, session)
    await editMessage(chatId, messageId, 'Field mana yang ingin diubah?', [
      [
        { text: 'Nominal', callback_data: 'edit_amount' },
        { text: 'Kategori', callback_data: 'edit_category' },
        { text: 'Wallet', callback_data: 'edit_wallet' },
      ],
      [
        { text: 'Tanggal', callback_data: 'edit_date' },
        { text: 'Catatan', callback_data: 'edit_note' },
        { text: '❌ Batal', callback_data: 'edit_cancel' },
      ],
    ])
    return
  }

  if (callbackData === 'confirm_cancel') {
    await clearSession(event, session.telegram_user_id)
    await editMessage(chatId, messageId, '❌ Dibatalkan.')
    return
  }

  if (callbackData === 'edit_cancel' && session.state === 'AWAITING_EDIT') {
    session.state = 'AWAITING_CONFIRMATION'
    await saveSession(event, session)
    if (session.context) {
      await editConfirmationMessage(event, chatId, messageId, session.context)
    }
    return
  }

  if (callbackData.startsWith('edit_') && session.state === 'AWAITING_EDIT') {
    const field = callbackData.replace('edit_', '')
    const fieldLabels: Record<string, string> = {
      amount: 'nominal',
      category: 'kategori',
      wallet: 'wallet',
      date: 'tanggal',
      note: 'catatan',
    }
    session.state = 'AWAITING_EDIT_VALUE'
    if (session.context) {
      session.context.editing_field = field
    }
    await saveSession(event, session)
    await sendMessage(chatId, `Masukkan ${fieldLabels[field] ?? field} baru:`)
    return
  }

  if (callbackData === 'smart_confirm_yes' && session.state === 'AWAITING_SMART_CONFIRM') {
    session.state = 'AWAITING_CONFIRMATION'
    await saveSession(event, session)
    if (session.context) {
      await editConfirmationMessage(event, chatId, messageId, session.context)
    }
    return
  }

  if (callbackData === 'smart_choose_other' && session.state === 'AWAITING_SMART_CONFIRM') {
    const client = serverSupabaseServiceRole(event)
    if (session.context) {
      session.context.category_id = null
      const categories = await getCategories(event, session.context.type, client)
      session.state = 'AWAITING_CATEGORY_SELECTION'
      await saveSession(event, session)
      const label = session.context.item ?? 'transaksi ini'
      await editMessage(chatId, messageId, `Pilih kategori untuk "${label}":`, categoryKeyboard(categories))
    }
    return
  }

  if (callbackData.startsWith('category_') && session.state === 'AWAITING_CATEGORY_SELECTION') {
    const categoryId = callbackData.replace('category_', '')
    if (session.context) {
      session.context.category_id = categoryId
      if (session.context.item) {
        await updateSmartLearning(event, session.context.item, categoryId, session.context.wallet_id)
      }
    }
    session.state = 'AWAITING_CONFIRMATION'
    await saveSession(event, session)
    if (session.context) {
      await editConfirmationMessage(event, chatId, messageId, session.context)
    }
    return
  }
}
