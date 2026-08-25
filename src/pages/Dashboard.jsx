import { useState, useMemo } from 'react'
import {
  Users, TrendingUp, TrendingDown, Clock, FilePlus,
  UserPlus, ReceiptText, AlertCircle, UserCheck, Layers,
  ArrowUp, ArrowDown, PieChart as PieIcon, CalendarDays, Eye, EyeOff,
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

const MONTH_LBL  = ['Jan','Shk','Mar','Pri','Maj','Qer','Kor','Gus','Sht','Tet','Nën','Dhj']
const MONTH_FULL = ['Janar','Shkurt','Mars','Prill','Maj','Qershor','Korrik','Gusht','Shtator','Tetor','Nëntor','Dhjetor']

const pad2 = n => String(n).padStart(2, '0')

// Kufijtë e një periudhe: muaj i vetëm (kur month != null) ose vit i plotë (kur month === null)
function periodRange(year, month) {
  const y = parseInt(year)
  if (month == null) return { start: `${y}-01-01`, end: `${y}-12-31` }
  const lastDay = new Date(y, month + 1, 0).getDate()
  return { start: `${y}-${pad2(month + 1)}-01`, end: `${y}-${pad2(month + 1)}-${pad2(lastDay)}` }
}

// Periudha menjëherë paraardhëse (muaji i kaluar, ose viti i kaluar nëse s'ka muaj të zgjedhur)
function precedingPeriod(year, month) {
  const y = parseInt(year)
  if (month == null) return { year: y - 1, month: null }
  if (month === 0)    return { year: y - 1, month: 11 }
  return { year: y, month: month - 1 }
}

/* ── Paleta e ngjyrave për kategoritë ──
   Më parë ngjyrat vinin nga një listë e fiksuar emrash, prandaj çdo kategori
   që nuk ishte në të dilte gri dhe shpenzimet nuk dalloheshin nga njëra-tjetra.
   Tani ngjyra caktohet automatikisht nga emri i kategorisë: e njëjta kategori
   merr gjithnjë të njëjtën ngjyrë, dhe ngjyrat mbeten të dallueshme mes tyre. */
const PALETTE = [
  '#2563eb', '#dc2626', '#7c3aed', '#059669', '#d97706', '#0891b2',
  '#be185d', '#4f46e5', '#ea580c', '#15803d', '#db2777', '#ca8a04',
]

const hashName = s => {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

/* Cakton një ngjyrë të dallueshme për secilin emër; nis nga hash-i i emrit
   (që ngjyra të jetë e qëndrueshme) dhe kalon te tjetra nëse është e zënë. */
function assignColors(names) {
  const used = new Set()
  const map  = {}
  names.forEach(name => {
    let idx = hashName(name) % PALETTE.length
    for (let t = 0; t < PALETTE.length && used.has(idx); t++) idx = (idx + 1) % PALETTE.length
    used.add(idx)
    map[name] = PALETTE[idx]
  })
  return map
}

/* ── Stat card komponent ── */
const DELTA_TONE = {
  up:      'bg-emerald-50 text-emerald-600',
  down:    'bg-red-50 text-red-600',
  warn:    'bg-amber-50 text-amber-600',
  neutral: 'bg-gray-100 text-gray-500',
}

function KpiCard({ icon: Icon, iconBg, iconColor, label, value, delta, deltaTone = 'neutral', ctx, onClick, hidden }) {
  const base = "bg-white rounded-2xl border border-gray-100 p-5 flex flex-col h-full transition-all duration-200"
  const interactive = onClick ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-lg hover:border-blue-100" : "hover:-translate-y-0.5 hover:shadow-md"
  const Arrow = deltaTone === 'up' ? ArrowUp : deltaTone === 'down' ? ArrowDown : null
  const displayValue = hidden ? '••••••' : value
  const displayDelta = hidden ? null : delta
  const displayCtx   = hidden ? '••• •••' : ctx
  return (
    <div className={`${base} ${interactive}`} onClick={onClick}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium text-gray-500 truncate">{label}</p>
        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: iconBg }}>
          <Icon size={17} style={{ color: iconColor }} />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-800 mt-2 truncate">{displayValue}</p>
      <div className="flex items-center gap-2 mt-auto pt-3 flex-wrap">
        {displayDelta && (
          <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${DELTA_TONE[deltaTone]}`}>
            {Arrow && <Arrow size={11} strokeWidth={3} />}{displayDelta}
          </span>
        )}
        {displayCtx && <span className="text-[11px] text-gray-400 truncate">{displayCtx}</span>}
      </div>
    </div>
  )
}

/* ── Graf krahasues: viti aktual vs viti paraprak ── */
function YoYChart({ title, sub, data, curKey, prevKey, color, softColor, gradId, curLabel, prevLabel, fmt, hidden }) {
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

      <div className={`px-2 py-4 transition-all duration-200 ${hidden ? 'blur-md select-none pointer-events-none' : ''}`}>
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
          <p className="text-sm font-bold mt-0.5" style={{ color }}>{hidden ? '••••••' : fmt(curTotal)}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-gray-400 font-medium">{prevLabel}</p>
          <p className="text-sm font-bold text-gray-400 mt-0.5">{hidden ? '••••••' : fmt(prevTotal)}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-gray-400 font-medium">Ndryshimi</p>
          <p className={`text-sm font-bold mt-0.5 ${up ? 'text-emerald-600' : 'text-red-500'}`}>
            {hidden ? '•••' : delta === null ? '—' : `${up ? '▲' : '▼'} ${Math.abs(delta).toFixed(1)}%`}
          </p>
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { invoices, customers, expenses, payments, navigate, setModal, closeModal, fmt, currentUser } = useApp()
  const [activeCat, setActiveCat] = useState(null)   // indeksi i segmentit nën kursor
  const [hideData, setHideData] = useState(true)      // fshehur si parazgjedhje — mbrojtje privatësie

  const today             = new Date().toISOString().slice(0, 10)
  const actualCurrentYear = new Date().getFullYear().toString()
  const curMonthIdx       = new Date().getMonth()   // 0-indexed; muajt pas tij s'kanë ardhur ende

  /* ── Filteri global i Dashboard-it: muaj + vit — ndikon në çdo kartelë/grafik më poshtë ── */
  const [filterYear,  setFilterYear]  = useState(actualCurrentYear)
  const [filterMonth, setFilterMonth] = useState(null) // null = krejt vitin

  const availableYears = useMemo(() => {
    const set = new Set([actualCurrentYear])
    ;[...invoices, ...payments, ...expenses].forEach(x => { if (x.date) set.add(x.date.slice(0, 4)) })
    return [...set].sort((a, b) => b.localeCompare(a))
  }, [invoices, payments, expenses, actualCurrentYear])

  // Kufijtë e periudhës së zgjedhur — periudhat "në vazhdim" (viti/muaji aktual) kufizohen
  // te sot, periudhat e kaluara mbeten të plota (2025 = gjithë viti, 2026 = deri sot).
  const rawRange         = periodRange(filterYear, filterMonth)
  const periodWasCapped  = rawRange.end > today
  const periodStart      = rawRange.start
  const periodEnd        = periodWasCapped ? today : rawRange.end
  const periodLabel      = filterMonth != null ? `${MONTH_FULL[filterMonth]} ${filterYear}` : filterYear

  // Krahasimi (a): e njëjta periudhë, një vit më parë — për Të ardhura/Shpenzime (formula YTD ekzistuese e përgjithësuar)
  const yoyPrevYear     = (parseInt(filterYear) - 1).toString()
  const yoyRawRange     = periodRange(yoyPrevYear, filterMonth)
  const yoyPrevStart    = yoyRawRange.start
  const yoyPrevEnd      = periodWasCapped ? `${yoyPrevYear}${periodEnd.slice(4)}` : yoyRawRange.end
  const yoyPrevMonthIdx = parseInt(periodEnd.slice(5, 7)) - 1
  const ytdCtx          = `deri ${MONTH_LBL[yoyPrevMonthIdx]} ${yoyPrevYear}`

  // Krahasimi (b): periudha menjëherë paraardhëse — për 'Klientë aktivë' (trend, jo krahasim YoY)
  const precP     = precedingPeriod(filterYear, filterMonth)
  const precRange = periodRange(precP.year, precP.month)
  const precAsOf  = precRange.end
  const precLabel = filterMonth != null ? 'muajin e kaluar' : 'vitin e kaluar'

  /* ── Të ardhura sipas muajit: viti i zgjedhur vs viti paraprak ──
     Bazohet te pagesat e pranuara (data e pagesës), jo te faturat.
     Respekton vetëm filterin e VITIT (grafik 12-mujor, s'ngushtohet në 1 muaj). */
  const chartCutoffIdx = filterYear === actualCurrentYear ? curMonthIdx : 11
  const chartPrevYear  = (parseInt(filterYear) - 1).toString()

  const revenueYoY = useMemo(() =>
    MONTH_LBL.map((label, mo) => {
      const key  = `${filterYear}-${pad2(mo + 1)}`
      const prev = `${chartPrevYear}-${pad2(mo + 1)}`
      return {
        month:       label,
        revenue:     mo <= chartCutoffIdx
          ? payments.filter(p => p.date?.startsWith(key)).reduce((s, p) => s + (p.amount || 0), 0)
          : null,
        revenuePrev: payments.filter(p => p.date?.startsWith(prev)).reduce((s, p) => s + (p.amount || 0), 0),
      }
    }),
    [payments, filterYear, chartPrevYear, chartCutoffIdx]
  )

  /* ── Shpenzime sipas muajit: viti i zgjedhur vs viti paraprak ── */
  const expensesYoY = useMemo(() =>
    MONTH_LBL.map((label, mo) => {
      const key  = `${filterYear}-${pad2(mo + 1)}`
      const prev = `${chartPrevYear}-${pad2(mo + 1)}`
      return {
        month:        label,
        expenses:     mo <= chartCutoffIdx
          ? expenses.filter(e => e.date?.startsWith(key)).reduce((s, e) => s + (e.amount || 0), 0)
          : null,
        expensesPrev: expenses.filter(e => e.date?.startsWith(prev)).reduce((s, e) => s + (e.amount || 0), 0),
      }
    }),
    [expenses, filterYear, chartPrevYear, chartCutoffIdx]
  )

  /* ── Helpers ── */
  const customerTypeMap = useMemo(() => new Map(customers.map(c => [c.name, c.type])), [customers])
  const getType = name => customerTypeMap.get(name) || 'individual'

  /* ── KPI 1: Klientë aktivë — 'si të ishte' në fund të periudhës së zgjedhur ── */
  const activeClients = useMemo(() => {
    const names = new Set(
      invoices
        .filter(i => i.status !== 'void' && i.subscriptionExpiry && i.date && i.date <= periodEnd && i.subscriptionExpiry > periodEnd)
        .map(i => i.customer)
    )
    return names.size
  }, [invoices, periodEnd])

  /* Klientë aktivë në fund të periudhës paraardhëse — vetëm për krahasim */
  const activeClientsPrev = useMemo(() => {
    const names = new Set(
      invoices
        .filter(i => i.status !== 'void' && i.subscriptionExpiry && i.date && i.date <= precAsOf && i.subscriptionExpiry > precAsOf)
        .map(i => i.customer)
    )
    return names.size
  }, [invoices, precAsOf])

  /* ── KPI 2: Të ardhura, periudha e zgjedhur ── */
  const periodRevenue = useMemo(() =>
    payments.filter(p => p.date >= periodStart && p.date <= periodEnd).reduce((s, p) => s + (p.amount || 0), 0),
    [payments, periodStart, periodEnd]
  )

  /* ── KPI 3: Shpenzime, periudha e zgjedhur ── */
  const periodExpenses = useMemo(() =>
    expenses.filter(e => e.date >= periodStart && e.date <= periodEnd).reduce((s, e) => s + e.amount, 0),
    [expenses, periodStart, periodEnd]
  )

  /* ── KPI 4-6: Fatura në pritje, të lëshuara brenda periudhës së zgjedhur ── */
  const pendingInvoices = useMemo(() =>
    invoices.filter(i => (i.status === 'pending' || i.status === 'overdue') && i.date >= periodStart && i.date <= periodEnd),
    [invoices, periodStart, periodEnd]
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

  /* ── Shpenzime sipas kategorisë, brenda periudhës së zgjedhur globalisht
     (më parë kishte filter lokal 1muaj/12muaj/viti-paraprak të pavarur — tani ndjek
     filterin e përbashkët të faqes, si çdo kartelë tjetër) ── */
  const { catData, catTotal, top5Types, groupByType } = useMemo(() => {
    const filtered = expenses.filter(e => e.date >= periodStart && e.date <= periodEnd)

    const catGroups = {}
    const typeGroups = {}
    filtered.forEach(e => {
      const cat  = e.category || 'Tjera'
      const type = e.type || e.category || 'Tjera'
      catGroups[cat] = (catGroups[cat] || 0) + e.amount
      // Ruajmë edhe ndarjen sipas kategorisë, që pika e listës të marrë ngjyrën e saktë
      if (!typeGroups[type]) typeGroups[type] = { value: 0, cats: {} }
      typeGroups[type].value += e.amount
      typeGroups[type].cats[cat] = (typeGroups[type].cats[cat] || 0) + e.amount
    })

    const catTotal = filtered.reduce((s, e) => s + (e.amount || 0), 0)

    const sortedCats = Object.entries(catGroups)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)

    const typeList = Object.entries(typeGroups)
      .map(([name, g]) => ({ name, value: g.value, cats: g.cats }))
      .sort((a, b) => b.value - a.value)

    /* Kategoria shpesh nuk plotësohet dhe çdo shpenzim bie te "Tjera".
       Atëherë një kategori e vetme do të thoshte një ngjyrë e vetme, prandaj
       grupojmë sipas llojit të shpenzimit që grafiku të ketë kuptim. */
    const groupByType = sortedCats.length < 2

    let donutRaw
    if (groupByType) {
      const TOP = 8
      donutRaw = typeList.slice(0, TOP).map(t => ({ name: t.name, value: t.value }))
      const rest = typeList.slice(TOP).reduce((s, t) => s + t.value, 0)
      if (rest > 0) donutRaw.push({ name: 'Të tjera', value: rest })
    } else {
      donutRaw = sortedCats
    }

    const top5Raw = typeList.slice(0, 5)

    /* Ngjyrat caktohen për çdo emër të shfaqur; segmentet më të mëdha të
       donut-it renditen të parat, që ato të marrin ngjyrën e tyre të preferuar. */
    const colorMap = assignColors([...new Set([
      ...donutRaw.map(d => d.name),
      ...top5Raw.map(t => t.name),
      ...sortedCats.map(c => c.name),
    ])])

    const catData = donutRaw.map(d => ({ ...d, color: colorMap[d.name] }))

    const top5Types = top5Raw.map(t => {
      // Kategoria dominuese e këtij lloji shpenzimi (ajo me shumën më të madhe)
      const cat = Object.entries(t.cats).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Tjera'
      return {
        name: t.name, value: t.value, category: cat,
        // Kur kategoritë mungojnë, ngjyra vjen nga vetë emri i shpenzimit
        color: (groupByType ? colorMap[t.name] : colorMap[cat]) || PALETTE[0],
      }
    })

    return { catData, catTotal, top5Types, groupByType }
  }, [expenses, periodStart, periodEnd])

  /* ── Shitje sipas muajit: viti i zgjedhur vs viti paraprak ── */
  const salesYoY = useMemo(() =>
    MONTH_LBL.map((label, mo) => {
      const key  = `${filterYear}-${pad2(mo + 1)}`
      const prev = `${chartPrevYear}-${pad2(mo + 1)}`
      return {
        month:     label,
        sales:     mo <= chartCutoffIdx
          ? invoices.filter(i => i.date?.startsWith(key)  && i.status !== 'void').reduce((s, i) => s + (i.amount || 0), 0)
          : null,
        salesPrev: invoices.filter(i => i.date?.startsWith(prev) && i.status !== 'void').reduce((s, i) => s + (i.amount || 0), 0),
      }
    }),
    [invoices, filterYear, chartPrevYear, chartCutoffIdx]
  )

  /* ── Krahasimi me të njëjtën periudhë, vitin paraprak ── */
  const { revPrevYTD, expPrevYTD } = useMemo(() => ({
    revPrevYTD: payments.filter(p => p.date >= yoyPrevStart && p.date <= yoyPrevEnd).reduce((s, p) => s + (p.amount || 0), 0),
    expPrevYTD: expenses.filter(e => e.date >= yoyPrevStart && e.date <= yoyPrevEnd).reduce((s, e) => s + (e.amount || 0), 0),
  }), [payments, expenses, yoyPrevStart, yoyPrevEnd])

  const pctDelta = (cur, prev) => prev > 0 ? ((cur - prev) / prev) * 100 : null
  const deltaLbl = d => d === null ? null : `${d >= 0 ? '+' : ''}${d.toFixed(1)}%`
  const revDelta = pctDelta(periodRevenue,  revPrevYTD)
  const expDelta = pctDelta(periodExpenses, expPrevYTD)

  /* Klientë aktivë: ndryshimi ndaj periudhës paraardhëse */
  const clientDelta = activeClients - activeClientsPrev
  const clientTone  = clientDelta > 0 ? 'up' : clientDelta < 0 ? 'down' : 'neutral'

  /* Ikona lart-djathtas ndjek drejtimin real; ngjyra tregon nëse është mirë apo keq.
     Te shpenzimet rritja është e keqe, prandaj toni është i kundërt me drejtimin. */
  const revUp   = revDelta === null ? true : revDelta >= 0
  const expUp   = expDelta === null ? true : expDelta >= 0
  const revIcon = revUp ? TrendingUp : TrendingDown
  const expIcon = expUp ? TrendingUp : TrendingDown
  const revBg   = revDelta === null ? '#eff6ff' : revUp ? '#ecfdf5' : '#fef2f2'
  const revFg   = revDelta === null ? '#2563eb' : revUp ? '#059669' : '#dc2626'
  const expBg   = expDelta === null ? '#fef2f2' : expUp ? '#fef2f2' : '#ecfdf5'
  const expFg   = expDelta === null ? '#dc2626' : expUp ? '#dc2626' : '#059669'

  const openInvoiceModal  = () => setModal(<InvoiceModal />)
  const openCustomerModal = () => setModal(<CustomerModal onClose={closeModal} />)
  const openExpenseModal  = () => setModal(<ExpenseModal  onClose={closeModal} />)

  const goFiltered = (page, filter) => {
    localStorage.setItem('arestv_nav_filter', JSON.stringify(filter))
    navigate(page)
  }

  return (
    <div className="space-y-6 max-w-6xl">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Përshëndetje, {currentUser?.name?.split(' ')[0] || 'Mirë se erdhe'} 👋</h2>
          <p className="text-sm text-gray-400 mt-0.5 hidden sm:block">Pasqyra financiare — {new Date().toLocaleDateString('sq-AL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          <p className="text-sm text-gray-400 mt-0.5 sm:hidden">{new Date().toLocaleDateString('sq-AL', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
        </div>

        {/* Filteri i periudhës — ndikon në krejt të dhënat e faqes */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl px-2.5 py-1.5 shadow-sm">
            <CalendarDays size={14} className="text-gray-400 flex-shrink-0" />
            <select
              value={filterMonth ?? 'all'}
              onChange={e => setFilterMonth(e.target.value === 'all' ? null : parseInt(e.target.value))}
              className="bg-transparent border-none outline-none text-sm font-semibold text-gray-700 cursor-pointer"
            >
              <option value="all">Krejt vitin</option>
              {MONTH_FULL.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl px-2.5 py-1.5 shadow-sm">
            <select
              value={filterYear}
              onChange={e => setFilterYear(e.target.value)}
              className="bg-transparent border-none outline-none text-sm font-semibold text-gray-700 cursor-pointer"
            >
              {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <button
            onClick={() => setHideData(h => !h)}
            title={hideData ? 'Shfaq të dhënat' : 'Fshih të dhënat'}
            className="flex items-center justify-center w-9 h-9 bg-white border border-gray-200 rounded-xl shadow-sm text-gray-500 hover:text-blue-600 hover:border-blue-200 transition-colors flex-shrink-0"
          >
            {hideData ? <EyeOff size={15}/> : <Eye size={15}/>}
          </button>
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
          delta={`${clientDelta > 0 ? '+' : ''}${clientDelta}`}
          deltaTone={clientTone}
          ctx={`vs. ${activeClientsPrev} ${precLabel}`}
          hidden={hideData}
        />
        <KpiCard
          icon={revIcon}  iconBg={revBg}  iconColor={revFg}
          label={`Të ardhura ${periodLabel}`}
          value={fmt(periodRevenue)}
          delta={deltaLbl(revDelta)}
          deltaTone={revDelta === null ? 'neutral' : revDelta >= 0 ? 'up' : 'down'}
          ctx={`vs. ${fmt(revPrevYTD)} ${ytdCtx}`}
          onClick={() => goFiltered('payments', { year: filterYear })}
          hidden={hideData}
        />
        <KpiCard
          icon={expIcon}  iconBg={expBg}  iconColor={expFg}
          label={`Shpenzime ${periodLabel}`}
          value={fmt(periodExpenses)}
          delta={deltaLbl(expDelta)}
          deltaTone={expDelta === null ? 'neutral' : expDelta >= 0 ? 'down' : 'up'}
          ctx={`vs. ${fmt(expPrevYTD)} ${ytdCtx}`}
          onClick={() => goFiltered('expenses', { year: filterYear })}
          hidden={hideData}
        />
        <KpiCard
          icon={Clock}  iconBg="#fffbeb"  iconColor="#d97706"
          label="Në pritje — Klient"
          value={fmt(pendingKlientAmt)}
          delta={`${pendingKlient.length} fatur${pendingKlient.length !== 1 ? 'a' : 'ë'}`}
          deltaTone="warn"
          ctx="individuale të papaguara"
          onClick={() => goFiltered('invoices', { status: 'pending', type: 'individual' })}
          hidden={hideData}
        />
        <KpiCard
          icon={Layers}  iconBg="#f5f3ff"  iconColor="#7c3aed"
          label="Në pritje — Reseller"
          value={fmt(pendingResellerAmt)}
          delta={`${pendingReseller.length} fatur${pendingReseller.length !== 1 ? 'a' : 'ë'}`}
          deltaTone="warn"
          ctx="reseller të papaguara"
          onClick={() => goFiltered('invoices', { status: 'pending', type: 'reseller' })}
          hidden={hideData}
        />
        <KpiCard
          icon={AlertCircle}  iconBg="#fff7ed"  iconColor="#ea580c"
          label="Në pritje — Total"
          value={fmt(pendingTotalAmt)}
          delta={`${pendingInvoices.length} fatura`}
          deltaTone="warn"
          ctx="gjithsej të papaguara"
          onClick={() => goFiltered('invoices', { status: 'pending', type: 'all' })}
          hidden={hideData}
        />
      </div>

      {/* ── Shitje sipas muajit (nga faturat) ── */}
      <YoYChart
        title="Shitje sipas muajit"
        sub={`Nga faturat e lëshuara — ${filterYear} vs. ${chartPrevYear}`}
        data={salesYoY}
        curKey="sales"  prevKey="salesPrev"
        color="#6366f1" softColor="#c7d2fe" gradId="yoy-sales"
        curLabel={filterYear} prevLabel={chartPrevYear} fmt={fmt}
        hidden={hideData}
      />

      {/* ── Të ardhura & shpenzime sipas muajit ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-stretch">
        <YoYChart
          title="Të ardhura sipas muajit"
          sub={`Nga pagesat e pranuara — ${filterYear} vs. ${chartPrevYear}`}
          data={revenueYoY}
          curKey="revenue" prevKey="revenuePrev"
          color="#10b981" softColor="#a7f3d0" gradId="yoy-revenue"
          curLabel={filterYear} prevLabel={chartPrevYear} fmt={fmt}
          hidden={hideData}
        />
        <YoYChart
          title="Shpenzime sipas muajit"
          sub={`${filterYear} vs. ${chartPrevYear}`}
          data={expensesYoY}
          curKey="expenses" prevKey="expensesPrev"
          color="#ef4444" softColor="#fecaca" gradId="yoy-exp"
          curLabel={filterYear} prevLabel={chartPrevYear} fmt={fmt}
          hidden={hideData}
        />
      </div>

      {/* ── Shpenzime sipas kategorisë ── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 mb-6 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-[9px] bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
              <PieIcon size={17} />
            </span>
            <div>
              <p className="text-[17px] font-bold text-gray-900 leading-tight">
                Shpenzime sipas {groupByType ? 'llojit' : 'kategorisë'}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">{periodLabel}</p>
            </div>
          </div>
        </div>

        {catData.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-10 italic">Nuk ka shpenzime për këtë periudhë</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-[220px_1fr] gap-8 items-center">

            {/* ── Donut me total në qendër ── */}
            <div className={`relative h-[200px] flex items-center justify-center transition-all duration-200 ${hideData ? 'blur-md select-none pointer-events-none' : ''}`}>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={catData} cx="50%" cy="50%"
                    innerRadius={62} outerRadius={80}
                    paddingAngle={2} dataKey="value"
                    stroke="none" isAnimationActive={false}
                    onMouseEnter={(_, i) => setActiveCat(i)}
                    onMouseLeave={() => setActiveCat(null)}
                  >
                    {catData.map((e, i) => (
                      <Cell key={i} fill={e.color}
                        opacity={activeCat === null || activeCat === i ? 1 : 0.35}
                        style={{ transition: 'opacity .18s ease', cursor: 'pointer' }} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>

              <div className="absolute text-center pointer-events-none">
                {activeCat === null ? (
                  <>
                    <p className="text-[11px] text-gray-500 uppercase tracking-wider font-medium">Total</p>
                    <p className="text-xl font-bold text-gray-900 mt-0.5">{fmt(catTotal)}</p>
                  </>
                ) : (
                  <>
                    <p className="text-[11px] text-gray-500 uppercase tracking-wider font-medium">
                      {catData[activeCat].name}
                    </p>
                    <p className="text-xl font-bold mt-0.5" style={{ color: catData[activeCat].color }}>
                      {fmt(catData[activeCat].value)}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {(catData[activeCat].value / catTotal * 100).toFixed(1)}% e totalit
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* ── Top shpenzimet ── */}
            <div className="flex flex-col gap-[15px] min-w-0">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                Top {top5Types.length} shpenzime
              </p>

              {top5Types.map((t, i) => {
                const pct = catTotal > 0 ? (t.value / catTotal * 100) : 0
                return (
                  <div key={i} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between gap-3 text-[13px]">
                      <span className="flex items-center gap-2 min-w-0 font-medium text-gray-700">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: t.color }}
                              title={t.category} />
                        <span className="truncate">{t.name}</span>
                      </span>
                      <span className="font-bold text-gray-900 flex-shrink-0">
                        {hideData ? '••••••' : fmt(t.value)}
                        <span className="text-[11px] text-gray-400 font-medium ml-1.5">{hideData ? '••%' : `${pct.toFixed(1)}%`}</span>
                      </span>
                    </div>
                    <div className={`h-1.5 bg-gray-100 rounded-full overflow-hidden ${hideData ? 'blur-sm' : ''}`}>
                      <div className="h-full rounded-full transition-all duration-500"
                           style={{ width: `${pct}%`, background: t.color }} />
                    </div>
                  </div>
                )
              })}

              <div className="flex items-center justify-between pt-3 mt-2 border-t border-gray-200">
                <span className="text-[13px] font-semibold text-gray-500">Gjithsej Shpenzime</span>
                <span className="text-[17px] font-bold text-blue-600">{hideData ? '••••••' : fmt(catTotal)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  )
}
