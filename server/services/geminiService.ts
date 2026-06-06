import { GoogleGenerativeAI } from '@google/generative-ai'
import { serverSupabaseServiceRole } from '#supabase/server'
import type { H3Event } from 'h3'

export interface GeminiParseResult {
  type: 'expense' | 'income' | 'transfer' | 'query' | 'unknown'
  amount: number | null
  wallet: string | null
  wallet_to: string | null
  category: string | null
  item: string | null
  confidence: 'high' | 'low'
}

function buildSystemPrompt(
  walletNames: string[],
  expenseCategories: string[],
  incomeCategories: string[],
): string {
  return `You are a financial transaction parser for Zen Coffee, a coffee shop in Indonesia.
Extract transaction information from the user's message and return a JSON object.

Available wallets: ${walletNames.join(', ')}
Available expense categories: ${expenseCategories.join(', ')}
Available income categories: ${incomeCategories.join(', ')}

Rules:
- Amount can be written as: 15k = 15000, 150rb = 150000, 1jt = 1000000
- If wallet is not mentioned, set wallet to null
- If category is not mentioned, make your best guess based on the item name
- "susu", "kopi", "sirup", "cup", "sedotan" → Bahan Baku Bar
- "gula", "tepung", "mentega" → Bahan Baku Kitchen
- "listrik", "air", "internet", "sewa" → Operasional
- If message is a question about balance or summary, return type: "query"
- If message cannot be understood, return type: "unknown"

Return ONLY a valid JSON object, no explanation.

Response format:
{
  "type": "expense" | "income" | "transfer" | "query" | "unknown",
  "amount": number | null,
  "wallet": "${walletNames[0]}" | "${walletNames[1]}" | ... | null,
  "wallet_to": "${walletNames[0]}" | "${walletNames[1]}" | ... | null,
  "category": string | null,
  "item": string | null,
  "confidence": "high" | "low"
}`
}

async function loadDynamicPromptData(event: H3Event) {
  const client = serverSupabaseServiceRole(event)

  const [walletsResult, categoriesResult] = await Promise.all([
    client.from('wallets').select('name').eq('is_active', true).order('name'),
    client.from('categories').select('name, type').order('name'),
  ])

  const walletNames = (walletsResult.data ?? []).map(w => w.name)
  const expenseCategories = (categoriesResult.data ?? [])
    .filter(c => c.type === 'expense')
    .map(c => c.name)
  const incomeCategories = (categoriesResult.data ?? [])
    .filter(c => c.type === 'income')
    .map(c => c.name)

  return { walletNames, expenseCategories, incomeCategories }
}

function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenced?.[1]) return fenced[1].trim()
  return text.trim()
}

export async function parseTransaction(event: H3Event, text: string): Promise<GeminiParseResult> {
  const config = useRuntimeConfig()
  const genAI = new GoogleGenerativeAI(config.geminiApiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

  const { walletNames, expenseCategories, incomeCategories } = await loadDynamicPromptData(event)
  const systemPrompt = buildSystemPrompt(walletNames, expenseCategories, incomeCategories)

  try {
    const result = await model.generateContent({
      systemInstruction: systemPrompt,
      contents: [{ role: 'user', parts: [{ text }] }],
    })

    const responseText = result.response.text()
    const json = extractJson(responseText)
    const parsed = JSON.parse(json) as GeminiParseResult

    if (!parsed.type || !['expense', 'income', 'transfer', 'query', 'unknown'].includes(parsed.type)) {
      return { type: 'unknown', amount: null, wallet: null, wallet_to: null, category: null, item: null, confidence: 'low' }
    }

    return parsed
  } catch (error) {
    console.error('Gemini parse error:', error)
    return { type: 'unknown', amount: null, wallet: null, wallet_to: null, category: null, item: null, confidence: 'low' }
  }
}
