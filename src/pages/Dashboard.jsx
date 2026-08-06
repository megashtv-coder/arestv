import { useState, useMemo } from 'react'
import {
  Users, TrendingUp, TrendingDown, Clock, FilePlus,
  UserPlus, ReceiptText, AlertCircle, UserCheck, Layers,
  ArrowUp, ArrowDown,
} from 'lucide-react'
import {
  ComposedChart, Area, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { useApp } from '../context/AppContext'
import InvoiceModal from './InvoiceModal'
import { CustomerModal } from './Customers'
import { ExpenseModal }  from './Expenses'

const MONTH_LBL = ['Jan','Shk','Mar','Pri','Maj','Qer','Kor','Gus','Sht','Tet','Nën','Dhj']

/* ── Ngjyrat për kategorinë ── */
const CAT_COLORS = {
  'Shërbime': '#2563eb',
  'Software':  '#7c3aed',
  'Marketing': '#d97706',
  'Ushqim':    '#059669',
  'Pajisje':   '#dc2626',
  'Udhëtime':  '#be185d',
  'Tjera':     '#6b7280',
}

/* ── Stat card komponent ── */
const DELTA_TONE = {
  up:      'bg-emerald-50 text-emerald-600',
  down:    'bg-red-50 text-red-600',
  warn:    'bg-amber-50 text-amber-600',
  neutral: 'bg-gray-100 text-gray-500',
}

function KpiCard({ icon: Icon, iconBg, iconColor, label, value, delta, deltaTone = 'neutral', ctx, onClick }) {
  const base = "bg-white rounded-2xl border border-gray-100 p-5 flex flex-col h-full transition-all duration-200"
  const interactive = onClick ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-lg hover:border-blue-100" : "hover:-translate-y-0.5 hover:shadow-md"
  const Arrow = deltaTone === 'up' ? ArrowUp : deltaTone === 'down' ? ArrowDown : null
  return (
    <div className={`${base} ${interactive}`} onClick={onClick}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium text-gray-500 truncate">{label}</p>
        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: iconBg }}>
          <Icon size={17} style={{ color: iconColor }} />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-800 mt-2 truncate">{value}</p>
      <div className="flex items-center gap-2 mt-auto pt-3 flex-wrap">
        {delta && (
          <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${DELTA_TONE[deltaTone]}`}>
            {Arrow && <Arrow size={11} strokeWidth={3} />}{delta}
          </span>
        )}
        {ctx && <span className="text-[11px] text-gray-400 truncate">{ctx}</span>}
      </div>
    </div>
  )
}

/* ── Graf krahasues: viti aktual vs viti paraprak ── */
function YoYChart({ title, sub, data, curKey, prevKey, color, softColor, gradId, curLabel, prevLabel, fmt }) {
  /* Totalet krahasohen vetëm për muajt që kanë të dhëna këtë vit (periudhë e njëjtë) */
  const rows      = data.filter(d => d[curKey] !== null && d[curKey] !== undefined)
  const curTotal  = rows.reduce((s, d) => s + (d[curKey]  || 0), 0)
  const prevTotal = rows.reduce((s, d) => s + (d[prevKey] || 0), 0)
  const delta     = prevTotal > 0 ? ((curTotal - prevTotal) / prevTotal) * 100 : null
  const up        = delta !== null && delta >= 0

  const Tip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    const c = payload.find(p => p.dataKey === curKey)?.value
    const p = payload.find(p => p.dataKey === prevKey)?.value ?? 0
    const d = (c !== null && c !== undefined && p > 0) ? ((c - p) / p) * 100 : null
    return (
      <div className="bg-white border border-gray-100 rounded-xl shadow-lg px-4 py-3 text-xs min-w-[175px]">
        <p className="font-bold text-gray-700 mb-2">{label}</p>
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-gray-500">
            <span className="w-2 h-2 rounded-full" style={{ background: color }}/>{curLabel}
          </span>
          <span className="font-bold text-gray-800">
            {c === null || c === undefined ? '—' : fmt(c)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4 mt-1">
          <span className="flex items-center gap-1.5 text-gray-400">
            <span className="w-2 h-2 rounded-full" style={{ background: softColor }}/>{prevLabel}
          </span>
          <span className="font-semibold text-gray-500">{fmt(p)}</span>
        </div>
        {d !== null && (
          <p className={`mt-2 pt-2 border-t border-gray-50 font-bold ${d >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {d >= 0 ? '▲' : '▼'} {Math.abs(d).toFixed(1)}%
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 flex flex-col h-full">
      <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-gray-50 flex-wrap">
        <div>
          <p className="text-sm font-bold text-gray-800">{title}</p>
          <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
        </div>
        <div className="flex gap-3 text-[11px] text-gray-500 font-medium">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: color }}/>{curLabel}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-4 border-t-2 border-dashed" style={{ borderColor: softColor }}/>{prevLabel}
          </span>
        </div>
      </div>

      <div className="px-2 py-4">
        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={data} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor={color} stopOpacity={0.26} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false}
                   tickFormatter={v => v >= 1000 ? v/1000+'k' : v} />
            <Tooltip content={<Tip />} />
            <Line dataKey={prevKey} name={prevLabel} stroke={softColor} strokeWidth={2.2}
                  strokeDasharray="6 4" dot={false} />
            <Area dataKey={curKey} name={curLabel} stroke={color} strokeWidth={2.4}
                  fill={`url(#${gradId})`} connectNulls={false}
                  dot={{ r: 2.5, fill: '#fff', stroke: color, strokeWidth: 2 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-around gap-2 px-4 py-3 border-t border-gray-50 mt-auto">
        <div className="text-center">
          <p className="text-[10px] text-gray-400 font-medium">{curLabel}</p>
          <p className="text-sm font-bold mt-0.5" style={{ color }}>{fmt(curTotal)}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-gray-400 font-medium">{prevLabel}</p>
          <p className="text-sm font-bold text-gray-400 mt-0.5">{fmt(prevTotal)}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-gray-400 font-medium">Ndryshimi</p>
          <p className={`text-sm font-bold mt-0.5 ${up ? 'text-emerald-600' : 'text-red-500'}`}>
            {delta === null ? '—' : `${up ? '▲' : '▼'} ${Math.abs(delta).toFixed(1)}%`}
          </p>
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { invoices, customers, expenses, payments, navigate, setModal, closeModal, fmt, currentUser } = useApp()
  const [catFilter, setCatFilter] = useState('12m')

  const today    = new Date().toISOString().slice(0, 10)
  const thisYear = new Date().getFullYear().toString()
  const prevYear = (new Date().getFullYear() - 1).toString()
  const thisMonth = today.slice(0, 7)  // YYYY-MM

  const curMonthIdx = new Date().getMonth()   // 0-indexed; muajt pas tij s'kanë ardhur ende

  /* ── Shpenzime sipas muajit: viti aktual vs viti paraprak ── */
  const expensesYoY = useMemo(() =>
    MONTH_LBL.map((label, mo) => {
      const key  = `${thisYear}-${String(mo + 1).padStart(2, '0')}`
      const prev = `${prevYear}-${String(mo + 1).padStart(2, '0')}`
      return {
        month:        label,
        expenses:     mo <= curMonthIdx
          ? expenses.filter(e => e.date?.startsWith(key)).reduce((s, e) => s + (e.amount || 0), 0)
          : null,
        expensesPrev: expenses.filter(e => e.date?.startsWith(prev)).reduce((s, e) => s + (e.amount || 0), 0),
      }
    }),
    [expenses, thisYear, prevYear, curMonthIdx]
  )

  /* ── Helpers ── */
  const customerTypeMap = useMemo(() => new Map(customers.map(c => [c.name, c.type])), [customers])
  const getType = name => customerTypeMap.get(name) || 'individual'

  /* ── KPI 1: Klientë aktivë ── */
  // Fatura jo-void me subscriptionExpiry në të ardhmen (paguar ose jo)
  const activeClients = useMemo(() => {
    const names = new Set(
      invoices
        .filter(i =>
          i.status !== 'void' &&
          i.subscriptionExpiry &&
          i.subscriptionExpiry > today
        )
        .map(i => i.customer)
    )
    return names.size
  }, [invoices, today])

  /* ── KPI 2: Të ardhura totale viti aktual ── */
  // Përdor payments (datën e pagesës), jo datën e faturës
  const yearRevenue = useMemo(() =>
    payments
      .filter(p => p.date?.startsWith(thisYear))
      .reduce((s, p) => s + (p.amount || 0), 0),
    [payments, thisYear]
  )

  /* ── KPI 3: Shpenzime viti aktual ── */
  const yearExpenses = useMemo(() =>
    expenses
      .filter(e => e.date?.startsWith(thisYear))
      .reduce((s, e) => s + e.amount, 0),
    [expenses, thisYear]
  )

  /* ── KPI 4-6: Fatura në pritje ── */
  const pendingInvoices = useMemo(() =>
    invoices.filter(i => i.status === 'pending' || i.status === 'overdue'),
    [invoices]
  )
  const { pendingKlient, pendingReseller, pendingKlientAmt, pendingResellerAmt, pendingTotalAmt } = useMemo(() => {
    const klient   = pendingInvoices.filter(i => getType(i.customer) !== 'reseller')
    const reseller = pendingInvoices.filter(i => getType(i.customer) === 'reseller')
    return {
      pendingKlient:      klient,
      pendingReseller:    reseller,
      pendingKlientAmt:   klient.reduce((s, i) => s + i.amount, 0),
      pendingResellerAmt: reseller.reduce((s, i) => s + i.amount, 0),
      pendingTotalAmt:    pendingInvoices.reduce((s, i) => s + i.amount, 0),
    }
  }, [pendingInvoices, customerTypeMap])

  /* ── Shpenzime sipas kategorisë (me filter) ── */
  const { catData, catTotal, top5Types } = useMemo(() => {
    let filtered = expenses
    if (catFilter === '1m')   filtered = expenses.filter(e => e.date?.startsWith(thisMonth))
    if (catFilter === '12m')  filtered = expenses.filter(e => e.date?.startsWith(thisYear))
    if (catFilter === 'prev') filtered = expenses.filter(e => e.date?.startsWith(prevYear))

    const catGroups = {}
    const typeGroups = {}
    filtered.forEach(e => {
      const cat  = e.category || 'Tjera'
      const type = e.type || e.category || 'Tjera'
      catGroups[cat]   = (catGroups[cat]   || 0) + e.amount
      typeGroups[type] = (typeGroups[type] || 0) + e.amount
    })

    const catData = Object.entries(catGroups)
      .map(([name, value]) => ({ name, value, color: CAT_COLORS[name] || '#6b7280' }))
      .sort((a, b) => b.value - a.value)

    const top5Types = Object.entries(typeGroups)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)

    const catTotal = catData.reduce((s, c) => s + c.value, 0)

    return { catData, catTotal, top5Types }
  }, [expenses, catFilter, thisMonth, thisYear, prevYear])

  /* ── Shitje sipas muajit: viti aktual vs viti paraprak ── */
  const salesYoY = useMemo(() =>
    MONTH_LBL.map((label, mo) => {
      const key  = `${thisYear}-${String(mo + 1).padStart(2, '0')}`
      const prev = `${prevYear}-${String(mo + 1).padStart(2, '0')}`
      return {
        month:     label,
        sales:     mo <= curMonthIdx
          ? invoices.filter(i => i.date?.startsWith(key)  && i.status !== 'void').reduce((s, i) => s + (i.amount || 0), 0)
          : null,
        salesPrev: invoices.filter(i => i.date?.startsWith(prev) && i.status !== 'void').reduce((s, i) => s + (i.amount || 0), 0),
      }
    }),
    [invoices, thisYear, prevYear, curMonthIdx]
  )

  /* ── Krahasim YTD për KPI: e njëjta periudhë e vitit paraprak ── */
  const { revPrevYTD, expPrevYTD } = useMemo(() => {
    const from = `${prevYear}-01-01`
    const to   = `${prevYear}-${today.slice(5)}`   // deri në të njëjtën ditë e muaj
    return {
      revPrevYTD: payments.filter(p => p.date >= from && p.date <= to).reduce((s, p) => s + (p.amount || 0), 0),
      expPrevYTD: expenses.filter(e => e.date >= from && e.date <= to).reduce((s, e) => s + (e.amount || 0), 0),
    }
  }, [payments, expenses, prevYear, today])

  const pctDelta = (cur, prev) => prev > 0 ? ((cur - prev) / prev) * 100 : null
  const deltaLbl = d => d === null ? null : `${d >= 0 ? '+' : ''}${d.toFixed(1)}%`
  const revDelta = pctDelta(yearRevenue,  revPrevYTD)
  const expDelta = pctDelta(yearExpenses, expPrevYTD)
  const ytdCtx   = `deri ${MONTH_LBL[curMonthIdx]} ${prevYear}`

  const openInvoiceModal  = () => setModal(<InvoiceModal />)
  const openCustomerModal = () => setModal(<CustomerModal onClose={closeModal} />)
  const openExpenseModal  = () => setModal(<ExpenseModal  onClose={closeModal} />)

  const goFiltered = (page, filter) => {
    localStorage.setItem('arestv_nav_filter', JSON.stringify(filter))
    navigate(page)
  }

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Përshëndetje, {currentUser?.name?.split(' ')[0] || 'Mirë se erdhe'} 👋</h2>
          <p className="text-sm text-gray-400 mt-0.5 hidden sm:block">Pasqyra financiare — {new Date().toLocaleDateString('sq-AL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          <p className="text-sm text-gray-400 mt-0.5 sm:hidden">{new Date().toLocaleDateString('sq-AL', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
        </div>
      </div>

      {/* ── Veprime të shpejta ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { icon: FilePlus,    title: 'Krijo Faturë',  sub: 'Faturë e re shpejt',     action: () => navigate('invoices:create'),
            border: 'border-blue-400',    hover: 'hover:bg-blue-50',    icoBg: 'bg-blue-50',    icoFg: 'text-blue-500' },
          { icon: UserPlus,    title: 'Shto Klient',   sub: 'Regjistro klient të ri', action: () => navigate('customers:create'),
            border: 'border-emerald-400', hover: 'hover:bg-emerald-50', icoBg: 'bg-emerald-50', icoFg: 'text-emerald-500' },
          { icon: ReceiptText, title: 'Shpenzim i ri', sub: 'Regjistro shpenzim',     action: () => navigate('expenses:create'),
            border: 'border-orange-400',  hover: 'hover:bg-orange-50',  icoBg: 'bg-orange-50',  icoFg: 'text-orange-500' },
        ].map(({ icon: Icon, title, sub, action, border, hover, icoBg, icoFg }) => (
          <button key={title} onClick={action}
            className={`group flex items-center gap-3 bg-white border-[1.5px] ${border} ${hover} rounded-2xl p-4 text-left transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md active:scale-95`}>
            <span className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${icoBg} ${icoFg} group-hover:scale-110 transition-transform`}>
              <Icon size={18} />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold text-gray-800 truncate">{title}</span>
              <span className="block text-xs text-gray-400 truncate">{sub}</span>
            </span>
          </button>
        ))}
      </div>

      {/* ── 6 KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard
          icon={UserCheck}  iconBg="#ecfdf5"  iconColor="#059669"
          label="Klientë aktivë"
          value={activeClients}
          ctx="Abonime aktive"
        />
        <KpiCard
          icon={TrendingUp}  iconBg="#eff6ff"  iconColor="#2563eb"
          label={`Të ardhura ${thisYear}`}
          value={fmt(yearRevenue)}
          delta={deltaLbl(revDelta)}
          deltaTone={revDelta === null ? 'neutral' : revDelta >= 0 ? 'up' : 'down'}
          ctx={revPrevYTD > 0 ? `vs. ${fmt(revPrevYTD)} ${ytdCtx}` : `Pagesa të pranuara ${thisYear}`}
          onClick={() => goFiltered('payments', { year: thisYear })}
        />
        <KpiCard
          icon={TrendingDown}  iconBg="#fef2f2"  iconColor="#dc2626"
          label={`Shpenzime ${thisYear}`}
          value={fmt(yearExpenses)}
          delta={deltaLbl(expDelta)}
          deltaTone={expDelta === null ? 'neutral' : expDelta >= 0 ? 'down' : 'up'}
          ctx={expPrevYTD > 0 ? `vs. ${fmt(expPrevYTD)} ${ytdCtx}` : 'Shpenzime të regjistruara'}
          onClick={() => goFiltered('expenses', { year: thisYear })}
        />
        <KpiCard
          icon={Clock}  iconBg="#fffbeb"  iconColor="#d97706"
          label="Në pritje — Klient"
          value={fmt(pendingKlientAmt)}
          delta={`${pendingKlient.length} fatur${pendingKlient.length !== 1 ? 'a' : 'ë'}`}
          deltaTone="warn"
          ctx="individuale të papaguara"
          onClick={() => goFiltered('invoices', { status: 'pending', type: 'individual' })}
        />
        <KpiCard
          icon={Layers}  iconBg="#f5f3ff"  iconColor="#7c3aed"
          label="Në pritje — Reseller"
          value={fmt(pendingResellerAmt)}
          delta={`${pendingReseller.length} fatur${pendingReseller.length !== 1 ? 'a' : 'ë'}`}
          deltaTone="warn"
          ctx="reseller të papaguara"
          onClick={() => goFiltered('invoices', { status: 'pending', type: 'reseller' })}
        />
        <KpiCard
          icon={AlertCircle}  iconBg="#fff7ed"  iconColor="#ea580c"
          label="Në pritje — Total"
          value={fmt(pendingTotalAmt)}
          delta={`${pendingInvoices.length} fatura`}
          deltaTone="warn"
          ctx="gjithsej të papaguara"
          onClick={() => goFiltered('invoices', { status: 'pending', type: 'all' })}
        />
      </div>

      {/* ── Krahasimi vjetor: shitje & shpenzime ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-stretch">
        <YoYChart
          title="Shitje sipas muajit"
          sub={`${thisYear} vs. ${prevYear}`}
          data={salesYoY}
          curKey="sales"  prevKey="salesPrev"
          color="#10b981" softColor="#a7f3d0" gradId="yoy-sales"
          curLabel={thisYear} prevLabel={prevYear} fmt={fmt}
        />
        <YoYChart
          title="Shpenzime sipas muajit"
          sub={`${thisYear} vs. ${prevYear}`}
          data={expensesYoY}
          curKey="expenses" prevKey="expensesPrev"
          color="#ef4444" softColor="#fecaca" gradId="yoy-exp"
          curLabel={thisYear} prevLabel={prevYear} fmt={fmt}
        />
      </div>

      {/* ── Shpenzime sipas kategorisë ── */}
      <div className="grid grid-cols-1 gap-4">

        {/* Shpenzime sipas kategorisë */}
        <div className="card">
          <div className="px-5 py-4 border-b border-gray-50">
            <p className="text-sm font-bold text-gray-800 mb-2">Shpenzime sipas kategorisë</p>
            <div className="flex gap-1">
              {[
                { key: '1m',   label: '1 muaj' },
                { key: '12m',  label: `${thisYear}` },
                { key: 'prev', label: `${prevYear}` },
              ].map(f => (
                <button key={f.key} onClick={() => setCatFilter(f.key)}
                  className={`flex-1 px-2 py-1 rounded-lg text-[11px] font-bold transition-all ${
                    catFilter === f.key
                      ? 'bg-blue-500 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4">
            {catData.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-8 italic">Nuk ka shpenzime për këtë periudhë</p>
            ) : (
              <div className="flex gap-4">
                {/* ── Grafiku rrethor ── */}
                <div className="flex-shrink-0 flex flex-col items-center">
                  <ResponsiveContainer width={110} height={110}>
                    <PieChart>
                      <Pie data={catData} cx="50%" cy="50%" innerRadius={28} outerRadius={50}
                        paddingAngle={3} dataKey="value">
                        {catData.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <Tooltip formatter={v => [`€${Number(v).toLocaleString('de-DE')}`, '']}
                        contentStyle={{ border: '1px solid #f3f4f6', borderRadius: 10, fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-1 space-y-1">
                    {catData.map((e, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: e.color }} />
                        <span className="text-[10px] text-gray-500 truncate max-w-[70px]">{e.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── Top 5 produktet/shërbimet ── */}
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold text-gray-500 mb-2 uppercase tracking-wide">Top 5 shpenzime</p>
                  <div className="space-y-2">
                    {top5Types.map((t, i) => {
                      const pct = catTotal > 0 ? Math.round(t.value / catTotal * 100) : 0
                      return (
                        <div key={i}>
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-[11px] text-gray-700 truncate flex-1 pr-2 leading-tight">{t.name}</span>
                            <span className="text-[11px] font-bold text-gray-800 flex-shrink-0">€{t.value.toLocaleString('de-DE')}</span>
                          </div>
                          <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-400 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div className="flex items-center justify-between pt-2 mt-2 border-t border-gray-100">
                    <span className="text-[11px] font-bold text-gray-500">Total</span>
                    <span className="text-xs font-bold text-gray-800">€{catTotal.toLocaleString('de-DE')}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  )
}
