import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import './style.css'

function App() {
  const [transactions, setTransactions] = useState([])
  const [form, setForm] = useState({
    type: 'expense',
    category: '',
    description: '',
    amount: '',
  })

  useEffect(() => {
    getTransactions()
  }, [])

  async function getTransactions() {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error) setTransactions(data)
  }

  async function addTransaction(e) {
    e.preventDefault()

    const { error } = await supabase.from('transactions').insert([
      {
        type: form.type,
        category: form.category,
        description: form.description,
        amount: Number(form.amount),
        source: 'web',
      },
    ])

    if (error) return alert(error.message)

    setForm({ type: 'expense', category: '', description: '', amount: '' })
    getTransactions()
  }

  const income = transactions
    .filter((x) => x.type === 'income')
    .reduce((a, b) => a + Number(b.amount), 0)

  const expense = transactions
    .filter((x) => x.type === 'expense')
    .reduce((a, b) => a + Number(b.amount), 0)

  const balance = income - expense

  return (
    <main className="page">
      <div className="container">
        <header className="header">
          <div>
            <h1>💰 Finance Tracker</h1>
            <p>Rekapan pemasukan dan pengeluaran harian</p>
          </div>
          <span className="badge">Personal Wallet</span>
        </header>

        <section className="summary">
          <div className="card green">
            <p>Pemasukan</p>
            <h2>Rp {income.toLocaleString('id-ID')}</h2>
          </div>

          <div className="card red">
            <p>Pengeluaran</p>
            <h2>Rp {expense.toLocaleString('id-ID')}</h2>
          </div>

          <div className="card blue">
            <p>Saldo</p>
            <h2>Rp {balance.toLocaleString('id-ID')}</h2>
          </div>
        </section>

        <section className="content">
          <form className="panel" onSubmit={addTransaction}>
            <h2>Tambah Transaksi</h2>

            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            >
              <option value="expense">Pengeluaran</option>
              <option value="income">Pemasukan</option>
            </select>

            <input
              placeholder="Kategori"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              required
            />

            <input
              placeholder="Deskripsi"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />

            <input
              type="number"
              placeholder="Nominal"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              required
            />

            <button>Simpan Transaksi</button>
          </form>

          <div className="panel">
            <h2>Riwayat Transaksi</h2>

            {transactions.map((item) => (
              <div className="transaction" key={item.id}>
                <div>
                  <b>{item.category}</b>
                  <p>{item.description || '-'}</p>
                </div>

                <strong className={item.type}>
                  {item.type === 'income' ? '+' : '-'} Rp{' '}
                  {Number(item.amount).toLocaleString('id-ID')}
                </strong>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}

export default App