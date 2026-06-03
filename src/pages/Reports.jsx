import { useState, useMemo } from 'react'
import {
  TrendingUp, TrendingDown, DollarSign, Download, Scale,
  Users, ArrowRight, CheckCircle, ChevronDown, ChevronUp,
  Globe, Clock, Share2,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, ComposedChart, Cell,
} from 'recharts'
import { useApp } from '../context/AppContext'
import { useFeatures } from '../features/useFeatures'

/* ─── konstante ─── */
const MONTHS_SQ  = ['Jan','Shk','Mar','Pri','Maj','Qer','Kor','Gus','Sht','Tet','Nën','Dhj']
const MONTHS_FULL = ['Janar','Shkurt','Mars','Prill','Maj','Qershor','Korrik','Gusht','Shtator','Tetor','Nëntor','Dhjetor']
const PARTNERS   = ['Enndy', 'Samki']
const P_COLOR    = { Enndy: '#7c3aed', Samki: '#059669' }

/* ── estimated 2025 client data (nuk kemi te dhena reale 2025) ── */
const EST_CLIENTS_2025 = [0, 0, 3, 4, 5, 5, 5, 5, 5, 5, 5, 4]

/* ─── helpers ─── */
function lastDayOfMonth(year, month) {
  return new Date(year, month, 0).getDate()
}
function monthStr(year, month) {
  const m = String(month).padStart(2, '0')
  return { from: `${year}-${m}-01`, to: `${year}-${m}-${lastDayOfMonth(year, month)}` }
}
function quarterRange(year, q) {
  const sm = (q - 1) * 3 + 1
  const em = q * 3
  return { from: `${year}-${String(sm).padStart(2,'0')}-01`, to: `${year}-${String(em).padStart(2,'0')}-${lastDayOfMonth(year, em)}` }
}

/* ─── count active clients in a month ─── */
function countActive(invoices, year, month) {
  const { from, to } = monthStr(year, month)
  const active = invoices.filter(inv => inv.date <= to && inv.subscriptionExpiry >= from)
  return new Set(active.map(inv => inv.customer)).size
}

/* ══════════════════════════════════════════════════════════
   TAB 1: Financiare (ekzistuese)
══════════════════════════════════════════════════════════ */
function FinanciareTab({ invoices, expenses, fmt }) {
  const [tab, setTab] = useState('revenue')
  const { payments } = useApp()
  const thisYear = new Date().getFullYear().toString()

  const paid     = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0)
  const totalExp = expenses.reduce((s, e) => s + e.amount, 0)
  const profit   = paid - totalExp

  const monthlyData = useMemo(() => MONTHS_SQ.map((label, i) => {
    const key = `${thisYear}-${String(i + 1).padStart(2, '0')}`
    const rev = payments.filter(p => p.date?.startsWith(key)).reduce((s, p) => s + (p.amount || 0), 0)
    const exp = expenses.filter(e => e.date?.startsWith(key)).reduce((s, e) => s + (e.amount || 0), 0)
    return { month: label, revenue: rev, expenses: exp, profit: rev - exp }
  }), [payments, expenses, thisYear])

  const statusCounts = ['paid','pending','overdue','draft'].map(s => ({
    status: s,
    count:  invoices.filter(i => i.status === s).length,
    amount: invoices.filter(i => i.status === s).reduce((sum, i) => sum + i.amount, 0),
  }))
  const statusLabels = { paid:'Paguar', pending:'Në pritje', overdue:'Vonuar', draft:'Draft' }
  const statusColors = { paid:'#059669', pending:'#d97706', overdue:'#dc2626', draft:'#9ca3af' }

  const KPIS = [
    { label:'Të ardhura totale', val: fmt(paid + 42000),    icon: TrendingUp,   bg:'#eff6ff', color:'#2563eb' },
    { label:'Shpenzime totale',  val: fmt(totalExp),         icon: TrendingDown, bg:'#fef2f2', color:'#dc2626' },
    { label:'Fitimi neto',       val: fmt(profit + 32000),   icon: DollarSign,   bg:'#ecfdf5', color:'#059669' },
  ]
  const TABS = [
    { id:'revenue',  label:'Të ardhurat', key:'revenue',  color:'#3b82f6' },
    { id:'expenses', label:'Shpenzimet',  key:'expenses', color:'#f87171' },
    { id:'profit',   label:'Fitimi neto', key:'profit',   color:'#10b981' },
  ]
  const { customers } = useApp()
  const activeTab = TABS.find(t => t.id === tab)

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {KPIS.map(({ label, val, icon: Icon, bg, color }) => (
          <div key={label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5 text-center hover:shadow-md transition-all">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: bg }}>
              <Icon size={22} style={{ color }}/>
            </div>
            <p className="text-2xl font-bold text-gray-800 dark:text-gray-100 tracking-tight">{val}</p>
            <p className="text-xs text-gray-400 mt-1 font-medium">{label}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="card">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <p className="text-sm font-bold text-gray-800 dark:text-gray-100">Analiza mujore — 2026</p>
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5 gap-0.5">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  tab === t.id ? 'bg-white dark:bg-gray-600 text-gray-800 dark:text-gray-100 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="p-5 pt-4">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyData} margin={{ top:5, right:5, left:-15, bottom:0 }} barSize={28} barCategoryGap="35%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false}/>
              <XAxis dataKey="month" tick={{ fontSize:11, fill:'#9ca3af' }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fontSize:11, fill:'#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => v/1000+'k'}/>
              <Tooltip formatter={v => [`€${v.toLocaleString()}`, activeTab.label]} contentStyle={{ border:'1px solid #f3f4f6', borderRadius:10, fontSize:12 }}/>
              <Bar dataKey={activeTab.key} fill={activeTab.color} radius={[6,6,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
            <p className="text-sm font-bold text-gray-800 dark:text-gray-100">Faturat sipas statusit</p>
          </div>
          <div className="p-5 space-y-4">
            {statusCounts.map(({ status, count }) => {
              const pct = Math.round((count / invoices.length) * 100) || 0
              return (
                <div key={status}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="font-semibold text-gray-600 dark:text-gray-300 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ background: statusColors[status] }}/>
                      {statusLabels[status]}
                    </span>
                    <span className="text-gray-500">{count} · <span className="font-bold text-gray-700 dark:text-gray-200">{pct}%</span></span>
                  </div>
                  <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width:`${pct}%`, background:statusColors[status] }}/>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        <div className="card">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
            <p className="text-sm font-bold text-gray-800 dark:text-gray-100">Top 5 klientët sipas vlerës</p>
          </div>
          <table className="w-full">
            <tbody>
              {[...customers].sort((a,b) => b.total - a.total).slice(0,5).map((c,i) => (
                <tr key={c.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="table-td w-10">
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                      style={{ background: i===0?'#f59e0b':i===1?'#94a3b8':i===2?'#cd7c3d':'#e5e7eb', color: i>=3?'#6b7280':undefined }}>
                      {i+1}
                    </span>
                  </td>
                  <td className="table-td font-semibold text-gray-700 dark:text-gray-300 text-xs">{c.name}</td>
                  <td className="table-td text-right font-bold text-blue-600 text-sm">{fmt(c.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════
   TAB 2: Barazimi Enndy / Samki
══════════════════════════════════════════════════════════ */
function BarazimiTab({ payments, expenses, fmt }) {
  const { transfers, setTransfers } = useApp()
  const now      = new Date()
  const [mode,   setMode]   = useState('month')
  const [year,   setYear]   = useState(now.getFullYear())
  const [month,  setMonth]  = useState(now.getMonth() + 1)
  const [quarter,setQuarter]= useState(Math.ceil((now.getMonth()+1)/3))
  const [expand, setExpand] = useState({})

  /* transfer form state */
  const [showTrf, setShowTrf] = useState(false)
  const [trfFrom, setTrfFrom] = useState('Enndy')
  const [trfTo,   setTrfTo]   = useState('Samki')
  const [trfAmt,  setTrfAmt]  = useState('')
  const [trfDate, setTrfDate] = useState(now.toISOString().slice(0,10))
  const [trfNote, setTrfNote] = useState('')

  /* date range */
  const { from, to } = mode === 'month'
    ? monthStr(year, month)
    : quarterRange(year, quarter)

  /* transfers in this period */
  const periodTransfers = useMemo(
    () => transfers.filter(t => t.date >= from && t.date <= to),
    [transfers, from, to]
  )

  /* compute per-partner data (includes transfers) */
  const partnerData = useMemo(() => {
    const pays = payments.filter(p => p.date >= from && p.date <= to)
    const exps = expenses.filter(e => e.date >= from && e.date <= to)
    return PARTNERS.map(partner => {
      const payItems = pays.filter(p => p.depositedTo === partner)
      const expItems = exps.filter(e => e.paidBy === partner)
      const trfOut   = periodTransfers.filter(t => t.from === partner)
      const trfIn    = periodTransfers.filter(t => t.to   === partner)
      const income   = payItems.reduce((s, p) => s + p.net,    0)
      const spent    = expItems.reduce((s, e) => s + e.amount, 0)
      const tOut     = trfOut.reduce((s, t) => s + t.amount,   0)
      const tIn      = trfIn.reduce( (s, t) => s + t.amount,   0)
      return { partner, income, spent, tOut, tIn, trfOut, trfIn,
               net: income - spent - tOut + tIn, payItems, expItems }
    })
  }, [payments, expenses, periodTransfers, from, to])

  const totalNet  = partnerData.reduce((s, d) => s + d.net, 0)
  const fairShare = totalNet / 2

  const settlement = (() => {
    const diff = partnerData[0].net - fairShare
    if (Math.abs(diff) < 0.01) return null
    return diff > 0
      ? { from:'Enndy', to:'Samki', amount: diff }
      : { from:'Samki', to:'Enndy', amount: -diff }
  })()

  /* open form pre-filled from settlement */
  const openTrf = () => {
    if (settlement) {
      setTrfFrom(settlement.from)
      setTrfTo(settlement.to)
      setTrfAmt(settlement.amount.toFixed(2))
    }
    // Use selected month/quarter date, not today's date
    const selectedDate = mode === 'month'
      ? `${year}-${String(month).padStart(2,'0')}-01`
      : `${year}-${String((quarter-1)*3+1).padStart(2,'0')}-01`
    setTrfDate(selectedDate)
    setShowTrf(true)
  }

  const saveTrf = () => {
    const amt = parseFloat(trfAmt)
    if (!amt || amt <= 0 || trfFrom === trfTo) return
    setTransfers(prev => [...prev, {
      id: 'TRF-' + Date.now(), date: trfDate,
      from: trfFrom, to: trfTo, amount: amt, note: trfNote.trim(),
    }])
    setShowTrf(false)
    setTrfAmt('')
    setTrfNote('')
  }

  const deleteTrf = (id) => setTransfers(prev => prev.filter(t => t.id !== id))

  const YEARS    = [2025, 2026, 2027]
  const QUARTERS = ['Q1 (Jan–Mar)', 'Q2 (Pri–Qer)', 'Q3 (Kor–Sht)', 'Q4 (Tet–Dhj)']
  const toggleExpand = (key) => setExpand(p => ({ ...p, [key]: !p[key] }))

  return (
    <div className="space-y-4">
      {/* Filter row */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 flex flex-wrap items-center gap-3">
        <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5 gap-0.5">
          {['month','quarter'].map(m => (
            <button key={m} onClick={() => setMode(m)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                mode===m ? 'bg-white dark:bg-gray-600 text-gray-800 dark:text-gray-100 shadow-sm' : 'text-gray-500'
              }`}>
              {m==='month' ? 'Mujore' : '3-Mujore'}
            </button>
          ))}
        </div>
        <select value={year} onChange={e => setYear(+e.target.value)}
          className="form-control w-auto text-xs py-1.5">
          {YEARS.map(y => <option key={y}>{y}</option>)}
        </select>
        {mode === 'month' ? (
          <select value={month} onChange={e => setMonth(+e.target.value)}
            className="form-control w-auto text-xs py-1.5">
            {MONTHS_FULL.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
          </select>
        ) : (
          <select value={quarter} onChange={e => setQuarter(+e.target.value)}
            className="form-control w-auto text-xs py-1.5">
            {QUARTERS.map((q, i) => <option key={i+1} value={i+1}>{q}</option>)}
          </select>
        )}
        <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">{from} → {to}</span>
      </div>

      {/* Partner cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {partnerData.map(d => (
          <div key={d.partner} className="bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-700"
              style={{ background: P_COLOR[d.partner] + '10' }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-base"
                style={{ background: P_COLOR[d.partner] }}>{d.partner[0]}</div>
              <div>
                <p className="font-bold text-gray-800 dark:text-gray-100">{d.partner}</p>
                <p className="text-xs text-gray-400">Partneri</p>
              </div>
              <div className="ml-auto text-right">
                <p className={`text-xl font-black ${d.net >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{fmt(d.net)}</p>
                <p className="text-[11px] text-gray-400">Neto</p>
              </div>
            </div>

            <div className="divide-y divide-gray-50 dark:divide-gray-700">
              {/* Income */}
              <div>
                <button className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors"
                  onClick={() => toggleExpand(`${d.partner}-pay`)}>
                  <span className="text-sm font-semibold text-gray-600 dark:text-gray-300 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"/>Të hyra (pagesa)
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="text-sm font-bold text-emerald-600">+{fmt(d.income)}</span>
                    {expand[`${d.partner}-pay`] ? <ChevronUp size={14} className="text-gray-400"/> : <ChevronDown size={14} className="text-gray-400"/>}
                  </span>
                </button>
                {expand[`${d.partner}-pay`] && (
                  <div className="px-5 pb-3 space-y-1.5">
                    {d.payItems.length === 0
                      ? <p className="text-xs text-gray-400">Asnjë pagesë në këtë periudhë.</p>
                      : d.payItems.map(p => (
                          <div key={p.id} className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                            <span className="truncate max-w-[200px]">{p.customer} · {p.date}</span>
                            <span className="font-semibold text-emerald-600 flex-shrink-0 ml-2">+{fmt(p.net)}</span>
                          </div>
                        ))
                    }
                  </div>
                )}
              </div>

              {/* Expenses */}
              <div>
                <button className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors"
                  onClick={() => toggleExpand(`${d.partner}-exp`)}>
                  <span className="text-sm font-semibold text-gray-600 dark:text-gray-300 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500"/>Shpenzime
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="text-sm font-bold text-red-500">-{fmt(d.spent)}</span>
                    {expand[`${d.partner}-exp`] ? <ChevronUp size={14} className="text-gray-400"/> : <ChevronDown size={14} className="text-gray-400"/>}
                  </span>
                </button>
                {expand[`${d.partner}-exp`] && (
                  <div className="px-5 pb-3 space-y-1.5">
                    {d.expItems.length === 0
                      ? <p className="text-xs text-gray-400">Asnjë shpenzim në këtë periudhë.</p>
                      : d.expItems.map(e => (
                          <div key={e.id} className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                            <span className="truncate max-w-[200px]">{e.type} · {e.date}</span>
                            <span className="font-semibold text-red-500 flex-shrink-0 ml-2">-{fmt(e.amount)}</span>
                          </div>
                        ))
                    }
                  </div>
                )}
              </div>

              {/* Transfers in/out */}
              {(d.tOut > 0 || d.tIn > 0) && (
                <div className="px-5 py-3 space-y-1.5">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-400"/>Dorëzime
                  </p>
                  {d.trfOut.map(t => (
                    <div key={t.id} className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                      <span className="truncate max-w-[200px]">→ {t.to} · {t.date}{t.note ? ' · '+t.note : ''}</span>
                      <span className="font-semibold text-orange-500 flex-shrink-0 ml-2">-{fmt(t.amount)}</span>
                    </div>
                  ))}
                  {d.trfIn.map(t => (
                    <div key={t.id} className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                      <span className="truncate max-w-[200px]">← {t.from} · {t.date}{t.note ? ' · '+t.note : ''}</span>
                      <span className="font-semibold text-blue-500 flex-shrink-0 ml-2">+{fmt(t.amount)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Net */}
              <div className="flex items-center justify-between px-5 py-3 bg-gray-50/50 dark:bg-gray-700/20">
                <span className="text-sm font-bold text-gray-700 dark:text-gray-200">Neto (Hyrje − Shpenzime − Dorëzime)</span>
                <span className={`text-sm font-black ${d.net >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {d.net >= 0 ? '+' : ''}{fmt(d.net)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Settlement summary */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Scale size={18} className="text-blue-500"/>
          <p className="font-bold text-gray-800 dark:text-gray-100 text-sm">Barazimi financiar</p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-5">
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <p className="text-xs text-gray-400 mb-1">Totali neto</p>
            <p className="text-lg font-black text-gray-800 dark:text-gray-100">{fmt(totalNet)}</p>
          </div>
          <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-xs text-blue-500 mb-1">Pjesa e drejtë (50/50)</p>
            <p className="text-lg font-black text-blue-600">{fmt(fairShare)}</p>
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <p className="text-xs text-gray-400 mb-1">Diferenca</p>
            <p className="text-lg font-black text-gray-800 dark:text-gray-100">
              {fmt(Math.abs(partnerData[0].net - fairShare))}
            </p>
          </div>
        </div>

        {/* Per-partner bars */}
        <div className="space-y-2 mb-5">
          {partnerData.map(d => {
            const diff = d.net - fairShare
            return (
              <div key={d.partner} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ background: P_COLOR[d.partner] }}>{d.partner[0]}</div>
                <div className="flex-1">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-semibold text-gray-700 dark:text-gray-200">{d.partner}</span>
                    <span className={`font-bold ${diff >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {diff >= 0 ? '+' : ''}{fmt(diff)} vs pjesa e drejtë
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{
                      width: totalNet > 0 ? `${Math.max(Math.min((d.net / totalNet) * 100, 100), 0)}%` : '0%',
                      background: P_COLOR[d.partner],
                    }}/>
                  </div>
                </div>
                <span className="text-sm font-bold text-gray-800 dark:text-gray-100 w-20 text-right">{fmt(d.net)}</span>
              </div>
            )
          })}
        </div>

        {/* Verdict */}
        {totalNet === 0 ? (
          <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
            <CheckCircle size={20} className="text-gray-400"/>
            <p className="text-sm text-gray-500">Asnjë të ardhur në këtë periudhë.</p>
          </div>
        ) : settlement === null ? (
          <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-800">
            <CheckCircle size={20} className="text-emerald-500"/>
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
              Të barazuar! Secili ka {fmt(fairShare)} — asnjë dorëzim nuk nevojitet.
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-100 dark:border-amber-800">
            <div className="flex items-center gap-2 flex-1 flex-wrap">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
                style={{ background: P_COLOR[settlement.from] }}>{settlement.from[0]}</div>
              <span className="font-bold text-gray-700 dark:text-gray-200 text-sm">{settlement.from}</span>
              <ArrowRight size={16} className="text-amber-500"/>
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
                style={{ background: P_COLOR[settlement.to] }}>{settlement.to[0]}</div>
              <span className="font-bold text-gray-700 dark:text-gray-200 text-sm">{settlement.to}</span>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-xl font-black text-amber-600">{fmt(settlement.amount)}</p>
              <p className="text-[11px] text-amber-500">duhet të dorëzojë</p>
            </div>
          </div>
        )}

        {/* ── Dorëzimet e regjistruara ── */}
        <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2">
              <ArrowRight size={15} className="text-blue-500"/>
              Dorëzime të regjistruara
              {periodTransfers.length > 0 && (
                <span className="text-xs font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-600 px-2 py-0.5 rounded-full">
                  {periodTransfers.length}
                </span>
              )}
            </p>
            {!showTrf && (
              <button onClick={openTrf}
                className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-3 py-1.5 rounded-lg border border-blue-200 dark:border-blue-800 transition-colors">
                + Regjistro dorëzim
              </button>
            )}
          </div>

          {/* List of transfers */}
          {periodTransfers.length > 0 && (
            <div className="space-y-2 mb-4">
              {periodTransfers.map(t => (
                <div key={t.id} className="flex items-center gap-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl px-4 py-2.5">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ background: P_COLOR[t.from] }}>{t.from[0]}</div>
                  <ArrowRight size={13} className="text-blue-400 flex-shrink-0"/>
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ background: P_COLOR[t.to] }}>{t.to[0]}</div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">{t.from} → {t.to}</span>
                    {t.note && <span className="text-xs text-gray-400 ml-2">· {t.note}</span>}
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">{t.date}</span>
                  <span className="text-sm font-black text-blue-600 flex-shrink-0">{fmt(t.amount)}</span>
                  <button onClick={() => deleteTrf(t.id)}
                    className="text-gray-300 hover:text-red-400 transition-colors text-xl leading-none flex-shrink-0 ml-1"
                    title="Fshi">×</button>
                </div>
              ))}
            </div>
          )}

          {periodTransfers.length === 0 && !showTrf && (
            <p className="text-xs text-gray-400 italic">Asnjë dorëzim i regjistruar për këtë periudhë.</p>
          )}

          {/* Form */}
          {showTrf && (
            <div className="bg-gray-50 dark:bg-gray-700/40 rounded-xl p-4 space-y-3 border border-gray-200 dark:border-gray-600">
              <p className="text-xs font-bold text-gray-600 dark:text-gray-300">Regjistro dorëzim të mjeteve</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Nga</label>
                  <select value={trfFrom}
                    onChange={e => { setTrfFrom(e.target.value); setTrfTo(PARTNERS.find(p => p !== e.target.value)) }}
                    className="form-control text-xs">
                    {PARTNERS.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Tek</label>
                  <select value={trfTo}
                    onChange={e => { setTrfTo(e.target.value); setTrfFrom(PARTNERS.find(p => p !== e.target.value)) }}
                    className="form-control text-xs">
                    {PARTNERS.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Shuma (€)</label>
                  <input type="number" min="0" step="0.01" value={trfAmt}
                    onChange={e => setTrfAmt(e.target.value)}
                    className="form-control text-xs" placeholder="0.00"/>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Data</label>
                  <input type="date" value={trfDate} onChange={e => setTrfDate(e.target.value)}
                    className="form-control text-xs"/>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Shënim (opsional)</label>
                <input type="text" value={trfNote} onChange={e => setTrfNote(e.target.value)}
                  className="form-control text-xs" placeholder="p.sh. Barazim Maj 2026"/>
              </div>
              <div className="flex gap-2 justify-end pt-1">
                <button onClick={() => setShowTrf(false)} className="btn btn-outline text-xs py-1.5 px-4">Anulo</button>
                <button onClick={saveTrf} className="btn btn-primary text-xs py-1.5 px-4">Regjistro</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════
   TAB 3: Klientët Mujore
══════════════════════════════════════════════════════════ */
function KlientetTab({ invoices }) {
  const [chartYear, setChartYear] = useState(new Date().getFullYear())
  const prevYear = chartYear - 1

  const data = useMemo(() => {
    return MONTHS_SQ.map((month, i) => {
      const m = i + 1
      const current = countActive(invoices, chartYear, m)
      const prev    = chartYear === 2026
        ? EST_CLIENTS_2025[i]           // 2025 estimated
        : countActive(invoices, prevYear, m) // real previous year
      return { month, [`${chartYear}`]: current, [`${prevYear}`]: prev }
    })
  }, [invoices, chartYear, prevYear])

  const totCurrent = data.reduce((s, d) => s + (d[chartYear] || 0), 0)
  const totPrev    = data.reduce((s, d) => s + (d[prevYear]  || 0), 0)
  const growth     = totPrev > 0 ? Math.round(((totCurrent - totPrev) / totPrev) * 100) : null

  const YEARS = [2025, 2026, 2027]

  return (
    <div className="space-y-4">
      {/* Header + filter */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-bold text-gray-800 dark:text-gray-100 text-sm">Klientët aktivë — numri mujor</p>
          <p className="text-xs text-gray-400 mt-0.5">Bazuar në datën e skadimit të abonimit</p>
        </div>
        <div className="flex items-center gap-3">
          {growth !== null && (
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
              growth >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'
            }`}>
              {growth >= 0 ? '+' : ''}{growth}% vs {prevYear}
            </span>
          )}
          <select value={chartYear} onChange={e => setChartYear(+e.target.value)}
            className="form-control w-auto text-xs py-1.5">
            {YEARS.map(y => <option key={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Chart */}
      <div className="card">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-600">
            <span className="w-3 h-3 rounded-sm bg-blue-500 inline-block"/>
            {chartYear}
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-400">
            <span className="w-3 h-1 bg-gray-400 inline-block rounded-full"/>
            {prevYear} {chartYear === 2026 ? '(vlerësim)' : ''}
          </div>
        </div>
        <div className="p-5 pt-4">
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={data} margin={{ top:5, right:5, left:-20, bottom:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false}/>
              <XAxis dataKey="month" tick={{ fontSize:11, fill:'#9ca3af' }} axisLine={false} tickLine={false}/>
              <YAxis allowDecimals={false} tick={{ fontSize:11, fill:'#9ca3af' }} axisLine={false} tickLine={false}/>
              <Tooltip
                contentStyle={{ border:'1px solid #f3f4f6', borderRadius:10, fontSize:12 }}
                formatter={(val, name) => [val + ' klientë', name]}
              />
              <Bar dataKey={String(chartYear)} fill="#3b82f6" radius={[6,6,0,0]} barSize={28}/>
              <Line dataKey={String(prevYear)} stroke="#9ca3af" strokeWidth={2} dot={{ r:3, fill:'#9ca3af' }} strokeDasharray="5 4" type="monotone"/>
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <p className="text-sm font-bold text-gray-800 dark:text-gray-100">Detajet mujore</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700">
                <th className="table-th">Muaji</th>
                <th className="table-th text-right">{chartYear}</th>
                <th className="table-th text-right">{prevYear} {chartYear === 2026 ? '(est.)' : ''}</th>
                <th className="table-th text-right">Ndryshimi</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => {
                const cur  = row[chartYear] || 0
                const prev = row[prevYear]  || 0
                const diff = cur - prev
                return (
                  <tr key={i} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors border-b border-gray-50 dark:border-gray-700 last:border-0">
                    <td className="table-td font-semibold text-gray-700 dark:text-gray-300">{MONTHS_FULL[i]}</td>
                    <td className="table-td text-right">
                      <span className={`font-bold text-sm ${cur > 0 ? 'text-blue-600' : 'text-gray-400'}`}>{cur}</span>
                    </td>
                    <td className="table-td text-right">
                      <span className="text-gray-500 dark:text-gray-400 text-sm">{prev}</span>
                    </td>
                    <td className="table-td text-right">
                      {diff !== 0 ? (
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          diff > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'
                        }`}>
                          {diff > 0 ? '+' : ''}{diff}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
              {/* Total row */}
              <tr className="bg-gray-50 dark:bg-gray-700/30">
                <td className="table-td font-black text-gray-800 dark:text-gray-100">TOTAL</td>
                <td className="table-td text-right font-black text-blue-600">{totCurrent}</td>
                <td className="table-td text-right font-bold text-gray-500">{totPrev}</td>
                <td className="table-td text-right">
                  {growth !== null && (
                    <span className={`text-xs font-black px-2 py-0.5 rounded-full ${
                      growth >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'
                    }`}>
                      {growth >= 0 ? '+' : ''}{growth}%
                    </span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════
   TAB 4: Klientët sipas Shtetit
══════════════════════════════════════════════════════════ */
const CHART_COLORS = ['#3b82f6','#7c3aed','#059669','#f59e0b','#dc2626','#0891b2','#be185d','#0f766e','#6366f1','#ec4899']

function ShtetTab() {
  const { customers } = useApp()

  const countryData = useMemo(() => {
    const map = {}
    customers.forEach(c => {
      const co = c.country || 'Tjera'
      map[co] = (map[co] || 0) + 1
    })
    return Object.entries(map)
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count)
  }, [customers])

  const max = countryData[0]?.count || 1

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <Globe size={15} className="text-blue-500"/> Klientët sipas shtetit
            </p>
            <p className="text-xs text-gray-400 mt-0.5">{customers.length} klientë · {countryData.length} shtete</p>
          </div>
        </div>
        <div className="p-5">
          <ResponsiveContainer width="100%" height={Math.max(200, countryData.length * 38)}>
            <BarChart data={countryData} layout="vertical" margin={{ top: 0, right: 30, left: 100, bottom: 0 }} barSize={20}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false}/>
              <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false}/>
              <YAxis type="category" dataKey="country" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} width={95}/>
              <Tooltip
                contentStyle={{ border: '1px solid #f3f4f6', borderRadius: 10, fontSize: 12 }}
                formatter={v => [v + ' klientë', 'Numri']}
              />
              <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                {countryData.map((entry, i) => (
                  <Cell key={entry.country} fill={CHART_COLORS[i % CHART_COLORS.length]}/>
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <p className="text-sm font-bold text-gray-800 dark:text-gray-100">Renditja sipas shtetit</p>
        </div>
        <table className="w-full min-w-[360px]">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-700">
              <th className="table-th">#</th>
              <th className="table-th">Shteti</th>
              <th className="table-th text-right">Klientë</th>
              <th className="table-th text-right">% e totalit</th>
            </tr>
          </thead>
          <tbody>
            {countryData.map(({ country, count }, i) => (
              <tr key={country} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors border-b border-gray-50 dark:border-gray-700 last:border-0">
                <td className="table-td w-10">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                    style={{ background: i===0?'#f59e0b':i===1?'#94a3b8':i===2?'#cd7c3d':'#e5e7eb', color: i>=3?'#6b7280':undefined }}>
                    {i + 1}
                  </span>
                </td>
                <td className="table-td">
                  <div>
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{country}</p>
                    <div className="mt-1 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden w-36">
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${(count / max) * 100}%`, background: CHART_COLORS[i % CHART_COLORS.length] }}/>
                    </div>
                  </div>
                </td>
                <td className="table-td text-right font-bold text-blue-600 text-base">{count}</td>
                <td className="table-td text-right">
                  <span className="text-xs font-bold text-gray-500 bg-gray-100 dark:bg-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-full">
                    {Math.round((count / customers.length) * 100)}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════
   TAB 5: Abonentët më të vjetër
══════════════════════════════════════════════════════════ */
function AbonentVjeterTab() {
  const { customers, invoices } = useApp()

  const subscriberData = useMemo(() => {
    const today = new Date()
    return customers
      .map(c => {
        const name = c.name || `${c.firstName} ${c.lastName}`
        const custInvoices = invoices.filter(inv => inv.customer === name)
        if (!custInvoices.length) return null
        const firstDate = custInvoices.reduce((min, inv) => inv.date < min ? inv.date : min, custInvoices[0].date)
        const daysActive = Math.floor((today - new Date(firstDate)) / 86400000)
        return { ...c, name, firstDate, daysActive, invoiceCount: custInvoices.length }
      })
      .filter(Boolean)
      .sort((a, b) => a.firstDate.localeCompare(b.firstDate))
  }, [customers, invoices])

  const fmt = d => {
    if (d < 30)  return `${d} ditë`
    if (d < 365) return `${Math.floor(d / 30)} muaj`
    const y = Math.floor(d / 365), m = Math.floor((d % 365) / 30)
    return m > 0 ? `${y} vit ${m} muaj` : `${y} vit`
  }

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
          <Clock size={18} className="text-amber-500"/>
        </div>
        <div>
          <p className="font-bold text-gray-800 dark:text-gray-100 text-sm">Abonentët më të vjetër</p>
          <p className="text-xs text-gray-400 mt-0.5">Renditur nga fatura e parë (më i vjetri sipër)</p>
        </div>
        <span className="ml-auto text-xs font-bold bg-amber-50 text-amber-600 px-2.5 py-1 rounded-full flex-shrink-0">
          {subscriberData.length} klientë me historik
        </span>
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700">
                <th className="table-th">#</th>
                <th className="table-th">Klienti</th>
                <th className="table-th">Shteti</th>
                <th className="table-th text-right">Fatura e parë</th>
                <th className="table-th text-right">Kohëzgjatja</th>
                <th className="table-th text-right">Fatura</th>
              </tr>
            </thead>
            <tbody>
              {subscriberData.map((c, i) => (
                <tr key={c.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors border-b border-gray-50 dark:border-gray-700 last:border-0">
                  <td className="table-td w-10">
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                      style={{ background: i===0?'#f59e0b':i===1?'#94a3b8':i===2?'#cd7c3d':'#e5e7eb', color: i>=3?'#6b7280':undefined }}>
                      {i + 1}
                    </span>
                  </td>
                  <td className="table-td">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{ background: c.color || '#2563eb' }}>
                        {(c.name || '?')[0]}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{c.name}</p>
                        <p className="text-[10px] text-gray-400">{c.type === 'reseller' ? 'Reseller' : 'Individual'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="table-td text-xs text-gray-500 dark:text-gray-400">{c.country}</td>
                  <td className="table-td text-right">
                    <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">{c.firstDate}</span>
                  </td>
                  <td className="table-td text-right">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      i === 0 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                    }`}>{fmt(c.daysActive)}</span>
                  </td>
                  <td className="table-td text-right font-bold text-blue-600">{c.invoiceCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════
   TAB 6: Referuesit
══════════════════════════════════════════════════════════ */
function ReferuesitTab() {
  const { customers } = useApp()

  const referralData = useMemo(() => {
    const map = {}
    customers.forEach(c => {
      const ref = (c.referredBy || '').trim()
      if (!ref) return
      if (!map[ref]) map[ref] = { referrer: ref, count: 0, clients: [] }
      map[ref].count++
      map[ref].clients.push(c.name || `${c.firstName} ${c.lastName}`)
    })
    return Object.values(map).sort((a, b) => b.count - a.count)
  }, [customers])

  const totalReferred  = referralData.reduce((s, r) => s + r.count, 0)
  const notReferred    = customers.filter(c => !(c.referredBy || '').trim()).length
  const topCount       = referralData[0]?.count || 1

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 px-5 py-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{referralData.length}</p>
          <p className="text-xs text-gray-400 mt-0.5 font-medium">Referues aktivë</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 px-5 py-4 text-center">
          <p className="text-2xl font-bold text-emerald-600">{totalReferred}</p>
          <p className="text-xs text-gray-400 mt-0.5 font-medium">Klientë të referuar</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 px-5 py-4 text-center">
          <p className="text-2xl font-bold text-gray-700 dark:text-gray-200">{notReferred}</p>
          <p className="text-xs text-gray-400 mt-0.5 font-medium">Pa referues</p>
        </div>
      </div>

      {referralData.length === 0 ? (
        <div className="card p-12 text-center">
          <Share2 size={36} className="text-gray-200 mx-auto mb-3"/>
          <p className="text-sm font-semibold text-gray-500">Asnjë klient nuk ka referuar ende.</p>
          <p className="text-xs text-gray-400 mt-1">Referuesit shfaqen kur plotësohet fusha "Referuar nga" te klienti.</p>
        </div>
      ) : (
        <div className="card">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
            <p className="text-sm font-bold text-gray-800 dark:text-gray-100">Renditja e referuesve</p>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-gray-700">
            {referralData.map(({ referrer, count, clients }, i) => (
              <div key={referrer} className="px-5 py-4 hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                    style={{ background: i===0?'#f59e0b':i===1?'#94a3b8':i===2?'#cd7c3d':'#6b7280' }}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-800 dark:text-gray-100">{referrer}</p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {clients.map(cl => (
                        <span key={cl} className="text-[10px] font-semibold bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full">
                          {cl}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-2xl font-black text-blue-600">{count}</span>
                    <p className="text-[10px] text-gray-400 font-medium">referime</p>
                  </div>
                </div>
                <div className="mt-2.5 ml-10 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width:`${(count/topCount)*100}%`, background: i===0?'#f59e0b':i===1?'#94a3b8':i===2?'#cd7c3d':'#6b7280' }}/>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════
   FAQJA KRYESORE
══════════════════════════════════════════════════════════ */
export default function Reports() {
  const { invoices, expenses, payments, fmt } = useApp()
  const { canUsePartnerSettlement } = useFeatures()
  const [mainTab, setMainTab] = useState('financiare')

  const ALL_MAIN_TABS = [
    { id: 'financiare', label: 'Financiare',        icon: TrendingUp },
    { id: 'barazimi',   label: 'Barazimi Partnerësh', icon: Scale,     restricted: true },
    { id: 'klientet',   label: 'Klientët Mujore',   icon: Users      },
    { id: 'shtetet',    label: 'Shtetet',            icon: Globe      },
    { id: 'abonente',   label: 'Abonentët',          icon: Clock      },
    { id: 'referuesit', label: 'Referuesit',         icon: Share2     },
  ]

  // Filter tabs based on feature availability
  const MAIN_TABS = ALL_MAIN_TABS.filter(tab => {
    if (tab.restricted && !canUsePartnerSettlement) {
      return false
    }
    return true
  })

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Raportet</h2>
          <p className="text-sm text-gray-400 mt-0.5">Pasqyra e plotë e performancës</p>
        </div>
        <button className="btn btn-outline btn-sm self-start sm:self-auto"><Download size={14}/>Eksporto</button>
      </div>

      {/* Main tab switcher */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 overflow-x-auto">
        {MAIN_TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setMainTab(id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap px-2 ${
              mainTab === id
                ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}>
            <Icon size={13}/>
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      {mainTab === 'financiare' && <FinanciareTab invoices={invoices} expenses={expenses} fmt={fmt}/>}
      {mainTab === 'barazimi'   && <BarazimiTab   payments={payments} expenses={expenses} fmt={fmt}/>}
      {mainTab === 'klientet'   && <KlientetTab   invoices={invoices}/>}
      {mainTab === 'shtetet'    && <ShtetTab/>}
      {mainTab === 'abonente'   && <AbonentVjeterTab/>}
      {mainTab === 'referuesit' && <ReferuesitTab/>}
    </div>
  )
}
