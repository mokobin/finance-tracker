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
    const text = message?.text?.trim() || ''

    if (!text) return res.status(200).json({ ok: true })

    if (text === '/start' || text === '/menu' || text === '/help') {
      await reply(
        message.chat.id,
        `🤖 Finance Tracker Bot

Format input:
+35000000 uang koperasi 14 Mei
-500000 mingguan Dika 15 Mei

Command:
/saldo - Lihat saldo
/help - Bantuan`
      )
      return res.status(200).json({ ok: true })
    }

    if (text === '/saldo') {
      const { data, error } = await supabase.from('transactions').select('*')

      if (error) {
        await reply(message.chat.id, `Gagal ambil saldo: ${error.message}`)
        return res.status(200).json({ ok: false })
      }

      const income = data
        .filter((x) => x.type === 'income')
        .reduce((a, b) => a + Number(b.amount), 0)

      const expense = data
        .filter((x) => x.type === 'expense')
        .reduce((a, b) => a + Number(b.amount), 0)

      const balance = income - expense

      await reply(
        message.chat.id,
        `💰 Saldo Saat Ini

📈 Pemasukan: Rp ${income.toLocaleString('id-ID')}
📉 Pengeluaran: Rp ${expense.toLocaleString('id-ID')}
💳 Saldo: Rp ${balance.toLocaleString('id-ID')}`
      )

      return res.status(200).json({ ok: true })
    }

    if (!text.startsWith('+') && !text.startsWith('-')) {
      await reply(
        message.chat.id,
        'Format harus diawali + atau -\n\nContoh:\n+35000000 uang koperasi 14 Mei\n-500000 mingguan Dika 15 Mei'
      )
      return res.status(200).json({ ok: true })
    }

    const type = text.startsWith('+') ? 'income' : 'expense'
    const amountMatch = text.match(/\d+/)
    const amount = amountMatch ? Number(amountMatch[0]) : 0

    const cleanText = text.replace('+', '').replace('-', '').trim()

    const description = cleanText
      .replace(/\d+/g, '')
      .replace(
        /\b(januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember)\b/gi,
        ''
      )
      .replace(/\b\d{1,2}\b/g, '')
      .trim()

    if (!amount || !description) {
      await reply(
        message.chat.id,
        'Format belum lengkap.\n\nContoh:\n+35000000 uang koperasi 14 Mei\n-500000 mingguan Dika 15 Mei'
      )
      return res.status(200).json({ ok: true })
    }

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
  `💰 Saldo Saat Ini

📈 Pemasukan: Rp ${income.toLocaleString('id-ID')}
📉 Pengeluaran: Rp ${expense.toLocaleString('id-ID')}
💳 Saldo: Rp ${balance.toLocaleString('id-ID')}

📊 Dashboard:
https://finance-tracker-gold-alpha.vercel.app`
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
  if (value.includes('mingguan')) return 'operasional'

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