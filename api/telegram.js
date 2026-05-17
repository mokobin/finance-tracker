import { createClient } from '@supabase/supabase-js'

const DASHBOARD_URL = 'https://finance-tracker-gold-alpha.vercel.app'

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

    if (text === '/start') {
  await reply(
    message.chat.id,
    `🤖 Selamat datang di Finance Tracker

Bot ini membantu mencatat pemasukan & pengeluaran otomatis.

📌 Contoh:
+35000000 uang koperasi 14 Mei
-500000 mingguan Dika 15 Mei

Ketik /help untuk bantuan lengkap.

📊 Dashboard:
https://finance-tracker-gold-alpha.vercel.app`
  )

  return res.status(200).json({ ok: true })
}

if (text === '/help') {
  await reply(
    message.chat.id,
    `📖 Panduan Penggunaan

➕ Pemasukan:
+1000000 gaji 15 mei

➖ Pengeluaran:
-25000 bakso 16 mei

📌 Command:
• /saldo
• /help
• /start

📊 Dashboard:
https://finance-tracker-gold-alpha.vercel.app`
  )

  return res.status(200).json({ ok: true })
}

if (text === '/menu') {
  await reply(
    message.chat.id,
    `📋 Menu Finance Tracker

/start - Mulai bot
/help - Bantuan
/saldo - Lihat saldo

📊 Dashboard:
https://finance-tracker-gold-alpha.vercel.app`
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
💳 Saldo: Rp ${balance.toLocaleString('id-ID')}

📊 Dashboard:
${DASHBOARD_URL}`
      )

      return res.status(200).json({ ok: true })
    }

    if (!text.startsWith('+') && !text.startsWith('-')) {
      await reply(
        message.chat.id,
        `Format harus diawali + atau -

Contoh:
+35000000 uang koperasi 14 Mei
-500000 mingguan Dika 15 Mei`
      )
      return res.status(200).json({ ok: true })
    }

    const type = text.startsWith('+') ? 'income' : 'expense'
    const amountMatch = text.match(/[+-]\s*(\d+)/)
    const amount = amountMatch ? Number(amountMatch[1]) : 0

    const transactionDate = extractDate(text)

    const cleanText = text
      .replace(/[+-]\s*\d+/, '')
      .replace(/\b\d{1,2}\s+(januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember)\b/gi, '')
      .trim()

    const description = cleanText

    if (!amount || !description) {
      await reply(
        message.chat.id,
        `Format belum lengkap.

Contoh:
+35000000 uang koperasi 14 Mei
-500000 mingguan Dika 15 Mei`
      )
      return res.status(200).json({ ok: true })
    }

    const category = guessCategory(description, type)

    const { error } = await supabase.from('transactions').insert({
      type,
      category,
      description,
      amount,
      transaction_date: transactionDate,
      source: 'telegram',
      raw_message: text,
    })

    if (error) {
      await reply(message.chat.id, `Gagal simpan: ${error.message}`)
      return res.status(200).json({ ok: false })
    }

    await reply(
      message.chat.id,
      `✅ Tersimpan

${type === 'income' ? '📈 Pemasukan' : '📉 Pengeluaran'}: ${description}
💰 Nominal: Rp ${amount.toLocaleString('id-ID')}
📅 Tanggal: ${formatDate(transactionDate)}

📊 Dashboard:
${DASHBOARD_URL}`
    )

    return res.status(200).json({ ok: true })
  } catch (error) {
    return res.status(200).json({ ok: false, error: error.message })
  }
}

function extractDate(text) {
  const months = {
    januari: 0,
    februari: 1,
    maret: 2,
    april: 3,
    mei: 4,
    juni: 5,
    juli: 6,
    agustus: 7,
    september: 8,
    oktober: 9,
    november: 10,
    desember: 11,
  }

  const match = text.match(
    /\b(\d{1,2})\s+(januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember)\b/i
  )

  if (!match) return new Date().toISOString().split('T')[0]

  const day = Number(match[1])
  const month = months[match[2].toLowerCase()]
  const year = new Date().getFullYear()

  const date = new Date(year, month, day)
  return date.toISOString().split('T')[0]
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
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