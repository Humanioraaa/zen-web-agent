export interface InlineKeyboardButton {
  text: string
  callback_data: string
}

type InlineKeyboard = InlineKeyboardButton[][]

function buildApiUrl(method: string): string {
  const token = useRuntimeConfig().telegramBotToken
  return `https://api.telegram.org/bot${token}/${method}`
}

export async function sendMessage(
  chatId: number | string,
  text: string,
  keyboard?: InlineKeyboard,
): Promise<void> {
  await $fetch(buildApiUrl('sendMessage'), {
    method: 'POST',
    body: {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      ...(keyboard && {
        reply_markup: { inline_keyboard: keyboard },
      }),
    },
  })
}

export async function editMessage(
  chatId: number | string,
  messageId: number,
  text: string,
  keyboard?: InlineKeyboard,
): Promise<void> {
  await $fetch(buildApiUrl('editMessageText'), {
    method: 'POST',
    body: {
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: 'HTML',
      ...(keyboard && {
        reply_markup: { inline_keyboard: keyboard },
      }),
    },
  })
}

export async function answerCallbackQuery(callbackQueryId: string): Promise<void> {
  await $fetch(buildApiUrl('answerCallbackQuery'), {
    method: 'POST',
    body: { callback_query_id: callbackQueryId },
  })
}

export function confirmationKeyboard(): InlineKeyboard {
  return [
    [
      { text: '✅ Ya', callback_data: 'confirm_yes' },
      { text: '✏️ Edit', callback_data: 'confirm_edit' },
      { text: '❌ Batal', callback_data: 'confirm_cancel' },
    ],
  ]
}

export function smartConfirmKeyboard(categoryName: string): InlineKeyboard {
  return [
    [
      { text: `✅ Ya, ${categoryName}`, callback_data: 'smart_confirm_yes' },
      { text: '🔄 Pilih lain', callback_data: 'smart_choose_other' },
    ],
  ]
}

export function restockConfirmKeyboard(): InlineKeyboard {
  return [
    [
      { text: '✅ Simpan restock', callback_data: 'restock_confirm_yes' },
      { text: '❌ Batal', callback_data: 'restock_cancel' },
    ],
  ]
}

export function restockAnomalyKeyboard(direction: 'naik' | 'turun'): InlineKeyboard {
  return [
    [{ text: `✅ Harga memang ${direction}`, callback_data: 'restock_anomaly_accept' }],
    [
      { text: '🔢 Salah jumlah', callback_data: 'restock_anomaly_reqty' },
      { text: '➖ Catat saja', callback_data: 'restock_anomaly_keep' },
    ],
  ]
}

export function disambiguationKeyboard(candidates: { id: string; name: string }[]): InlineKeyboard {
  const rows: InlineKeyboard = candidates.map((c) => [
    { text: `✅ ${c.name}`, callback_data: `disambig_${c.id}` },
  ])
  rows.push([{ text: '🚫 Bukan, ini bukan bahan', callback_data: 'disambig_none' }])
  return rows
}

export function categoryKeyboard(categories: { id: string; name: string }[]): InlineKeyboard {
  const rows: InlineKeyboard = []
  for (let i = 0; i < categories.length; i += 2) {
    const current = categories[i]!
    const next = categories[i + 1]
    const row: InlineKeyboardButton[] = [
      { text: current.name, callback_data: `category_${current.id}` },
    ]
    if (next) {
      row.push({ text: next.name, callback_data: `category_${next.id}` })
    }
    rows.push(row)
  }
  return rows
}
