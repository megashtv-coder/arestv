import { useState, useMemo, useEffect, lazy, Suspense } from 'react'
import {
  CreditCard, Download, Search, X,
  Pencil, Trash2, FileSpreadsheet, Plus, Users, CheckCircle2,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { formatDate } from '../utils/dateFormat'
import { EmptyState, Pagination } from '../components/UI'
import FormPageWrapper from '../components/FormPageWrapper'
import PaymentModal from './PaymentModal'
import { downloadTemplate } from '../components/ImportExcelModal'
const ImportExcelModal = lazy(() => import('../components/ImportExcelModal'))

// sort/page defaults

/* ── method badge colour ── */
const METHOD_COLOR = {
  'PayPal':          'bg-blue-50 text-blue-500',
  'Transfer Bankar': 'bg-slate-50 text-slate-600',
  'Kesh':            'bg-green-50 text-green-700',
  'Western Union':   'bg-yellow-50 text-yellow-700',
  'Ria':             'bg-purple-50 text-purple-600',
  'Money Gram':      'bg-pink-50 text-pink-600',
  'Crypto':          'bg-orange-50 text-orange-600',
  'Stripe':          'bg-indigo-50 text-indigo-600',
}
const METHOD_ICON = {
  'PayPal': '🅿️', 'Transfer Bankar': '🏦', 'Kesh': '💵',
  'Western Union': '🌐', 'Ria': '🔄', 'Money Gram': '💱',
  'Crypto': '₿', 'Stripe': '⚡',
}

/* ── Export Panel ── */
function ExportPanel({ payments, onClose }) {
  const today = new Date()
  const thisYear = today.getFullYear()

  const [partnerF, setPartnerF] = useState('all')
  const [yearF,    setYearF]    = useState(String(thisYear))
  const [monthF,   setMonthF]   = useState('all')

  const MONTHS = [
    { v: 'all', l: 'Të gjithë muajt' },
    { v: '01', l: 'Janar' },   { v: '02', l: 'Shkurt' }, { v: '03', l: 'Mars' },
    { v: '04', l: 'Prill' },   { v: '05', l: 'Maj' },    { v: '06', l: 'Qershor' },
    { v: '07', l: 'Korrik' },  { v: '08', l: 'Gusht' },  { v: '09', l: 'Shtator' },
    { v: '10', l: 'Tetor' },   { v: '11', l: 'Nëntor' }, { v: '12', l: 'Dhjetor' },
  ]

  const years = useMemo(() => {
    const ys = new Set(payments.map(p => p.date?.slice(0, 4)).filter(Boolean))
    return [...ys].sort((a, b) => b - a)
  }, [payments])

  const filtered = useMemo(() => payments.filter(p => {
    if (partnerF !== 'all' && p.depositedTo !== partnerF) return false
    if (yearF !== 'all' && !p.date?.startsWith(yearF)) return false
    if (monthF !== 'all' && p.date?.slice(5, 7) !== monthF) return false
    return true
  }), [payments, partnerF, yearF, monthF])

  const totalAmt = filtered.reduce((s, p) => s + (p.amount || 0), 0)
  const totalNet = filtered.reduce((s, p) => s + (p.net || 0), 0)

  const doExport = () => {
    const header = ['Data', 'Fatura ID', 'Klienti', 'Shuma (€)', 'Fee (€)', 'Neto (€)', 'Metoda', 'Llogaria', 'Referenca', 'Depozituar tek']
    const rows = filtered.map(p => [
      p.date || '', p.invoiceId || '', p.customer || '',
      (p.amount || 0).toFixed(2), (p.fee || 0).toFixed(2), (p.net || 0).toFixed(2),
      p.method || '', p.depositAccount || '', p.reference || '', p.depositedTo || '',
    ])
    const totalNet2  = filtered.reduce((s, p) => s + (p.net || 0), 0)
    const totalFee2  = filtered.reduce((s, p) => s + (p.fee || 0), 0)
    const totalGross = filtered.reduce((s, p) => s + (p.amount || 0), 0)
    const beltiNet   = filtered.filter(p => p.depositedTo === 'Belti').reduce((s, p) => s + (p.net || 0), 0)
    const enndiNet   = filtered.filter(p => p.depositedTo === 'Enndy').reduce((s, p) => s + (p.net || 0), 0)
    const summary = [
      [], ['=== PËRMBLEDHJE ==='],
      ['Bruto:', totalGross.toFixed(2)], ['Fee:', totalFee2.toFixed(2)], ['Neto:', totalNet2.toFixed(2)],
      [], ['=== NDARJA ==='],
      ['Tek Enndy:', enndiNet.toFixed(2)], ['Tek Belti:', beltiNet.toFixed(2)],
      ['50% secili:', (totalNet2 / 2).toFixed(2)],
    ]
    const csv = '﻿' + [header, ...rows, ...summary].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    const lp   = partnerF === 'all' ? 'te-gjitha' : partnerF.toLowerCase()
    const lm   = monthF === 'all' ? '' : `-${monthF}`
    a.href     = url
    a.download = `pagesat-${lp}-${yearF}${lm}.csv`
    a.click()
    URL.revokeObjectURL(url)
    onClose()
  }

  const Chip = ({ active, onClick, children }) => (
    <button onClick={onClick}
      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${active ? 'bg-blue-500 text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
      {children}
    </button>
  )

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
              <Download size={15} className="text-blue-500"/>
            </div>
            <div>
              <h2 className="font-bold text-gray-800 text-sm">Eksporto Pagesat</h2>
              <p className="text-[11px] text-gray-400">Zgjidh filtrat dhe shkarko CSV</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition-colors">
            <X size={16}/>
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Partneri</label>
            <div className="flex flex-wrap gap-1.5">
              {[{ v: 'all', l: 'Të gjithë' }, { v: 'Enndy', l: 'Enndy' }, { v: 'Belti', l: 'Belti' }].map(f => (
                <Chip key={f.v} active={partnerF === f.v} onClick={() => setPartnerF(f.v)}>{f.l}</Chip>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Viti</label>
            <div className="flex flex-wrap gap-1.5">
              <Chip active={yearF === 'all'} onClick={() => setYearF('all')}>Të gjithë</Chip>
              {years.map(y => <Chip key={y} active={yearF === y} onClick={() => setYearF(y)}>{y}</Chip>)}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Muaji</label>
            <div className="flex flex-wrap gap-1.5">
              {MONTHS.map(m => <Chip key={m.v} active={monthF === m.v} onClick={() => setMonthF(m.v)}>{m.l}</Chip>)}
            </div>
          </div>
          <div className="bg-blue-50 rounded-xl px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-blue-500 font-semibold">{filtered.length} pagesa të zgjedhura</p>
              <p className="text-sm font-bold text-blue-700 mt-0.5">Neto: €{totalNet.toLocaleString('en-US', { minimumFractionDigits: 2 })} · Bruto: €{totalAmt.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
            </div>
            <CheckCircle2 size={20} className={filtered.length > 0 ? 'text-blue-400' : 'text-gray-300'}/>
          </div>
        </div>

        <div className="flex gap-2 px-6 pb-6">
          <button onClick={doExport} disabled={filtered.length === 0}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-colors">
            <Download size={15}/> Shkarko CSV
          </button>
          <button onClick={onClose}
            className="px-5 py-2.5 border border-gray-200 text-gray-500 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors">
            Anulo
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── CSV export ── */
function exportCSV(payments, month, partner, fmt) {
  const label    = partner === 'all' ? 'Te-gjitha' : `Tek-${partner}`
  const filename = `Pagesat-${month || 'Gjitha'}-${label}.csv`

  const BOM     = '﻿'
  const headers = [
    'Data', 'Fatura', 'Klienti', 'Shuma (€)', 'Fee (€)', 'Neto (€)',
    'Metoda', 'Llogaria', 'Referenca', 'Depozituar tek',
  ]

  const rows = payments.map(p => [
    p.date, p.invoiceId, `"${p.customer}"`,
    p.amount, p.fee, p.net,
    p.method, `"${p.depositAccount}"`,
    `"${p.reference}"`, p.depositedTo,
  ])

  const totalNet   = payments.reduce((s, p) => s + p.net,    0)
  const totalFee   = payments.reduce((s, p) => s + p.fee,    0)
  const totalGross = payments.reduce((s, p) => s + p.amount, 0)
  const beltiNet   = payments.filter(p => p.depositedTo === 'Belti').reduce((s, p) => s + p.net, 0)
  const enndiNet   = payments.filter(p => p.depositedTo === 'Enndy').reduce((s, p) => s + p.net, 0)
  const halfProfit = totalNet / 2

  const summary = [
    [],
    ['=== PËRMBLEDHJE ==='],
    ['Shuma bruto:',           totalGross.toFixed(2)],
    ['Fee totale:',            totalFee.toFixed(2)],
    ['Neto totale:',           totalNet.toFixed(2)],
    [],
    ['=== NDARJA E FITIMIT ==='],
    ['Tek Enndy:',             enndiNet.toFixed(2)],
    ['Tek Belti:',             beltiNet.toFixed(2)],
    ['50% secili (nga neto):', halfProfit.toFixed(2)],
  ]

  const csv = BOM + [
    headers.join(','),
    ...rows.map(r => r.join(',')),
    ...summary.map(r => r.join(',')),
  ].join('\n')

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/* ── unique months from payments ── */
function getMonths(payments) {
  const set = new Set(payments.map(p => p.date.slice(0, 7)))
  return Array.from(set).sort().reverse()
}

/* ══════════════════════════════════════════════════════════ */
export default function Payments() {
  const {
    payments, setPayments,
    invoices, setInvoices,
    closeModal,
    showToast, fmt,
    page, navigate, logActivity,
  } = useApp()

  const [search,      setSearch]    = useState('')
  const [monthFilt,   setMonthFilt] = useState('all')
  const [partnerFilt, setPartner]   = useState('all')
  const [methodFilt,  setMethod]    = useState('all')
  const [yearFilt,    setYearFilt]  = useState(() => {
    const f = JSON.parse(localStorage.getItem('arestv_nav_filter') || 'null')
    if (f?.year) { localStorage.removeItem('arestv_nav_filter'); return f.year }
    return 'all'
  })
  const [pg,          setPg]        = useState(1)
  const [perPage,     setPerPage]   = useState(50)
  const [sortField,   setSortField] = useState('date')
  const [sortDir,     setSortDir]   = useState('desc')
  const [deletingId,  setDeletingId] = useState(null)
  const [importOpen,  setImportOpen] = useState(false)
  const [showExport,  setShowExport] = useState(false)

  // Detect if we're in form mode (page like "payments:create" or "payments:ID:edit")
  const pageMatch = page.split(':')
  const isFormMode = pageMatch[0] === 'payments' && (pageMatch[1] === 'create' || pageMatch[1]?.includes('PAY-'))
  const editPaymentId = pageMatch[1]?.includes('PAY-') ? pageMatch[1] : null
  const editPayment = editPaymentId ? payments.find(p => p.id === editPaymentId) : null

  // Close modal if we leave form mode
  useEffect(() => {
    if (!isFormMode) {
      closeModal()
    }
  }, [isFormMode, closeModal])

  const months  = getMonths(payments)
  const methods = [...new Set(payments.map(p => p.method))]

  /* filtering */
  const filtered = useMemo(() => payments.filter(p => {
    const matchSearch  = !search
      || p.customer.toLowerCase().includes(search.toLowerCase())
      || p.invoiceId.includes(search)
      || (p.reference || '').toLowerCase().includes(search.toLowerCase())
    const matchMonth   = monthFilt  === 'all' || p.date.startsWith(monthFilt)
    const matchPartner = partnerFilt === 'all' || p.depositedTo === partnerFilt
    const matchMethod  = methodFilt  === 'all' || p.method === methodFilt
    const matchYear    = yearFilt    === 'all' || p.date?.startsWith(yearFilt)
    return matchSearch && matchMonth && matchPartner && matchMethod && matchYear
  }), [payments, search, monthFilt, partnerFilt, methodFilt, yearFilt])

  const toggleSort = field => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
    setPg(1)
  }

  const sorted = useMemo(() => [...filtered].sort((a, b) => {
    let cmp = 0
    if      (sortField === 'date')        cmp = a.date.localeCompare(b.date)
    else if (sortField === 'invoiceId')   cmp = a.invoiceId.localeCompare(b.invoiceId)
    else if (sortField === 'customer')    cmp = a.customer.localeCompare(b.customer)
    else if (sortField === 'amount')      cmp = a.amount - b.amount
    else if (sortField === 'net')         cmp = a.net - b.net
    else if (sortField === 'method')      cmp = a.method.localeCompare(b.method)
    else if (sortField === 'depositedTo') cmp = a.depositedTo.localeCompare(b.depositedTo)
    return sortDir === 'asc' ? cmp : -cmp
  }), [filtered, sortField, sortDir])

  const paged = sorted.slice((pg - 1) * perPage, pg * perPage)

  /* stats from filtered */
  const totalGross = filtered.reduce((s, p) => s + p.amount, 0)
  const totalFee   = filtered.reduce((s, p) => s + p.fee,    0)
  const totalNet   = filtered.reduce((s, p) => s + p.net,    0)
  const enndiNet   = filtered.filter(p => p.depositedTo === 'Enndy').reduce((s, p) => s + p.net, 0)
  const beltiNet   = filtered.filter(p => p.depositedTo === 'Belti').reduce((s, p) => s + p.net, 0)

  const openNewPayment  = ()  => navigate('payments:create')
  const openEditPayment = (p) => navigate(`payments:${p.id}:edit`)

  function handleImportPayments(rows) {
    // Shto pagesat e reja (shmang dublikatat sipas id)
    const existingIds = new Set(payments.map(p => p.id))
    const newPayments = rows.filter(p => !existingIds.has(p.id))

    setPayments(prev => [...prev, ...newPayments])

    if (newPayments.length === 0) {
      showToast('Nuk ka pagesa të reja për të importuar.')
      return
    }

    // Match VETËM me invoiceId direkt — shmang false positives
    const paidByInvoiceId = new Set(
      newPayments.map(p => (p.invoiceId || '').trim()).filter(Boolean)
    )

    let markedPaid = 0
    setInvoices(prev => prev.map(inv => {
      if (inv.status === 'paid') return inv
      if (paidByInvoiceId.has(inv.id)) {
        markedPaid++
        return { ...inv, status: 'paid' }
      }
      // status i panjohur → konverto në 'pending'
      if (!['draft','pending','overdue','paid','void'].includes(inv.status)) {
        return { ...inv, status: 'pending' }
      }
      return inv
    }))

    showToast(`U importuan ${newPayments.length} pagesa · ${markedPaid} fatura u shënuan si të paguara ✓`)
  }

  const deletePayment = (p) => {
    setPayments(prev => prev.filter(x => x.id !== p.id))
    setInvoices(prev => prev.map(i =>
      i.id === p.invoiceId ? { ...i, status: 'pending' } : i
    ))
    logActivity(`Fshiu pagesën ${p.id} — ${p.customer} €${Number(p.amount)}`, 'Pagesat')
    showToast('Pagesa u fshi. Fatura kaloi në pritje.')
    setDeletingId(null)
  }

  // If in form mode, show only the form
  if (isFormMode) {
    return (
      <div key={`payment-form-${editPaymentId || 'create'}`}>
        <FormPageWrapper
          title={editPayment ? `Ndrysho Pagesën` : 'Pagese e Re'}
          subtitle={editPayment ? `${fmt(editPayment.amount)} - ${editPayment.method}` : 'Regjistro një pagesë të re'}
          onBack={() => navigate('payments')}
        >
          <PaymentModal
            key={`modal-${editPaymentId || 'create'}`}
            payment={editPayment || undefined}
            onClose={() => navigate('payments')}
            isFormPage={true}
          />
        </FormPageWrapper>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 mb-6 border-b border-gray-200">
        <div>
          <h2 className="text-xl font-black text-gray-900 flex items-center gap-2 tracking-tight">
            <CreditCard size={20} className="text-blue-500" />
            Pagesat e Marra
          </h2>
          <p className="text-xs text-gray-500 font-medium mt-0.5">{payments.length} pagesa gjithsej</p>
        </div>
        <div className="flex items-center gap-1.5">
          {/* Export - Hidden on mobile */}
          <button
            className="hidden sm:flex w-9 h-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 transition-colors"
            onClick={() => setShowExport(true)}
            title="Eksporto"
          >
            <Download size={16}/>
          </button>

          {/* Import - Hidden on mobile */}
          <button
            className="hidden sm:flex w-9 h-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 transition-colors"
            onClick={() => setImportOpen(true)}
            title="Importo Excel"
          >
            <FileSpreadsheet size={16}/>
          </button>

          {/* New Payment - Hidden on mobile (see FAB below) */}
          <button
            className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-500 text-white hover:bg-blue-600 transition-all active:scale-95 font-bold text-xs shadow-sm"
            onClick={openNewPayment}
            title="Regjistro Pagesë"
          >
            <Plus size={14}/> Regjistro Pagesë
          </button>
        </div>
      </div>

      {importOpen && (
        <Suspense fallback={null}>
          <ImportExcelModal
            entity="payments"
            onImport={handleImportPayments}
            onClose={() => setImportOpen(false)}
          />
        </Suspense>
      )}

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Bruto',  value: fmt(totalGross), color: 'text-gray-800',    border: 'border-l-blue-400' },
          { label: 'Fee',    value: fmt(totalFee),   color: 'text-amber-600',   border: 'border-l-amber-400' },
          { label: 'Neto',   value: fmt(totalNet),   color: 'text-emerald-600', border: 'border-l-emerald-400' },
          { label: 'Enndy / Belti', value: `${fmt(enndiNet)} / ${fmt(beltiNet)}`, color: 'text-purple-600', border: 'border-l-purple-400' },
        ].map(s => (
          <div key={s.label} className={`bg-white rounded-2xl border border-gray-200/90 shadow-sm border-l-4 ${s.border} px-4 py-3`}>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{s.label}</p>
            <p className={`text-sm font-bold mt-0.5 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filtrat */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-gray-200/90 shadow-sm mb-5">
        <div className="relative flex-1 min-w-[160px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="w-full pl-8 pr-8 py-1.5 text-xs rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
            placeholder="Kërko klient, faturë..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPg(1) }}
          />
          {search && (
            <button onClick={() => { setSearch(''); setPg(1) }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={13} />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            className="text-xs px-2.5 py-1.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-700 font-semibold outline-none focus:border-blue-400 cursor-pointer"
            value={monthFilt}
            onChange={e => { setMonthFilt(e.target.value); setPg(1) }}
          >
            <option value="all">Të gjitha muajt</option>
            {months.map(m => <option key={m} value={m}>{m}</option>)}
          </select>

          <select
            className="text-xs px-2.5 py-1.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-700 font-semibold outline-none focus:border-blue-400 cursor-pointer"
            value={partnerFilt}
            onChange={e => { setPartner(e.target.value); setPg(1) }}
          >
            <option value="all">Të dy partnerët</option>
            <option value="Enndy">Tek Enndy</option>
            <option value="Belti">Tek Belti</option>
          </select>

          <select
            className="text-xs px-2.5 py-1.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-700 font-semibold outline-none focus:border-blue-400 cursor-pointer"
            value={methodFilt}
            onChange={e => { setMethod(e.target.value); setPg(1) }}
          >
            <option value="all">Të gjitha metodat</option>
            {methods.map(m => <option key={m} value={m}>{m}</option>)}
          </select>

          <select
            className="hidden sm:block text-xs px-2.5 py-1.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-700 font-semibold outline-none focus:border-blue-400 cursor-pointer"
            value={perPage}
            onChange={e => { setPerPage(Number(e.target.value)); setPg(1) }}
          >
            <option value={25}>25 / faqe</option>
            <option value={50}>50 / faqe</option>
            <option value={100}>100 / faqe</option>
            <option value={200}>200 / faqe</option>
            <option value={300}>300 / faqe</option>
          </select>

          <span className="text-xs font-bold text-gray-400 font-mono px-2">
            {filtered.length}
          </span>
        </div>
      </div>

      {/* Mobile Card View - Hidden on sm+ */}
      {paged.length > 0 && (
        <div className="sm:hidden space-y-2 mb-4">
          {paged.map(p => (
            <div key={p.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-3">
              <div className="flex justify-between items-start gap-2">
                {/* Col 1: Customer + Payment Date + Invoice */}
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => openEditPayment(p)}>
                  <p className="font-bold text-gray-900 text-sm truncate hover:text-blue-500 transition-colors">{p.customer}</p>
                  <p className="text-xs text-gray-500 mt-0.5 font-mono">{formatDate(p.date)}</p>
                  <p className="text-xs font-mono font-semibold text-blue-600">{p.invoiceId}</p>
                </div>

                {/* Col 2: Amount + Fee + Partner */}
                <div className="text-right">
                  <p className="font-mono font-bold text-gray-900 text-sm">{fmt(p.amount)}</p>
                  <p className="text-xs font-mono text-amber-600 mt-0.5">{p.fee > 0 ? `- ${fmt(p.fee)}` : '—'}</p>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold mt-0.5 ${
                    p.depositedTo === 'Enndy'
                      ? 'bg-blue-50 text-blue-600'
                      : 'bg-purple-100 text-purple-600'
                  }`}>
                    {p.depositedTo}
                  </span>
                </div>

                {/* Col 3: Actions - Larger Button */}
                <div className="relative flex-shrink-0 flex gap-1">
                  <button
                    className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                    title="Ndrysho"
                    onClick={() => openEditPayment(p)}
                  >
                    <Pencil size={16}/>
                  </button>
                  <button
                    className="w-9 h-9 flex items-center justify-center rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                    title="Fshij"
                    onClick={() => setDeletingId(p.id)}
                  >
                    <Trash2 size={16}/>
                  </button>
                </div>
              </div>

              {/* Delete confirmation inline */}
              {deletingId === p.id && (
                <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2 justify-end">
                  <button
                    className="px-3 py-1 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold"
                    onClick={() => deletePayment(p)}
                  >
                    Po, fshi
                  </button>
                  <button
                    className="px-3 py-1 text-xs border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 font-semibold"
                    onClick={() => setDeletingId(null)}
                  >
                    Anulo
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Mobile pagination - hidden on sm+ */}
      {paged.length > 0 && (
        <div className="sm:hidden mb-6">
          <Pagination page={pg} total={filtered.length} perPage={perPage} onChange={setPg} />
        </div>
      )}

      {/* Tabela */}
      {paged.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="Nuk ka pagesa"
          sub={search ? 'Provo kërkim tjetër' : 'Regjistro pagesën e parë'}
          action={
            !search && (
              <button className="btn btn-primary mt-2" onClick={openNewPayment}>
                <CreditCard size={14} /> Regjistro Pagesë
              </button>
            )
          }
        />
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200/90 shadow-sm overflow-hidden hidden sm:block">
          <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 320px)' }}>
          <table className="w-full text-sm min-w-[560px]">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-gray-100 bg-gray-50/50">
                {[
                  { key: 'date',        label: 'Data',    cls: '' },
                  { key: 'invoiceId',   label: 'Fatura',  cls: '' },
                  { key: 'customer',    label: 'Klienti', cls: '' },
                ].map(col => (
                  <th key={col.key} className={`px-4 py-3 text-left text-[10px] font-extrabold text-gray-400 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700 ${col.cls}`}
                      onClick={() => toggleSort(col.key)}>
                    <span className="flex items-center gap-1">
                      {col.label}
                      <span className="text-[10px]">{sortField === col.key ? (sortDir === 'asc' ? '↑' : '↓') : <span className="text-gray-300">↕</span>}</span>
                    </span>
                  </th>
                ))}
                <th className="px-4 py-3 text-right text-[10px] font-extrabold text-gray-400 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700"
                    onClick={() => toggleSort('amount')}>
                  <span className="flex items-center justify-end gap-1">
                    Shuma
                    <span className="text-[10px]">{sortField === 'amount' ? (sortDir === 'asc' ? '↑' : '↓') : <span className="text-gray-300">↕</span>}</span>
                  </span>
                </th>
                <th className="px-4 py-3 text-right text-[10px] font-extrabold text-gray-400 uppercase tracking-wider hidden md:table-cell">Fee</th>
                <th className="px-4 py-3 text-right text-[10px] font-extrabold text-gray-400 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700"
                    onClick={() => toggleSort('net')}>
                  <span className="flex items-center justify-end gap-1">
                    Neto
                    <span className="text-[10px]">{sortField === 'net' ? (sortDir === 'asc' ? '↑' : '↓') : <span className="text-gray-300">↕</span>}</span>
                  </span>
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-extrabold text-gray-400 uppercase tracking-wider hidden lg:table-cell cursor-pointer select-none hover:text-gray-700"
                    onClick={() => toggleSort('method')}>
                  <span className="flex items-center gap-1">
                    Metoda
                    <span className="text-[10px]">{sortField === 'method' ? (sortDir === 'asc' ? '↑' : '↓') : <span className="text-gray-300">↕</span>}</span>
                  </span>
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-extrabold text-gray-400 uppercase tracking-wider hidden lg:table-cell">Llogaria</th>
                <th className="px-4 py-3 text-left text-[10px] font-extrabold text-gray-400 uppercase tracking-wider hidden md:table-cell">Referenca</th>
                <th className="px-4 py-3 text-left text-[10px] font-extrabold text-gray-400 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700"
                    onClick={() => toggleSort('depositedTo')}>
                  <span className="flex items-center gap-1">
                    Partneri
                    <span className="text-[10px]">{sortField === 'depositedTo' ? (sortDir === 'asc' ? '↑' : '↓') : <span className="text-gray-300">↕</span>}</span>
                  </span>
                </th>
                <th className="px-4 py-3 text-right text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Veprimet</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paged.map(p => (
                <tr key={p.id} className="hover:bg-gray-50/80 transition-colors">
                  <td className="px-4 py-3 font-mono text-gray-400 text-xs">{formatDate(p.date)}</td>
                  <td className="px-4 py-3 font-mono font-bold text-blue-600 text-xs">{p.invoiceId}</td>
                  <td className="px-4 py-3 font-bold text-gray-900 text-xs max-w-[140px] truncate">{p.customer}</td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-gray-900">{fmt(p.amount)}</td>
                  <td className="px-4 py-3 text-right font-mono text-amber-600 text-xs hidden md:table-cell">
                    {p.fee > 0 ? `- ${fmt(p.fee)}` : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600">{fmt(p.net)}</td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold ${METHOD_COLOR[p.method] || 'bg-gray-50 text-gray-600'}`}>
                      {METHOD_ICON[p.method] || '💳'} {p.method}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 hidden lg:table-cell max-w-[130px] truncate">
                    {p.depositAccount || <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 hidden md:table-cell">
                    {p.reference || <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      p.depositedTo === 'Enndy'
                        ? 'bg-blue-50 text-blue-600'
                        : 'bg-purple-100 text-purple-600'
                    }`}>
                      {p.depositedTo}
                    </span>
                  </td>

                  {/* ── Actions cell ── */}
                  <td className="px-4 py-3 text-right">
                    {deletingId === p.id ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="text-xs text-blue-600 font-semibold whitespace-nowrap">Fshij?</span>
                        <button
                          className="px-2 py-0.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold rounded-lg transition-colors"
                          onClick={() => deletePayment(p)}
                        >
                          Po
                        </button>
                        <button
                          className="px-2 py-0.5 border border-gray-200 text-gray-600 text-xs font-bold rounded-lg hover:bg-gray-50 transition-colors"
                          onClick={() => setDeletingId(null)}
                        >
                          Jo
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          className="p-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                          title="Ndrysho pagesën"
                          onClick={() => openEditPayment(p)}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                          title="Fshij pagesën"
                          onClick={() => setDeletingId(p.id)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>

          {/* Totals row - hidden on mobile */}
          {filtered.length > 0 && (
            <div className="hidden sm:flex items-center justify-end gap-6 px-5 py-2.5 border-t border-gray-100 bg-gray-50/50 text-xs font-bold text-gray-400">
              <span>Bruto: <span className="font-mono text-gray-900">{fmt(totalGross)}</span></span>
              <span>Fee: <span className="font-mono text-amber-600">- {fmt(totalFee)}</span></span>
              <span>Neto: <span className="font-mono text-emerald-600 text-sm">{fmt(totalNet)}</span></span>
            </div>
          )}

          <div className="hidden sm:block">
            <Pagination page={pg} total={filtered.length} perPage={perPage} onChange={setPg} />
          </div>
        </div>
      )}

      {/* Profit split box (kur filtrohet muaj) */}
      {monthFilt !== 'all' && filtered.length > 0 && (
        <div className="mt-4 bg-white rounded-2xl border border-gray-200/90 shadow-sm p-5">
          <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Users size={15} className="text-blue-500" />
            Ndarja e Fitimit — {monthFilt}
          </h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-emerald-50 rounded-2xl py-4">
              <p className="text-xs text-gray-400 mb-1">Neto Totale</p>
              <p className="text-lg font-black font-mono text-emerald-600">{fmt(totalNet)}</p>
            </div>
            <div className="bg-blue-50 rounded-2xl py-4">
              <p className="text-xs text-gray-400 mb-1">👤 Enndy</p>
              <p className="text-lg font-black font-mono text-blue-600">{fmt(enndiNet)}</p>
              <p className="text-xs text-gray-400 mt-1">Pritshme 50%: {fmt(totalNet / 2)}</p>
            </div>
            <div className="bg-purple-50 rounded-2xl py-4">
              <p className="text-xs text-gray-400 mb-1">👤 Belti</p>
              <p className="text-lg font-black font-mono text-purple-600">{fmt(beltiNet)}</p>
              <p className="text-xs text-gray-400 mt-1">Pritshme 50%: {fmt(totalNet / 2)}</p>
            </div>
          </div>
          {Math.abs(enndiNet - beltiNet) > 0.01 && (
            <div className="mt-3 text-xs text-amber-600 bg-amber-50 rounded-xl px-4 py-2.5">
              ⚖️ Diferenca mes partnerëve: <strong>{fmt(Math.abs(enndiNet - beltiNet))}</strong> —{' '}
              {enndiNet > beltiNet ? 'Enndy' : 'Belti'} ka marrë më shumë këtë muaj.
            </div>
          )}
        </div>
      )}

      {showExport && <ExportPanel payments={payments} onClose={() => setShowExport(false)} />}

      {/* Floating Action Button - Mobile only */}
      <div
        className="fab sm:hidden"
        onClick={openNewPayment}
        title="Regjistro Pagesë"
      >
        <Plus size={28}/>
      </div>
    </div>
  )
}
