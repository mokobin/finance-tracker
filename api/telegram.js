import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(200).send('Telegram webhook ready')
  }

  try {
    const message = req.body.message
    const text = message?.text || ''

    if (!text) {
      return res.status(200).json({ ok: true })
    }

    const amountMatch = text.match(/\d+/g)
    const amount = amountMatch ? Number(amountMatch.join('')) : 0
    const description = text.replace(/[0-9.]/g, '').trim()

    if (!amount || !description) {
      await reply(message.chat.id, 'Format: bakso 25000')
      return res.status(200).json({ ok: true })
    }

    const lower = text.toLowerCase()
    const type =
      lower.includes('gaji') ||
      lower.includes('bonus') ||
      lower.includes('income') ||
      lower.includes('masuk')
        ? 'income'
        : 'expense'

    const category = guessCategory(description, type)

    const { error } = await supabase.from('transactions').insert({
      type,
      category,
      description,
      amount,
      source: 'telegram',
      raw_message: text,
    })

    if (error) {
      await reply(message.chat.id, `Gagal simpan: ${error.message}`)
      return res.status(200).json({ ok: false })
    }

    await reply(
      message.chat.id,
      `✅ Tersimpan\n${type === 'income' ? 'Pemasukan' : 'Pengeluaran'}: ${description}\nNominal: Rp ${amount.toLocaleString('id-ID')}`
    )

    return res.status(200).json({ ok: true })
  } catch (error) {
    return res.status(200).json({ ok: false, error: error.message })
  }
}

function guessCategory(text, type) {
  const value = text.toLowerCase()

  if (type === 'income') return 'pemasukan'
  if (value.includes('bakso') || value.includes('makan') || value.includes('kopi')) return 'makan'
  if (value.includes('bensin') || value.includes('grab') || value.includes('gojek')) return 'transport'
  if (value.includes('listrik') || value.includes('air') || value.includes('wifi')) return 'tagihan'

  return 'lainnya'
}

async function reply(chatId, text) {
  await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
    }),
  })
}