import { useState, useMemo } from 'react'
import {
  Users, TrendingUp, TrendingDown, Clock, FilePlus,
  UserPlus, ReceiptText, AlertCircle, UserCheck, Layers,
} from 'lucide-react'
import {
  ComposedChart, Bar, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
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
function KpiCard({ icon: Icon, iconBg, iconColor, label, value, sub, subColor = 'text-gray-400', onClick }) {
  const base = "bg-white rounded-xl border border-gray-100 p-5 flex items-start gap-4 transition-all duration-200"
  const interactive = onClick ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-md hover:border-blue-200" : "hover:-translate-y-0.5 hover:shadow-md"
  return (
    <div className={`${base} ${interactive}`} onClick={onClick}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: iconBg }}>
        <Icon size={18} style={{ color: iconColor }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide truncate">{label}</p>
        <p className="text-xl font-bold text-gray-800 mt-0.5 truncate">{value}</p>
        {sub && <p className={`text-xs mt-1 font-medium truncate ${subColor}`}>{sub}</p>}
        {onClick && <p className="text-[10px] text-blue-400 mt-1">Kliko për detaje →</p>}
      </div>
    </div>
  )
}

/* ── Custom tooltip per grafin ── */
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg px-4 py-3 text-xs min-w-[160px]">
      <p className="font-bold text-gray-700 mb-2">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-gray-500">
            <span className="w-2 h-2 rounded-full" style={{ background: p.color }}/>
            {p.name}
          </span>
          <span className="font-bold text-gray-800">€{Number(p.value).toLocaleString('de-DE')}</span>
        </div>
      ))}
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

  /* ── Cash-flow: 12 muajt e fundit (dinamike) ── */
  const cashFlow = useMemo(() => {
    const now = new Date()
    const months = []
    for (let i = 11; i >= 0; i--) {
      const d    = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const yr   = d.getFullYear()
      const mo   = d.getMonth()              // 0-indexed
      const key  = `${yr}-${String(mo + 1).padStart(2, '0')}`
      const prev = `${yr - 1}-${String(mo + 1).padStart(2, '0')}`
      months.push({ key, prev, label: `${MONTH_LBL[mo]}'${String(yr).slice(2)}` })
    }
    return months.map(({ key, prev, label }) => ({
      month:    label,
      revenue:  payments.filter(p => p.date?.startsWith(key)).reduce((s, p) => s + (p.amount || 0), 0),
      expenses: expenses.filter(e => e.date?.startsWith(key)).reduce((s, e) => s + (e.amount || 0), 0),
      revPrev:  payments.filter(p => p.date?.startsWith(prev)).reduce((s, p) => s + (p.amount || 0), 0),
    }))
  }, [payments, expenses])

  /* ── Helpers ── */
  const getType = name => customers.find(c => c.name === name)?.type || 'individual'

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
  const pendingKlient   = pendingInvoices.filter(i => getType(i.customer) !== 'reseller')
  const pendingReseller = pendingInvoices.filter(i => getType(i.customer) === 'reseller')

  const pendingKlientAmt   = pendingKlient.reduce((s, i) => s + i.amount, 0)
  const pendingResellerAmt = pendingReseller.reduce((s, i) => s + i.amount, 0)
  const pendingTotalAmt    = pendingInvoices.reduce((s, i) => s + i.amount, 0)

  /* ── Shpenzime sipas kategorisë (me filter) ── */
  const catData = useMemo(() => {
    let filtered = expenses
    if (catFilter === '1m')   filtered = expenses.filter(e => e.date?.startsWith(thisMonth))
    if (catFilter === '12m')  filtered = expenses.filter(e => e.date?.startsWith(thisYear))
    if (catFilter === 'prev') filtered = expenses.filter(e => e.date?.startsWith(prevYear))

    const groups = {}
    filtered.forEach(e => {
      const cat = e.category || 'Tjera'
      groups[cat] = (groups[cat] || 0) + e.amount
    })
    return Object.entries(groups)
      .map(([name, value]) => ({ name, value, color: CAT_COLORS[name] || '#6b7280' }))
      .sort((a, b) => b.value - a.value)
  }, [expenses, catFilter, thisMonth, thisYear, prevYear])

  const catTotal = catData.reduce((s, c) => s + c.value, 0)

  /* ── Shitje sipas muajit: krahasim me vitin 2025 ── */
  const salesComparison = useMemo(() => {
    const now = new Date()
    const months = []
    for (let i = 11; i >= 0; i--) {
      const d    = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const yr   = d.getFullYear()
      const mo   = d.getMonth()              // 0-indexed
      const key  = `${yr}-${String(mo + 1).padStart(2, '0')}`
      const prev = `${yr - 1}-${String(mo + 1).padStart(2, '0')}`
      months.push({ key, prev, label: `${MONTH_LBL[mo]}'${String(yr).slice(2)}` })
    }
    return months.map(({ key, prev, label }) => ({
      month:      label,
      sales:      invoices.filter(i => i.date?.startsWith(key) && i.status !== 'void').reduce((s, i) => s + (i.amount || 0), 0),
      salesPrev:  invoices.filter(i => i.date?.startsWith(prev) && i.status !== 'void').reduce((s, i) => s + (i.amount || 0), 0),
    }))
  }, [invoices])

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
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { icon: FilePlus,    title: 'Krijo Faturë',  sub: 'Faturë e re shpejt',    action: openInvoiceModal },
          { icon: UserPlus,    title: 'Shto Klient',   sub: 'Regjistro klient të ri', action: openCustomerModal },
          { icon: ReceiptText, title: 'Shpenzim i ri', sub: 'Regjistro shpenzim',     action: openExpenseModal  },
        ].map(({ icon: Icon, title, sub, action }) => (
          <button key={title} onClick={action}
            className="text-left bg-white border border-gray-100 rounded-xl p-4 hover:border-blue-300 hover:bg-blue-50 transition-all duration-150 group hover:-translate-y-0.5 hover:shadow-md">
            <Icon size={20} className="text-blue-500 mb-2 group-hover:scale-110 transition-transform" />
            <p className="text-xs sm:text-sm font-semibold text-gray-700">{title}</p>
            <p className="text-xs text-gray-400 mt-0.5 hidden sm:block">{sub}</p>
          </button>
        ))}
      </div>

      {/* ── 6 KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard
          icon={UserCheck}  iconBg="#ecfdf5"  iconColor="#059669"
          label="Klientë aktivë"
          value={activeClients}
          sub={`Abonime të paguara aktive`}
        />
        <KpiCard
          icon={TrendingUp}  iconBg="#eff6ff"  iconColor="#2563eb"
          label={`Të ardhura ${thisYear}`}
          value={fmt(yearRevenue)}
          sub={`Pagesa të pranuara ${thisYear}`}
          onClick={() => goFiltered('payments', { year: thisYear })}
        />
        <KpiCard
          icon={TrendingDown}  iconBg="#fef2f2"  iconColor="#dc2626"
          label={`Shpenzime ${thisYear}`}
          value={fmt(yearExpenses)}
          sub={`Shpenzime të regjistruara`}
          subColor="text-blue-400"
          onClick={() => goFiltered('expenses', { year: thisYear })}
        />
        <KpiCard
          icon={Clock}  iconBg="#fffbeb"  iconColor="#d97706"
          label="Në pritje — Klient"
          value={fmt(pendingKlientAmt)}
          sub={`${pendingKlient.length} fatur${pendingKlient.length !== 1 ? 'a' : 'ë'} individuale`}
          subColor="text-amber-500"
          onClick={() => goFiltered('invoices', { status: 'pending', type: 'individual' })}
        />
        <KpiCard
          icon={Layers}  iconBg="#f5f3ff"  iconColor="#7c3aed"
          label="Në pritje — Reseller"
          value={fmt(pendingResellerAmt)}
          sub={`${pendingReseller.length} fatur${pendingReseller.length !== 1 ? 'a' : 'ë'} reseller`}
          subColor="text-purple-500"
          onClick={() => goFiltered('invoices', { status: 'pending', type: 'reseller' })}
        />
        <KpiCard
          icon={AlertCircle}  iconBg="#fff7ed"  iconColor="#ea580c"
          label="Në pritje — Total"
          value={fmt(pendingTotalAmt)}
          sub={`${pendingInvoices.length} fatura gjithsej`}
          subColor="text-orange-500"
          onClick={() => goFiltered('invoices', { status: 'pending', type: 'all' })}
        />
      </div>

      {/* ── Grafiku i fluksit + Shpenzime sipas kategorisë ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Cash-flow 12 muaj */}
        <div className="card lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-gray-50">
            <p className="text-sm font-bold text-gray-800">Fluksi i të hyrave &amp; shpenzimeve — 12 muaj</p>
            <div className="flex flex-wrap gap-3 text-[11px] text-gray-400">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block"/>Të ardhura {thisYear}</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-blue-400 inline-block"/>Shpenzime {thisYear}</span>
              <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 bg-blue-300 inline-block border-t-2 border-dashed border-blue-300"/>T.ardhura {prevYear}</span>
            </div>
          </div>
          <div className="px-2 py-4">
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={cashFlow} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? v/1000+'k' : v} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="revenue"  name={`Të ardhura ${thisYear}`} fill="#3b82f6" radius={[3,3,0,0]} maxBarSize={22} />
                <Bar dataKey="expenses" name={`Shpenzime ${thisYear}`}  fill="#f87171" radius={[3,3,0,0]} maxBarSize={22} />
                <Line dataKey="revPrev" name={`T.ardhura ${prevYear}`} stroke="#93c5fd" strokeWidth={2} strokeDasharray="5 3" dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Shpenzime sipas kategorisë */}
        <div className="card">
          <div className="px-5 py-4 border-b border-gray-50">
            <p className="text-sm font-bold text-gray-800 mb-2">Shpenzime sipas kategorisë</p>
            {/* Filter tabs */}
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
              <>
                <ResponsiveContainer width="100%" height={120}>
                  <PieChart>
                    <Pie data={catData} cx="50%" cy="50%" innerRadius={32} outerRadius={55}
                      paddingAngle={3} dataKey="value">
                      {catData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip formatter={v => [`€${Number(v).toLocaleString('de-DE')}`, '']}
                      contentStyle={{ border: '1px solid #f3f4f6', borderRadius: 10, fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>

                <div className="space-y-2 mt-3">
                  {catData.map((e, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: e.color }} />
                      <span className="text-xs text-gray-600 flex-1 truncate">{e.name}</span>
                      <span className="text-xs font-bold text-gray-800">€{e.value.toLocaleString('de-DE')}</span>
                      <span className="text-[10px] text-gray-400 w-10 text-right">
                        {catTotal > 0 ? Math.round(e.value / catTotal * 100) : 0}%
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100 mt-2">
                    <span className="text-xs font-bold text-gray-500">Total</span>
                    <span className="text-sm font-bold text-gray-800">€{catTotal.toLocaleString('de-DE')}</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Shitje sipas muajit ── */}
      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-gray-50">
          <p className="text-sm font-bold text-gray-800">Shitje sipas muajit — 12 muaj</p>
          <div className="flex flex-wrap gap-3 text-[11px] text-gray-400">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block"/>Shitje {thisYear}</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block"/>Shitje {prevYear}</span>
          </div>
        </div>
        <div className="px-2 py-4">
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={salesComparison} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? v/1000+'k' : v} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="sales"     name={`Shitje ${thisYear}`} fill="#10b981" radius={[3,3,0,0]} maxBarSize={22} />
              <Bar dataKey="salesPrev" name={`Shitje ${prevYear}`} fill="#3b82f6" radius={[3,3,0,0]} maxBarSize={22} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  )
}
