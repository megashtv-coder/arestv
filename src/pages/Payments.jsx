import { useState, useMemo, useEffect, lazy, Suspense } from 'react'
import {
  CreditCard, Download, Search, X, Filter,
  Pencil, Trash2, FileSpreadsheet, Plus,
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
  'PayPal':          'bg-blue-50 text-blue-600',
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
  const samkiNet   = payments.filter(p => p.depositedTo === 'Samki').reduce((s, p) => s + p.net, 0)
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
    ['Tek Samki:',             samkiNet.toFixed(2)],
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
  const [pg,          setPg]        = useState(1)
  const [perPage,     setPerPage]   = useState(50)
  const [sortField,   setSortField] = useState('date')
  const [sortDir,     setSortDir]   = useState('desc')
  const [deletingId,  setDeletingId] = useState(null)
  const [importOpen,  setImportOpen] = useState(false)

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
    return matchSearch && matchMonth && matchPartner && matchMethod
  }), [payments, search, monthFilt, partnerFilt, methodFilt])

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
  const samkiNet   = filtered.filter(p => p.depositedTo === 'Samki').reduce((s, p) => s + p.net, 0)

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Pagesat e Marra</h2>
          <p className="text-sm text-gray-400 mt-0.5">{payments.length} pagesa gjithsej</p>
        </div>
        <div className="flex items-center gap-1.5">
          {/* Export - Hidden on mobile */}
          <button
            className="hidden sm:flex w-9 h-9 items-center justify-center rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
            onClick={() => exportCSV(filtered, monthFilt !== 'all' ? monthFilt : '', partnerFilt, fmt)}
            title="Eksporto"
          >
            <Download size={16}/>
          </button>

          {/* Import - Hidden on mobile */}
          <button
            className="hidden sm:flex w-9 h-9 items-center justify-center rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
            onClick={() => setImportOpen(true)}
            title="Importo Excel"
          >
            <FileSpreadsheet size={16}/>
          </button>

          {/* New Payment - Hidden on mobile (see FAB below) */}
          <button
            className="hidden sm:flex w-9 h-9 items-center justify-center rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors font-bold text-lg"
            onClick={openNewPayment}
            title="Regjistro Pagesë"
          >
            +
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

      {/* Filtrat */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2
                        focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-50 transition-all flex-1 min-w-[160px]">
          <Search size={14} className="text-gray-400 flex-shrink-0" />
          <input
            className="bg-transparent border-none outline-none text-sm text-gray-600 w-full placeholder-gray-400"
            placeholder="Kërko klient, faturë..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPg(1) }}
          />
          {search && (
            <button onClick={() => { setSearch(''); setPg(1) }} className="text-gray-300 hover:text-gray-500">
              <X size={13} />
            </button>
          )}
        </div>

        <select
          className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 outline-none focus:border-blue-400 cursor-pointer"
          value={monthFilt}
          onChange={e => { setMonthFilt(e.target.value); setPg(1) }}
        >
          <option value="all">Të gjitha muajt</option>
          {months.map(m => <option key={m} value={m}>{m}</option>)}
        </select>

        <select
          className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 outline-none focus:border-blue-400 cursor-pointer"
          value={partnerFilt}
          onChange={e => { setPartner(e.target.value); setPg(1) }}
        >
          <option value="all">Të dy partnerët</option>
          <option value="Enndy">Tek Enndy</option>
          <option value="Samki">Tek Samki</option>
        </select>

        <select
          className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 outline-none focus:border-blue-400 cursor-pointer"
          value={methodFilt}
          onChange={e => { setMethod(e.target.value); setPg(1) }}
        >
          <option value="all">Të gjitha metodat</option>
          {methods.map(m => <option key={m} value={m}>{m}</option>)}
        </select>

        <select
          className="hidden sm:block bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 outline-none focus:border-blue-400 cursor-pointer"
          value={perPage}
          onChange={e => { setPerPage(Number(e.target.value)); setPg(1) }}
        >
          <option value={25}>25 / faqe</option>
          <option value={50}>50 / faqe</option>
          <option value={100}>100 / faqe</option>
          <option value={200}>200 / faqe</option>
          <option value={300}>300 / faqe</option>
        </select>

        <span className="text-xs text-gray-400 flex items-center gap-1 ml-auto">
          <Filter size={12} /> {filtered.length}
        </span>
      </div>

      {/* Mobile Card View - Hidden on sm+ */}
      {paged.length > 0 && (
        <div className="sm:hidden space-y-2 mb-4">
          {paged.map(p => (
            <div key={p.id} className="bg-white border border-gray-200 rounded-lg p-3">
              <div className="flex justify-between items-start gap-2">
                {/* Col 1: Customer + Payment Date + Invoice */}
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => openEditPayment(p)}>
                  <p className="font-bold text-gray-800 text-sm truncate hover:text-blue-600 transition-colors">{p.customer}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{formatDate(p.date)}</p>
                  <p className="text-xs font-semibold text-blue-600">{p.invoiceId}</p>
                </div>

                {/* Col 2: Amount + Fee + Partner */}
                <div className="text-right">
                  <p className="font-bold text-gray-800 text-sm">{fmt(p.amount)}</p>
                  <p className="text-xs text-amber-500 mt-0.5">{p.fee > 0 ? `- ${fmt(p.fee)}` : '—'}</p>
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold mt-0.5 ${
                    p.depositedTo === 'Enndy'
                      ? 'bg-blue-50 text-blue-600'
                      : 'bg-purple-50 text-purple-600'
                  }`}>
                    {p.depositedTo}
                  </span>
                </div>

                {/* Col 3: Actions - Larger Button */}
                <div className="relative flex-shrink-0 flex gap-1">
                  <button
                    className="w-9 h-9 flex items-center justify-center rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all"
                    title="Ndrysho"
                    onClick={() => openEditPayment(p)}
                  >
                    <Pencil size={16}/>
                  </button>
                  <button
                    className="w-9 h-9 flex items-center justify-center rounded-lg bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-all"
                    title="Fshij"
                    onClick={() => setDeletingId(p.id)}
                  >
                    <Trash2 size={16}/>
                  </button>
                </div>
              </div>

              {/* Delete confirmation inline */}
              {deletingId === p.id && (
                <div className="mt-3 pt-3 border-t border-gray-200 flex gap-2 justify-end">
                  <button
                    className="px-3 py-1 text-xs bg-red-500 hover:bg-red-600 text-white rounded font-semibold"
                    onClick={() => deletePayment(p)}
                  >
                    Po, fshi
                  </button>
                  <button
                    className="px-3 py-1 text-xs border border-gray-200 text-gray-600 rounded hover:bg-gray-50 font-semibold"
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
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden hidden sm:block">
          <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 320px)' }}>
          <table className="w-full text-sm min-w-[560px]">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-gray-100 bg-gray-50">
                {[
                  { key: 'date',        label: 'Data',    cls: '' },
                  { key: 'invoiceId',   label: 'Fatura',  cls: '' },
                  { key: 'customer',    label: 'Klienti', cls: '' },
                ].map(col => (
                  <th key={col.key} className={`table-th cursor-pointer select-none hover:text-blue-600 ${col.cls}`}
                      onClick={() => toggleSort(col.key)}>
                    <span className="flex items-center gap-1">
                      {col.label}
                      <span className="text-[10px]">{sortField === col.key ? (sortDir === 'asc' ? '↑' : '↓') : <span className="text-gray-300">↕</span>}</span>
                    </span>
                  </th>
                ))}
                <th className="table-th text-right cursor-pointer select-none hover:text-blue-600"
                    onClick={() => toggleSort('amount')}>
                  <span className="flex items-center justify-end gap-1">
                    Shuma
                    <span className="text-[10px]">{sortField === 'amount' ? (sortDir === 'asc' ? '↑' : '↓') : <span className="text-gray-300">↕</span>}</span>
                  </span>
                </th>
                <th className="table-th text-right hidden md:table-cell">Fee</th>
                <th className="table-th text-right cursor-pointer select-none hover:text-blue-600"
                    onClick={() => toggleSort('net')}>
                  <span className="flex items-center justify-end gap-1">
                    Neto
                    <span className="text-[10px]">{sortField === 'net' ? (sortDir === 'asc' ? '↑' : '↓') : <span className="text-gray-300">↕</span>}</span>
                  </span>
                </th>
                <th className="table-th hidden lg:table-cell cursor-pointer select-none hover:text-blue-600"
                    onClick={() => toggleSort('method')}>
                  <span className="flex items-center gap-1">
                    Metoda
                    <span className="text-[10px]">{sortField === 'method' ? (sortDir === 'asc' ? '↑' : '↓') : <span className="text-gray-300">↕</span>}</span>
                  </span>
                </th>
                <th className="table-th hidden lg:table-cell">Llogaria</th>
                <th className="table-th hidden md:table-cell">Referenca</th>
                <th className="table-th cursor-pointer select-none hover:text-blue-600"
                    onClick={() => toggleSort('depositedTo')}>
                  <span className="flex items-center gap-1">
                    Partneri
                    <span className="text-[10px]">{sortField === 'depositedTo' ? (sortDir === 'asc' ? '↑' : '↓') : <span className="text-gray-300">↕</span>}</span>
                  </span>
                </th>
                <th className="table-th text-right">Veprimet</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paged.map(p => (
                <tr key={p.id} className="hover:bg-blue-50/20 transition-colors group">
                  <td className="table-td text-gray-400 text-xs">{formatDate(p.date)}</td>
                  <td className="table-td font-bold text-blue-600 text-xs">{p.invoiceId}</td>
                  <td className="table-td font-medium text-gray-800 text-xs max-w-[140px] truncate">{p.customer}</td>
                  <td className="table-td text-right font-semibold text-gray-700">{fmt(p.amount)}</td>
                  <td className="table-td text-right text-amber-500 text-xs hidden md:table-cell">
                    {p.fee > 0 ? `- ${fmt(p.fee)}` : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="table-td text-right font-bold text-emerald-600">{fmt(p.net)}</td>
                  <td className="table-td hidden lg:table-cell">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${METHOD_COLOR[p.method] || 'bg-gray-50 text-gray-600'}`}>
                      {METHOD_ICON[p.method] || '💳'} {p.method}
                    </span>
                  </td>
                  <td className="table-td text-xs text-gray-500 hidden lg:table-cell max-w-[130px] truncate">
                    {p.depositAccount || <span className="text-gray-300">—</span>}
                  </td>
                  <td className="table-td text-xs text-gray-500 hidden md:table-cell">
                    {p.reference || <span className="text-gray-300">—</span>}
                  </td>
                  <td className="table-td">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                      p.depositedTo === 'Enndy'
                        ? 'bg-blue-50 text-blue-600'
                        : 'bg-purple-50 text-purple-600'
                    }`}>
                      {p.depositedTo}
                    </span>
                  </td>

                  {/* ── Actions cell ── */}
                  <td className="table-td text-right">
                    {deletingId === p.id ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="text-xs text-red-500 font-semibold whitespace-nowrap">Fshij?</span>
                        <button
                          className="px-2 py-0.5 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded transition-colors"
                          onClick={() => deletePayment(p)}
                        >
                          Po
                        </button>
                        <button
                          className="px-2 py-0.5 border border-gray-200 text-gray-600 text-xs font-bold rounded hover:bg-gray-50 transition-colors"
                          onClick={() => setDeletingId(null)}
                        >
                          Jo
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          className="icon-btn text-blue-400 hover:bg-blue-50 hover:text-blue-600"
                          title="Ndrysho pagesën"
                          onClick={() => openEditPayment(p)}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          className="icon-btn text-red-400 hover:bg-red-50 hover:text-red-600"
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
            <div className="hidden sm:flex items-center justify-end gap-6 px-5 py-2 border-t border-gray-100 bg-gray-50/40 text-xs font-semibold text-gray-500">
              <span>Bruto: <span className="text-gray-700">{fmt(totalGross)}</span></span>
              <span>Fee: <span className="text-amber-500">- {fmt(totalFee)}</span></span>
              <span>Neto: <span className="text-emerald-600 text-sm font-bold">{fmt(totalNet)}</span></span>
            </div>
          )}

          <div className="hidden sm:block">
            <Pagination page={pg} total={filtered.length} perPage={perPage} onChange={setPg} />
          </div>
        </div>
      )}

      {/* Profit split box (kur filtrohet muaj) */}
      {monthFilt !== 'all' && filtered.length > 0 && (
        <div className="mt-4 bg-white rounded-xl border border-gray-100 p-5">
          <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
            <Users size={15} className="text-blue-500" />
            Ndarja e Fitimit — {monthFilt}
          </h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-emerald-50 rounded-xl py-4">
              <p className="text-xs text-gray-400 mb-1">Neto Totale</p>
              <p className="text-lg font-bold text-emerald-600">{fmt(totalNet)}</p>
            </div>
            <div className="bg-blue-50 rounded-xl py-4">
              <p className="text-xs text-gray-400 mb-1">👤 Enndy</p>
              <p className="text-lg font-bold text-blue-600">{fmt(enndiNet)}</p>
              <p className="text-xs text-gray-400 mt-1">Pritshme 50%: {fmt(totalNet / 2)}</p>
            </div>
            <div className="bg-purple-50 rounded-xl py-4">
              <p className="text-xs text-gray-400 mb-1">👤 Samki</p>
              <p className="text-lg font-bold text-purple-600">{fmt(samkiNet)}</p>
              <p className="text-xs text-gray-400 mt-1">Pritshme 50%: {fmt(totalNet / 2)}</p>
            </div>
          </div>
          {Math.abs(enndiNet - samkiNet) > 0.01 && (
            <div className="mt-3 text-xs text-amber-600 bg-amber-50 rounded-lg px-4 py-2.5">
              ⚖️ Diferenca mes partnerëve: <strong>{fmt(Math.abs(enndiNet - samkiNet))}</strong> —{' '}
              {enndiNet > samkiNet ? 'Enndy' : 'Samki'} ka marrë më shumë këtë muaj.
            </div>
          )}
        </div>
      )}

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
