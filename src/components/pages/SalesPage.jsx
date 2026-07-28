import { useState, useEffect, useMemo } from 'react'
import { Plus, Trash2, Check, X, AlertCircle, Pencil, DollarSign } from 'lucide-react'
import { getMySales, addSale, updateSale, deleteSale } from '../../lib/supabase'

// Full = new programme sale; Addon = upsell / add-on purchase
const SALE_TYPES = [
  { value: 'full',  label: 'Full Sale',  desc: 'Full programme purchase' },
  { value: 'addon', label: 'Add-on',     desc: 'Upsell / add-on to existing' },
]
const TYPE_STYLE = {
  full:  { bg: 'bg-blush-50',   text: 'text-blush-700',  border: 'border-blush-200'  },
  addon: { bg: 'bg-violet-50',  text: 'text-violet-700', border: 'border-violet-200' },
}
const STATUS_STYLE = {
  pending: { label: 'Pending',  bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200'  },
  paid:    { label: 'Paid',     bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
}

const COMMISSION_KEY = ws => `wd_commission_rate_${ws}`

function fmtCurrency(n) {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 2 }).format(n || 0)
}
function fmtDate(iso) {
  if (!iso) return ''
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}
function calcCommission(amount, rate) {
  return (parseFloat(amount) || 0) * (parseFloat(rate) || 0) / 100
}

// ─── Form ─────────────────────────────────────────────────────────────────────
function SaleForm({ initial = {}, defaultRate, onSave, onClose, title = 'Add Sale' }) {
  const today = new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState({
    client:          initial.client          || '',
    product:         initial.product         || '',
    sale_type:       initial.sale_type       || 'full',
    amount:          initial.amount          != null ? String(initial.amount) : '',
    commission_rate: initial.commission_rate != null ? String(initial.commission_rate) : String(defaultRate),
    date:            initial.date            || today,
    status:          initial.status          || 'pending',
    notes:           initial.notes           || '',
  })

  const commAmt = calcCommission(form.amount, form.commission_rate)

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.client.trim() || !form.amount) return
    onSave({
      ...form,
      client:          form.client.trim(),
      product:         form.product.trim(),
      amount:          parseFloat(form.amount),
      commission_rate: parseFloat(form.commission_rate),
      notes:           form.notes.trim(),
    })
  }

  return (
    <div className="bg-white border-2 border-blush-200 rounded-2xl p-5 space-y-3 mb-5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sand-900 text-sm">{title}</h3>
        <button onClick={onClose} className="text-sand-300 hover:text-sand-500"><X className="w-4 h-4"/></button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">

        {/* Client name */}
        <div>
          <label className="text-xs text-sand-400 mb-1 block">Client name</label>
          <input
            value={form.client} onChange={e => setForm(f => ({ ...f, client: e.target.value }))}
            placeholder="e.g. Sarah Jones" autoFocus required
            className="w-full text-sm bg-sand-50 border border-sand-200 rounded-xl px-4 py-2.5 text-sand-800 placeholder-sand-400 focus:ring-2 focus:ring-blush-200 focus:outline-none"
          />
        </div>

        {/* What was sold */}
        <div>
          <label className="text-xs text-sand-400 mb-1 block">What was sold</label>
          <input
            value={form.product} onChange={e => setForm(f => ({ ...f, product: e.target.value }))}
            placeholder="e.g. 6-Month Coaching Program, Resume Review…"
            className="w-full text-sm bg-sand-50 border border-sand-200 rounded-xl px-4 py-2.5 text-sand-800 placeholder-sand-400 focus:ring-2 focus:ring-blush-200 focus:outline-none"
          />
        </div>

        {/* Type toggle */}
        <div>
          <label className="text-xs text-sand-400 mb-1.5 block">Sale type</label>
          <div className="flex gap-2">
            {SALE_TYPES.map(t => (
              <button key={t.value} type="button"
                onClick={() => setForm(f => ({ ...f, sale_type: t.value }))}
                className={`flex-1 text-xs font-semibold px-3 py-2 rounded-xl border transition-colors ${
                  form.sale_type === t.value
                    ? t.value === 'full'
                      ? 'bg-blush-500 border-blush-500 text-white'
                      : 'bg-violet-500 border-violet-500 text-white'
                    : 'bg-white border-sand-200 text-sand-400 hover:border-sand-300'
                }`}>
                {t.label}
                <span className={`block text-[10px] font-normal mt-0.5 ${form.sale_type === t.value ? 'opacity-80' : 'opacity-0'}`}>
                  {t.desc}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Amount + Rate */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-sand-400 mb-1 block">
              {form.sale_type === 'addon' ? 'Extra amount spent ($)' : 'Amount spent ($)'}
            </label>
            <input
              type="number" min="0" step="0.01"
              value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              placeholder="0.00" required
              className="w-full text-sm bg-sand-50 border border-sand-200 rounded-xl px-4 py-2.5 text-sand-800 placeholder-sand-400 focus:ring-2 focus:ring-blush-200 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-sand-400 mb-1 block">Commission rate (%)</label>
            <input
              type="number" min="0" max="100" step="0.1"
              value={form.commission_rate} onChange={e => setForm(f => ({ ...f, commission_rate: e.target.value }))}
              required
              className="w-full text-sm bg-sand-50 border border-sand-200 rounded-xl px-4 py-2.5 text-sand-800 focus:ring-2 focus:ring-blush-200 focus:outline-none"
            />
          </div>
        </div>

        {form.amount && (
          <p className="text-xs text-blush-600 font-semibold bg-blush-50 border border-blush-100 rounded-lg px-3 py-2">
            Commission: {fmtCurrency(commAmt)}
          </p>
        )}

        {/* Date + Status */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-sand-400 mb-1 block">Date</label>
            <input
              type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              className="w-full text-sm bg-sand-50 border border-sand-200 rounded-xl px-3 py-2.5 text-sand-800 focus:ring-2 focus:ring-blush-200 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-sand-400 mb-1 block">Commission status</label>
            <select
              value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
              className="w-full text-sm bg-sand-50 border border-sand-200 rounded-xl px-3 py-2.5 text-sand-800 focus:ring-2 focus:ring-blush-200 focus:outline-none"
            >
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
            </select>
          </div>
        </div>

        <textarea
          value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          placeholder="Notes… (optional)" rows={2}
          className="w-full text-sm bg-sand-50 border border-sand-200 rounded-xl px-4 py-2.5 text-sand-700 placeholder-sand-400 focus:ring-2 focus:ring-blush-200 focus:outline-none resize-none"
        />

        <div className="flex gap-2">
          <button type="button" onClick={onClose}
            className="flex-1 text-sm text-sand-500 py-2 rounded-xl border border-sand-200 hover:bg-sand-50 transition-colors">Cancel</button>
          <button type="submit"
            className="flex-1 text-sm bg-blush-500 hover:bg-blush-600 text-white py-2 rounded-xl font-semibold transition-colors">Save</button>
        </div>
      </form>
    </div>
  )
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color = 'sand' }) {
  const ring = {
    blush:   'bg-blush-50 border-blush-200',
    emerald: 'bg-emerald-50 border-emerald-200',
    amber:   'bg-amber-50 border-amber-200',
    sand:    'bg-sand-50 border-sand-200',
    violet:  'bg-violet-50 border-violet-200',
  }
  const txt = {
    blush:   'text-blush-700',
    emerald: 'text-emerald-700',
    amber:   'text-amber-700',
    sand:    'text-sand-700',
    violet:  'text-violet-700',
  }
  return (
    <div className={`rounded-2xl border p-4 ${ring[color]}`}>
      <p className="text-xs font-semibold text-sand-400 uppercase tracking-widest mb-1">{label}</p>
      <p className={`text-xl font-bold ${txt[color]}`}>{value}</p>
      {sub && <p className="text-xs text-sand-400 mt-0.5">{sub}</p>}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function SalesPage({ workspace = 'shaniah' }) {
  const [sales, setSales]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [err, setErr]           = useState(null)
  const [showAdd, setShowAdd]   = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [filterMonth, setFilterMonth] = useState('all')
  const [filterType, setFilterType]   = useState('all')

  const [defaultRate, setDefaultRate] = useState(() => {
    const s = localStorage.getItem(COMMISSION_KEY(workspace))
    return s ? parseFloat(s) : 10
  })
  const [editRate, setEditRate]   = useState(false)
  const [rateInput, setRateInput] = useState(String(defaultRate))

  useEffect(() => { load() }, [workspace])

  async function load() {
    setLoading(true)
    try { setSales(await getMySales(workspace)) }
    catch(e) { setErr(e.message) }
    setLoading(false)
  }

  function saveDefaultRate() {
    const r = parseFloat(rateInput)
    if (isNaN(r) || r < 0 || r > 100) return
    setDefaultRate(r)
    localStorage.setItem(COMMISSION_KEY(workspace), String(r))
    setEditRate(false)
  }

  const monthOptions = useMemo(() => {
    const months = new Set(sales.map(s => s.date?.slice(0, 7)).filter(Boolean))
    return Array.from(months).sort().reverse()
  }, [sales])

  const filtered = sales
    .filter(s => filterMonth === 'all' || s.date?.startsWith(filterMonth))
    .filter(s => filterType  === 'all' || s.sale_type === filterType)

  const totalSales      = filtered.reduce((sum, s) => sum + (s.amount || 0), 0)
  const totalCommission = filtered.reduce((sum, s) => sum + calcCommission(s.amount, s.commission_rate), 0)
  const paidCommission  = filtered.filter(s => s.status === 'paid').reduce((sum, s) => sum + calcCommission(s.amount, s.commission_rate), 0)
  const fullSales       = filtered.filter(s => s.sale_type === 'full').length
  const addonSales      = filtered.filter(s => s.sale_type === 'addon').length

  async function handleAdd(fields) {
    try {
      const saved = await addSale({ workspace, ...fields })
      setSales(p => [saved, ...p])
      setShowAdd(false)
    } catch(e) { setErr(e.message) }
  }

  async function handleEdit(fields) {
    try {
      await updateSale(editItem.id, fields)
      setSales(p => p.map(s => s.id === editItem.id ? { ...s, ...fields } : s))
      setEditItem(null)
    } catch(e) { setErr(e.message) }
  }

  async function handleToggleStatus(sale) {
    const next = sale.status === 'paid' ? 'pending' : 'paid'
    try {
      await updateSale(sale.id, { status: next })
      setSales(p => p.map(s => s.id === sale.id ? { ...s, status: next } : s))
    } catch(e) { setErr(e.message) }
  }

  async function handleDelete(id) {
    try {
      await deleteSale(id)
      setSales(p => p.filter(s => s.id !== id))
    } catch(e) { setErr(e.message) }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-blush-400 border-t-transparent rounded-full animate-spin"/>
    </div>
  )

  return (
    <div className="pb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-sand-900">Sales & Commission</h1>
          <p className="text-sand-400 text-sm mt-0.5">Full sales and add-ons</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {!editRate ? (
            <button onClick={() => { setRateInput(String(defaultRate)); setEditRate(true) }}
              className="flex items-center gap-1.5 text-xs font-semibold text-sand-600 bg-sand-100 border border-sand-200 hover:bg-sand-200 px-3 py-1.5 rounded-lg transition-colors">
              Default rate: {defaultRate}%
              <Pencil className="w-3 h-3"/>
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-sand-500">Default %</span>
              <input
                type="number" min="0" max="100" step="0.1"
                value={rateInput} onChange={e => setRateInput(e.target.value)}
                className="w-16 text-xs bg-white border border-sand-200 rounded-lg px-2 py-1 focus:ring-2 focus:ring-blush-200 focus:outline-none"
                autoFocus
              />
              <button onClick={saveDefaultRate}
                className="w-6 h-6 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg flex items-center justify-center transition-colors">
                <Check className="w-3 h-3"/>
              </button>
              <button onClick={() => setEditRate(false)}
                className="w-6 h-6 bg-sand-200 text-sand-600 rounded-lg flex items-center justify-center transition-colors">
                <X className="w-3 h-3"/>
              </button>
            </div>
          )}
          <button onClick={() => { setShowAdd(true); setEditItem(null) }}
            className="flex items-center gap-1.5 text-sm font-semibold text-white bg-blush-500 hover:bg-blush-600 px-4 py-2 rounded-xl transition-colors">
            <Plus className="w-4 h-4"/> Add Sale
          </button>
        </div>
      </div>

      {err && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-5">
          <AlertCircle className="w-4 h-4 shrink-0"/>{err}
          <button onClick={() => setErr(null)} className="ml-auto"><X className="w-3.5 h-3.5"/></button>
        </div>
      )}

      {(showAdd || editItem) && (
        <SaleForm
          initial={editItem || {}}
          defaultRate={defaultRate}
          onSave={editItem ? handleEdit : handleAdd}
          onClose={() => { setShowAdd(false); setEditItem(null) }}
          title={editItem ? 'Edit Sale' : 'Add Sale'}
        />
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard label="Total Sales" value={fmtCurrency(totalSales)} sub={`${filtered.length} sale${filtered.length !== 1 ? 's' : ''}`} color="blush"/>
        <StatCard label="Commission Earned" value={fmtCurrency(totalCommission)} color="sand"/>
        <StatCard label="Commission Paid" value={fmtCurrency(paidCommission)} color="emerald"/>
        <StatCard label="Awaiting Payment" value={fmtCurrency(totalCommission - paidCommission)} color="amber"/>
      </div>

      {/* Breakdown row */}
      {(fullSales > 0 || addonSales > 0) && (
        <div className="flex gap-3 mb-5 flex-wrap">
          <span className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${TYPE_STYLE.full.bg} ${TYPE_STYLE.full.text} ${TYPE_STYLE.full.border}`}>
            {fullSales} Full sale{fullSales !== 1 ? 's' : ''}
          </span>
          <span className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${TYPE_STYLE.addon.bg} ${TYPE_STYLE.addon.text} ${TYPE_STYLE.addon.border}`}>
            {addonSales} Add-on{addonSales !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="flex items-center gap-1.5">
          {['all', 'full', 'addon'].map(t => (
            <button key={t}
              onClick={() => setFilterType(t)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors capitalize ${
                filterType === t ? 'bg-sand-800 text-white border-sand-800' : 'bg-white text-sand-500 border-sand-200 hover:border-sand-300'
              }`}>
              {t === 'all' ? 'All types' : t === 'full' ? 'Full sales' : 'Add-ons'}
            </button>
          ))}
        </div>
        {monthOptions.length > 0 && (
          <div className="flex items-center gap-1.5 ml-2 flex-wrap">
            <span className="text-xs text-sand-400">|</span>
            <button onClick={() => setFilterMonth('all')}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                filterMonth === 'all' ? 'bg-sand-800 text-white border-sand-800' : 'bg-white text-sand-500 border-sand-200 hover:border-sand-300'
              }`}>All months</button>
            {monthOptions.map(m => (
              <button key={m} onClick={() => setFilterMonth(m)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                  filterMonth === m ? 'bg-sand-800 text-white border-sand-800' : 'bg-white text-sand-500 border-sand-200 hover:border-sand-300'
                }`}>
                {new Date(m + '-01T12:00:00').toLocaleDateString('en-AU', { month: 'short', year: 'numeric' })}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-sand-200 rounded-2xl px-5 py-16 text-center">
          <DollarSign className="w-8 h-8 text-sand-300 mx-auto mb-3"/>
          <p className="text-sand-400 text-sm">No sales recorded yet</p>
          <button onClick={() => setShowAdd(true)} className="text-blush-500 text-sm font-medium mt-2 hover:text-blush-600">
            Add your first sale →
          </button>
        </div>
      ) : (
        <div className="bg-white border border-sand-200 rounded-2xl overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-sand-200">
                <th className="px-5 py-3 text-left text-xs font-bold text-sand-400 uppercase tracking-widest">Date</th>
                <th className="px-5 py-3 text-left text-xs font-bold text-sand-400 uppercase tracking-widest">Client</th>
                <th className="px-5 py-3 text-left text-xs font-bold text-sand-400 uppercase tracking-widest">What Was Sold</th>
                <th className="px-5 py-3 text-left text-xs font-bold text-sand-400 uppercase tracking-widest">Type</th>
                <th className="px-5 py-3 text-right text-xs font-bold text-sand-400 uppercase tracking-widest">Amount</th>
                <th className="px-5 py-3 text-right text-xs font-bold text-sand-400 uppercase tracking-widest">Commission</th>
                <th className="px-5 py-3 text-left text-xs font-bold text-sand-400 uppercase tracking-widest">Status</th>
                <th className="px-5 py-3 w-14"/>
              </tr>
            </thead>
            <tbody>
              {filtered.map(sale => {
                const comm = calcCommission(sale.amount, sale.commission_rate)
                const st   = STATUS_STYLE[sale.status] || STATUS_STYLE.pending
                const tt   = TYPE_STYLE[sale.sale_type] || TYPE_STYLE.full
                return (
                  <tr key={sale.id} className="border-b border-sand-100 last:border-0 hover:bg-sand-50/50 group transition-colors">
                    <td className="px-5 py-3.5 text-sm text-sand-500 whitespace-nowrap">{fmtDate(sale.date)}</td>
                    <td className="px-5 py-3.5">
                      <p className="text-sm font-semibold text-sand-800">{sale.client}</p>
                      {sale.notes && <p className="text-xs text-sand-400 mt-0.5 line-clamp-1">{sale.notes}</p>}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-sand-700 max-w-[180px]">
                      <p className="line-clamp-2 leading-snug">{sale.product || <span className="text-sand-300 italic">—</span>}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${tt.bg} ${tt.text} ${tt.border}`}>
                        {SALE_TYPES.find(t => t.value === sale.sale_type)?.label || sale.sale_type}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right text-sm font-semibold text-sand-800 whitespace-nowrap">
                      {fmtCurrency(sale.amount)}
                      <span className="block text-[10px] text-sand-400 font-normal">{sale.commission_rate}%</span>
                    </td>
                    <td className="px-5 py-3.5 text-right text-sm font-bold text-blush-600 whitespace-nowrap">{fmtCurrency(comm)}</td>
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => handleToggleStatus(sale)}
                        title="Click to toggle paid/pending"
                        className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-colors hover:opacity-75 ${st.bg} ${st.text} ${st.border}`}>
                        {st.label}
                      </button>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={() => { setEditItem(sale); setShowAdd(false) }}
                          className="text-sand-300 hover:text-sand-600 transition-colors">
                          <Pencil className="w-3.5 h-3.5"/>
                        </button>
                        <button onClick={() => handleDelete(sale.id)}
                          className="text-sand-300 hover:text-red-400 transition-colors">
                          <Trash2 className="w-3.5 h-3.5"/>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            {filtered.length > 1 && (
              <tfoot>
                <tr className="border-t-2 border-sand-200 bg-sand-50/70">
                  <td colSpan={4} className="px-5 py-3 text-xs font-bold text-sand-500 uppercase tracking-widest">Totals</td>
                  <td className="px-5 py-3 text-right text-sm font-bold text-sand-800">{fmtCurrency(totalSales)}</td>
                  <td className="px-5 py-3 text-right text-sm font-bold text-blush-600">{fmtCurrency(totalCommission)}</td>
                  <td colSpan={2}/>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </div>
  )
}
