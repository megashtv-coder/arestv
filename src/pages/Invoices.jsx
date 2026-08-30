import { useState, useEffect, useRef, lazy, Suspense, useMemo, memo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import {
  FileText, Download, Pencil, Trash2, CreditCard,
  MessageCircle, Send, XCircle, X, MessageSquare,
  Search, Plus, LayoutList, Columns, AlertTriangle, FileSpreadsheet,
  MoreVertical, Edit3, Filter, CheckCircle2, Eye, EyeOff,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { formatDate } from '../utils/dateFormat'
import { round2 } from '../utils/money'
import { StatusBadge, EmptyState, Pagination } from '../components/UI'
import FormPageWrapper from '../components/FormPageWrapper'
import { useColumnPrefs } from '../hooks/useColumnPrefs'
import { INVOICE_TABLE_COLUMNS } from '../constants/invoiceColumns'
import InvoiceModal from './InvoiceModal'
import PaymentModal from './PaymentModal'
import { downloadTemplate } from '../components/ImportExcelModal'
const ImportExcelModal = lazy(() => import('../components/ImportExcelModal'))
import CustomerDetailsModal from './CustomerDetailsModal'
import MessageLogService from '../services/MessageLogService'

const STATUS_ORDER = { overdue: 0, pending: 1, partial: 1.5, draft: 2, paid: 3, void: 4 }

// Radhitja e kolonave tërhiqet drejt e nga kokat e tabelës (drag & drop), si alternativë
// e shpejtë ndaj hapjes së panelit "Kolonat e tabelës". Klikimi për renditje (sort) vazhdon
// të funksionojë njësoj — draggable s'e prish click-in, vetëm shton edhe tërheqjen.
function renderInvoiceColHeader(col, { sortField, sortDir, toggleSort, draggedCol, dragOverCol, onColDragStart, onColDragOver, onColDrop, onColDragEnd }) {
  const sortIcon = key => (
    <span className="text-[10px]">{sortField === key ? (sortDir === 'asc' ? '↑' : '↓') : <span className="text-gray-300">↕</span>}</span>
  )

  const respCls = {
    date: 'hidden sm:table-cell', id: 'hidden sm:table-cell', customer: '', referent: 'hidden sm:table-cell',
    expiry: 'sm:table-cell lg:table-cell', amount: 'text-right', due: 'hidden lg:table-cell', status: '',
  }[col.key] || ''

  const content = {
    date:     'Data',
    id:       <span className="flex items-center gap-1">ID {sortIcon('id')}</span>,
    customer: <span className="flex items-center gap-1">Klienti {sortIcon('customer')}</span>,
    referent: <span className="flex items-center gap-1">Referenti {sortIcon('referent')}</span>,
    expiry:   'Skadimi Abonimit',
    amount:   <span className="flex items-center justify-end gap-1">Shuma {sortIcon('amount')}</span>,
    due:      'Afati',
    status:   <span className="flex items-center gap-1">Statusi {sortIcon('status')}</span>,
  }[col.key]
  if (content === undefined) return null

  const sortable = ['id', 'customer', 'referent', 'amount', 'status'].includes(col.key)
  const isDragging = draggedCol === col.key
  // Shenja e vendit ku do të futet kolona — vetëm kur po tërheq një tjetër mbi këtë
  const showDropMark = dragOverCol === col.key && draggedCol && draggedCol !== col.key

  return (
    <th
      key={col.key}
      className={`table-th select-none cursor-move relative ${sortable ? 'cursor-pointer hover:text-blue-500' : ''} ${respCls} ${isDragging ? 'opacity-30' : ''} ${showDropMark ? 'bg-blue-50' : ''}`}
      onClick={sortable ? () => toggleSort(col.key) : undefined}
      draggable
      onDragStart={() => onColDragStart(col.key)}
      onDragOver={e => { e.preventDefault(); e.stopPropagation(); onColDragOver(col.key) }}
      onDrop={e => { e.preventDefault(); e.stopPropagation(); onColDrop(col.key) }}
      onDragEnd={onColDragEnd}
    >
      {showDropMark && <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-blue-500 rounded-full" />}
      {content}
    </th>
  )
}

function renderInvoiceColCell(col, inv, { isOverdue, fmt, hasLongOverdue, getCustomerType, setPreview }) {
  switch (col.key) {
    case 'date':
      return <td key={col.key} className="table-td font-mono text-gray-400 hidden sm:table-cell">{formatDate(inv.date)}</td>
    case 'id':
      return (
        <td key={col.key} className="table-td hidden sm:table-cell cursor-pointer" onClick={() => setPreview(inv.id)}>
          <span className="font-mono font-bold text-xs text-gray-800 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">{inv.id}</span>
        </td>
      )
    case 'customer':
      return (
        <td key={col.key} className="table-td font-medium text-gray-800 cursor-pointer" onClick={() => setPreview(inv.id)}>
          <div className="flex items-center gap-1.5">
            {inv.customer}
            {hasLongOverdue(inv.customer) && (
              <span className="text-red-600 flex-shrink-0" title="Fatura më shumë se 3 javë të vonuara">▲</span>
            )}
            {getCustomerType(inv.customer) === 'reseller' && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 bg-purple-100 text-purple-600 rounded-full flex-shrink-0">Reseller</span>
            )}
          </div>
        </td>
      )
    case 'referent':
      return (
        <td key={col.key} className="table-td hidden sm:table-cell text-sm">
          {inv.referent ? (
            <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium">
              {inv.referent}
            </span>
          ) : (
            <span className="text-gray-300 italic text-xs">—</span>
          )}
        </td>
      )
    case 'expiry':
      return (
        <td key={col.key} className="table-td sm:table-cell lg:table-cell text-sm font-medium">
          {inv.subscriptionExpiry ? (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 rounded font-mono text-xs">
              {formatDate(inv.subscriptionExpiry)}
            </span>
          ) : (
            <span className="text-gray-300 italic text-xs">—</span>
          )}
        </td>
      )
    case 'amount':
      return <td key={col.key} className="table-td font-mono font-bold text-right text-gray-800">{fmt(inv.amount)}</td>
    case 'due':
      return (
        <td key={col.key} className={`table-td font-mono hidden lg:table-cell ${isOverdue ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
          {formatDate(inv.due)}
        </td>
      )
    case 'status':
      return <td key={col.key} className="table-td"><StatusBadge status={isOverdue && inv.status !== 'paid' && inv.status !== 'void' ? 'overdue' : inv.status}/></td>
    default:
      return null
  }
}

/* ── helpers ─────────────────────────────────────────── */
const cleanPhone = p => (p || '').replace(/[\s+\-()]/g, '')

function buildReminderMsg(inv) {
  const firstName = (inv.customer || '').split(' ')[0]
  const today = new Date().toISOString().slice(0, 10)
  const late = inv.status === 'overdue' ||
    (inv.due && inv.due < today && inv.status !== 'paid' && inv.status !== 'void')
  if (late)
    return `Pershendetje ${firstName}!\nFatura juaj me vlere €${inv.amount} ka kaluar afatin e pageses (${formatDate(inv.due)}).\nJu lutem kryeni pagesen urgjentisht per te shmangur nderprerjene sherbimit tuaj.\nFaleminderit!\nMe respekt, Ares TV`
  return `Pershendetje ${firstName}!\nFatura juaj me vlere €${inv.amount} eshte ne pritje te pageses deri me date ${formatDate(inv.due)}.\nJu lutem kryeni pagesen ne kohe.\nFaleminderit!\nMe respekt, Ares TV`
}

function buildInvoiceMsg(inv) {
  return `Fatura per: ${inv.customer}\nData e abonimit: ${inv.date || '—'}\nData e skadimit te abonimit: ${inv.subscriptionExpiry || '—'}\nAfati i pageses: ${inv.due || '—'}\nPer pagese: €${inv.amount}`
}

/* ── compact invoice card (left panel list) ─────────── */
const InvoiceListCard = memo(function InvoiceListCard({ inv, selected, onClick, customerMap, hidden }) {
  const { fmt: rawFmt } = useApp()
  const fmt = hidden ? () => '••••••' : rawFmt
  const isReseller = customerMap.get(inv.customer)?.type === 'reseller'
  const diff = inv.due
    ? Math.round((new Date(inv.due) - Date.now()) / 86_400_000)
    : null

  let dueLabel, duePillCls
  if      (inv.status === 'paid')  { dueLabel = 'PAGUAR';         duePillCls = 'bg-emerald-100 text-emerald-700' }
  else if (inv.status === 'partial') {
    // Shfaq shumin e paguar dhe të mbetur për faturat e paguara pjesërisht
    const paid = inv.paidAmount || 0
    const remaining = inv.amount - paid
    const paidFormatted = Math.round(paid * 100) / 100
    const remainingFormatted = Math.round(remaining * 100) / 100
    dueLabel = `€${paidFormatted} / €${remainingFormatted}`
    duePillCls = 'bg-blue-100 text-blue-700'
  }
  else if (inv.status === 'void')  { dueLabel = 'VOID';           duePillCls = 'bg-gray-100 text-gray-500 line-through' }
  else if (inv.status === 'draft') { dueLabel = 'DRAFT';          duePillCls = 'bg-gray-100 text-gray-500' }
  else if (diff === null)          { dueLabel = '—';              duePillCls = 'bg-gray-100 text-gray-400' }
  else if (diff < 0)               { dueLabel = 'VONUAR';         duePillCls = 'bg-red-100 text-red-700' }
  else if (diff === 0)             { dueLabel = 'SOT SKADON';     duePillCls = 'bg-amber-100 text-amber-800' }
  else if (diff === 1)             { dueLabel = 'NGA 1 DITË';     duePillCls = 'bg-amber-100 text-amber-800' }
  else                             { dueLabel = `NGA ${diff} DITË`; duePillCls = 'bg-amber-100 text-amber-800' }

  return (
    <div className="px-2 pt-1.5">
      <div
        className={`p-3 rounded-xl border cursor-pointer transition-colors ${
          selected
            ? 'bg-blue-50 border-blue-300'
            : 'bg-gray-50/50 border-gray-100 hover:bg-gray-100'
        }`}
        onClick={onClick}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <p className="font-bold text-gray-900 text-sm truncate">{inv.customer}</p>
              {isReseller && (
                <span className="text-[9px] font-bold px-1 py-0.5 bg-purple-100 text-purple-600 rounded flex-shrink-0">R</span>
              )}
            </div>
            <p className="text-[11px] text-gray-400 mt-0.5 font-mono">{inv.id} · {formatDate(inv.date)}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="font-extrabold text-gray-900 text-sm font-mono">{fmt(inv.amount)}</p>
            <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded mt-1 uppercase ${duePillCls}`}>{dueLabel}</span>
          </div>
        </div>
      </div>
    </div>
  )
})

/* ── invoice side panel (right panel) ───────────────── */
function InvoiceSidePanel({ invId, onClose, setSelectedCustomer, customerMap, hidden }) {
  const {
    invoices, setInvoices,
    customers,
    payments, setPayments,
    setModal, closeModal,
    showToast, fmt: rawFmt, logActivity, navigate,
  } = useApp()
  const fmt = hidden ? () => '••••••' : rawFmt

  const inv = invoices.find(i => i.id === invId)
  if (!inv) return null

  const [confirmVoid,       setConfirmVoid]       = useState(false)
  const [confirmDel,        setConfirmDel]        = useState(false)
  const [confirmDelPayment, setConfirmDelPayment] = useState(false)
  const [comment,           setComment]           = useState('')

  const custObj  = customerMap.get(inv.customer)
  const rawPhone = cleanPhone(custObj?.phone || '')
  const today    = new Date().toISOString().slice(0, 10)
  const isOverdue = inv.status === 'overdue' ||
    (inv.due && inv.due < today && inv.status !== 'paid' && inv.status !== 'void')

  const canContact = (inv.status === 'pending' || inv.status === 'partial' || inv.status === 'overdue' || isOverdue) && rawPhone
  const canPay     = inv.status === 'pending' || inv.status === 'partial' || inv.status === 'overdue' || inv.status === 'draft'
  const canVoid    = inv.status !== 'paid' && inv.status !== 'void'
  const msgEncoded = encodeURIComponent(buildReminderMsg(inv))
  const linkedPayment = payments.find(p => p.invoiceId === inv.id)

  const doVoid = () => {
    setInvoices(prev => prev.map(i => i.id === inv.id ? { ...i, status: 'void' } : i))
    setConfirmVoid(false)
    showToast('Fatura u shënua si Void')
  }
  const doDelete = () => {
    setInvoices(prev => prev.filter(i => i.id !== inv.id))
    logActivity(`Fshiu faturën ${inv.id} — ${inv.customer} €${inv.amount}`, 'Faturat')
    setConfirmDel(false)
    showToast('Fatura u fshi')
    onClose()
  }
  const doDeletePayment = () => {
    // Kalkuloj pagesën e mbetur pas fshirjes
    const allPaymentsForInvoice = payments.filter(p => p.invoiceId === inv.id)
    const remainingAmount = round2(allPaymentsForInvoice
      .filter(p => p.id !== linkedPayment.id)
      .reduce((sum, p) => sum + Number(p.amount), 0))

    setPayments(prev => prev.filter(p => p.id !== linkedPayment.id))
    setInvoices(prev => prev.map(i => {
      if (i.id !== inv.id) return i

      // Vendos statusin bazuar në shumin e mbetur
      let status = 'pending'
      if (remainingAmount >= i.amount) status = 'paid'
      else if (remainingAmount > 0) status = 'partial'

      return { ...i, paidAmount: remainingAmount, status }
    }))
    setConfirmDelPayment(false)
    showToast('Pagesa u fshi. Fatura u përditësua.')
  }
  const addComment = () => {
    const txt = comment.trim()
    if (!txt) return
    setInvoices(prev => prev.map(i =>
      i.id === inv.id
        ? { ...i, comments: [...(i.comments || []), { author: 'Stafi', text: txt, date: today }] }
        : i
    ))
    setComment('')
  }

  const TB = 'flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-colors'

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Action toolbar ── */}
      <div className="flex items-center gap-1.5 px-4 py-3 border-b border-gray-100 bg-white flex-wrap lg:flex-nowrap">
        {/* Mobile back button */}
        <button className="md:hidden icon-btn mr-1 text-blue-500" onClick={onClose} title="Kthehu">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <div className="flex items-center gap-2.5 mr-1">
          <span className="font-black text-gray-900 text-base font-mono">{inv.id}</span>
          <StatusBadge status={isOverdue && inv.status !== 'paid' && inv.status !== 'void' ? 'overdue' : inv.status}/>
        </div>

        <button
          className={`${TB} border-gray-200 hover:bg-gray-50 text-gray-600`}
          onClick={() => navigate(`invoices:${inv.id}:edit`)}
        >
          <Pencil size={13}/> Ndrysho
        </button>

        {inv.status === 'draft' && (
          <button
            className={`${TB} border-blue-200 text-blue-500 hover:bg-blue-50`}
            onClick={() => {
              setInvoices(prev => prev.map(i => i.id === inv.id ? { ...i, status: 'pending' } : i))
              showToast('Fatura kaloi në pritje ✓')
            }}
          >
            <Send size={13}/> Dërgo → Pritje
          </button>
        )}

        {canContact && (
          <a
            href={`https://wa.me/${rawPhone}?text=${msgEncoded}`}
            target="_blank" rel="noopener noreferrer"
            className={`${TB} ${isOverdue ? 'border-orange-200 text-orange-600 hover:bg-orange-50' : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}
          >
            <MessageCircle size={13}/> WhatsApp{isOverdue ? ' 🔔' : ''}
          </a>
        )}

        {canContact && (
          <a
            href={`https://t.me/+${rawPhone}`}
            target="_blank" rel="noopener noreferrer"
            className={`${TB} border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100`}
          >
            <Send size={13}/> Telegram
          </a>
        )}

        {canPay && (
          <button
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors"
            onClick={() => setModal(<PaymentModal invoice={inv} onClose={closeModal}/>)}
          >
            <CreditCard size={13}/> Regjistro Pagesën
          </button>
        )}

        {canVoid && (
          <button
            className={`${TB} border-gray-200 text-gray-500 hover:text-amber-600 hover:bg-amber-50`}
            onClick={() => setConfirmVoid(true)}
          >
            <XCircle size={13}/> Void
          </button>
        )}

        <button
          className={`${TB} border-blue-200 text-blue-600 hover:bg-blue-50`}
          onClick={() => setConfirmDel(true)}
        >
          <Trash2 size={13}/> Fshi
        </button>

        <button className="ml-auto icon-btn" onClick={onClose}><X size={16}/></button>
      </div>

      {confirmVoid && (
        <div className="flex items-center gap-3 bg-amber-50 border-b border-amber-100 px-4 py-2 text-xs">
          <span className="text-amber-700 font-semibold">Dëshiron ta anulosh (Void) këtë faturë?</span>
          <button className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg" onClick={doVoid}>Po</button>
          <button className="px-3 py-1 border border-gray-200 text-gray-600 font-bold rounded-lg hover:bg-gray-50" onClick={() => setConfirmVoid(false)}>Jo</button>
        </div>
      )}

      {confirmDel && (
        <div className="flex items-center gap-3 bg-blue-50 border-b border-blue-100 px-4 py-2 text-xs">
          <span className="text-blue-700 font-semibold">Fshij përgjithmonë faturën {inv.id}?</span>
          <button className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg" onClick={doDelete}>Po, fshij</button>
          <button className="px-3 py-1 border border-gray-200 text-gray-600 font-bold rounded-lg hover:bg-gray-50" onClick={() => setConfirmDel(false)}>Jo</button>
        </div>
      )}

      {isOverdue && canContact && (
        <div className="flex items-center justify-between gap-3 bg-red-50 border-b border-red-100 px-4 py-2">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-red-600">⚠ Fatura ka kaluar afatin e pagesës — {formatDate(inv.due)}</p>
            <p className="text-[11px] text-red-400 mt-0.5 truncate italic">"{buildReminderMsg(inv).slice(0, 90)}…"</p>
          </div>
          <a
            href={`https://wa.me/${rawPhone}?text=${msgEncoded}`}
            target="_blank" rel="noopener noreferrer"
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-lg"
          >
            <MessageCircle size={12}/> Dërgo rikujtim
          </a>
        </div>
      )}

      <div className="flex-1 overflow-y-auto bg-gray-50 p-4 space-y-4">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex justify-end px-6 pt-5 pb-4 border-b border-gray-100">
            <div className="text-right">
              <h2 className="text-3xl font-black tracking-wider text-blue-500 font-mono">Faturë</h2>
              <p className="text-xs font-semibold text-gray-500 mt-0.5 font-mono">Numri i faturës {inv.id}</p>
            </div>
          </div>

          {/* Top section: Customer info and Total */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 px-6 pt-5">
            <div className="flex-1 bg-gray-50 rounded-xl border border-gray-100 p-4">
              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-1">Fatura për</p>
              <button
                onClick={() => setSelectedCustomer(custObj)}
                className="font-black text-blue-600 text-lg leading-tight hover:text-blue-800 hover:underline cursor-pointer transition-colors text-left"
              >
                {inv.customer}
              </button>
              {inv.country && <p className="text-xs text-gray-600 mt-1">📍 {inv.country}</p>}
              {inv.email   && <p className="text-xs text-gray-400 mt-0.5">{inv.email}</p>}
              {custObj?.phone && <p className="text-xs text-gray-600 font-mono mt-0.5">📞 {custObj.phone}</p>}
              {inv.referent && <p className="text-xs text-purple-600 mt-0.5 font-semibold">👤 Referent: {inv.referent}</p>}
            </div>
            <div className="flex-1 bg-gray-50 rounded-xl border border-gray-100 p-4 flex flex-col justify-between gap-2">
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-1">Totali për pagesë</p>
                <p className="text-3xl font-black text-gray-900 leading-tight mt-1 font-mono">{fmt(inv.amount)}</p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={isOverdue && inv.status !== 'paid' && inv.status !== 'void' ? 'overdue' : inv.status}/>
              </div>

              {/* Shfaq shumin e paguar dhe balancën për faturat e paguara pjesërisht */}
              {inv.status === 'partial' && inv.paidAmount > 0 && (
                <div className="p-2 bg-blue-50 rounded-lg border border-blue-100">
                  <div className="flex items-center justify-between gap-2 text-xs mb-0.5">
                    <span className="text-blue-500 font-semibold text-[11px]">Paguar:</span>
                    <span className="font-bold text-blue-600 text-[11px] font-mono">{fmt(inv.paidAmount)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-amber-600 font-semibold text-[11px]">Mbetur:</span>
                    <span className="font-bold text-amber-700 text-[11px] font-mono">{fmt(inv.amount - inv.paidAmount)}</span>
                  </div>
                  <div className="mt-1 w-full bg-gray-200 rounded-full h-1">
                    <div
                      className="bg-blue-500 h-1 rounded-full transition-all"
                      style={{ width: `${(inv.paidAmount / inv.amount) * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom section: Dates in grid (2 cols on mobile, 2 rows on desktop) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 px-6 py-5">
            <div className="bg-gray-50 rounded-xl border border-gray-100 p-3">
              <span className="text-gray-400 text-[10px] mb-1 font-bold uppercase tracking-wide block">Data e faturës:</span>
              <span className="font-bold text-gray-900 text-sm block font-mono">{formatDate(inv.date)}</span>
            </div>
            <div className={`rounded-xl border p-3 ${isOverdue ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-100'}`}>
              <span className={`text-[10px] mb-1 font-bold uppercase tracking-wide block ${isOverdue ? 'text-red-600' : 'text-gray-400'}`}>Afati i pagesës:</span>
              <span className={`font-bold text-sm block font-mono ${isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
                {formatDate(inv.due)}
              </span>
            </div>
            {inv.subscriptionExpiry && (
              <div className="bg-blue-50 rounded-xl border border-blue-100 p-3">
                <span className="text-blue-500 font-bold text-[10px] mb-1 uppercase tracking-wide block">📅 Skadimi:</span>
                <span className="font-bold text-blue-600 text-sm block font-mono">{formatDate(inv.subscriptionExpiry)}</span>
              </div>
            )}
            {inv.notifyDate && (
              <div className="bg-amber-50 rounded-xl border border-amber-100 p-3">
                <span className="text-amber-600 text-[10px] mb-1 font-bold uppercase tracking-wide block">🔔 Njoftim:</span>
                <span className="font-bold text-amber-700 text-sm block font-mono">{inv.notifyDate}</span>
              </div>
            )}
          </div>

          <div className="px-6 pb-5">
            <div className="rounded-xl border border-gray-200 overflow-hidden">

              {/* Desktop/tablet: full table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm border-collapse min-w-[380px]">
                  <thead>
                    <tr className="bg-blue-500 text-white">
                      <th className="text-center px-3 py-3 w-8 font-bold uppercase text-xs tracking-wide">#</th>
                      <th className="text-left px-3 py-3 font-bold uppercase text-xs tracking-wide">Artikulli &amp; Përshkrimi</th>
                      <th className="text-right px-3 py-3 w-16 font-bold uppercase text-xs tracking-wide">Sasia</th>
                      <th className="text-right px-3 py-3 w-20 font-bold uppercase text-xs tracking-wide">Çmimi</th>
                      <th className="text-right px-3 py-3 w-24 font-bold uppercase text-xs tracking-wide">Shuma</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inv.items.map((item, i) => (
                      <tr key={i} className="border-t border-gray-100 hover:bg-gray-50/50">
                        <td className="px-3 py-3.5 text-center text-gray-400 text-sm font-mono">{i + 1}</td>
                        <td className="px-3 py-3.5">
                          <p className="text-gray-800 font-semibold text-sm">{item.desc}</p>
                          {item.note && <p className="text-xs text-gray-400 italic mt-0.5">{item.note}</p>}
                        </td>
                        <td className="px-3 py-3.5 text-right text-gray-700 text-sm font-mono">{item.qty}</td>
                        <td className="px-3 py-3.5 text-right text-gray-700 text-sm font-mono">{fmt(item.price)}</td>
                        <td className="px-3 py-3.5 text-right font-bold text-gray-900 text-sm font-mono">{fmt(item.qty * item.price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile: stacked cards -- no horizontal scroll needed */}
              <div className="sm:hidden divide-y divide-gray-100">
                {inv.items.map((item, i) => (
                  <div key={i} className="px-4 py-3 hover:bg-gray-50/50">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-gray-800 font-semibold text-sm min-w-0">{item.desc}</p>
                      <p className="font-bold text-gray-900 text-sm font-mono flex-shrink-0">{fmt(item.qty * item.price)}</p>
                    </div>
                    {item.note && <p className="text-xs text-gray-400 italic mt-0.5">{item.note}</p>}
                    <p className="text-xs text-gray-400 font-mono mt-1">{item.qty} × {fmt(item.price)}</p>
                  </div>
                ))}
              </div>

              <div className="bg-gray-50 border-t border-gray-200 px-5 py-3 flex items-center justify-between">
                <span className="font-bold text-blue-500 uppercase tracking-wide text-sm">Totali</span>
                <span className="font-black text-gray-900 text-base font-mono">{fmt(inv.amount)}</span>
              </div>
            </div>
          </div>

          <div className="mx-6 mb-6 bg-blue-50 border border-blue-100 rounded-xl py-3 px-4 text-center">
            <p className="text-xs font-bold text-blue-600">Faleminderit për besimin tuaj!</p>
          </div>
        </div>

        {linkedPayment && (
          <div className="bg-emerald-50 rounded-2xl border border-emerald-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-bold text-emerald-700 flex items-center gap-1.5">
                <CreditCard size={15}/> Pagesa e regjistruar
              </p>
              <div className="flex items-center gap-1">
                <button
                  className="icon-btn text-blue-400 hover:bg-blue-50"
                  title="Ndrysho pagesën"
                  onClick={() => setModal(<PaymentModal payment={linkedPayment} onClose={closeModal}/>)}
                >
                  <Pencil size={15}/>
                </button>
                {confirmDelPayment ? (
                  <div className="flex items-center gap-1">
                    <button className="px-2 py-1 bg-blue-500 text-white text-xs font-bold rounded-lg" onClick={doDeletePayment}>Po</button>
                    <button className="px-2 py-1 border border-gray-200 text-gray-600 text-xs font-bold rounded-lg hover:bg-gray-50" onClick={() => setConfirmDelPayment(false)}>Jo</button>
                  </div>
                ) : (
                  <button
                    className="icon-btn text-blue-400 hover:bg-blue-50"
                    title="Fshij pagesën"
                    onClick={() => setConfirmDelPayment(true)}
                  >
                    <Trash2 size={15}/>
                  </button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-sm">
              <div><p className="text-gray-500 mb-1 font-semibold text-xs">Data</p><p className="font-semibold text-gray-800 font-mono">{formatDate(linkedPayment.date)}</p></div>
              <div><p className="text-gray-500 mb-1 font-semibold text-xs">Shuma</p><p className="font-bold text-emerald-700 font-mono">{fmt(linkedPayment.amount)}</p></div>
              <div><p className="text-gray-500 mb-1 font-semibold text-xs">Metoda</p><p className="font-semibold text-gray-800">{linkedPayment.method}</p></div>
              <div>
                <p className="text-gray-500 mb-1 font-semibold text-xs">Tek</p>
                <p className={`font-bold text-sm ${linkedPayment.depositedTo === 'Enndy' ? 'text-blue-600' : 'text-purple-700'}`}>
                  {linkedPayment.depositedTo}
                </p>
              </div>
            </div>
            {linkedPayment.fee > 0 && (
              <p className="text-sm text-amber-700 mt-3 text-center font-medium font-mono">
                Fee: -{fmt(linkedPayment.fee)} · Neto: {fmt(linkedPayment.net)}
              </p>
            )}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h4 className="text-xs font-bold text-gray-800 uppercase tracking-widest mb-4 flex items-center gap-1.5">
            <MessageSquare size={14}/> Komentet e stafit
          </h4>
          {(inv.comments || []).length === 0 ? (
            <p className="text-xs text-gray-400 italic mb-4">Nuk ka komente ende.</p>
          ) : (
            <div className="space-y-3 mb-4">
              {(inv.comments || []).map((c, i) => (
                <div key={i} className="flex gap-2">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-xs font-bold text-blue-600 flex-shrink-0 mt-0.5">
                    {c.author[0]}
                  </div>
                  <div className="flex-1 bg-gray-50 rounded-xl px-3 py-2.5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-gray-800">{c.author}</span>
                      <span className="text-xs text-gray-500 font-mono">{formatDate(c.date)}</span>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">{c.text}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <textarea
              className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 resize-none"
              rows={1}
              placeholder="Shto koment rreth kësaj fature… (Enter = dërgo)"
              value={comment}
              onChange={e => setComment(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addComment() }
              }}
            />
            <button
              className="px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold text-xs flex items-center gap-1.5 transition-colors flex-shrink-0"
              onClick={addComment}
              disabled={!comment.trim()}
            >
              <Send size={14}/> Dërgo
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════
   Export Panel
══════════════════════════════════════════════════════════ */
function ExportPanel({ invoices, customers, onClose, fmt }) {
  const today = new Date()
  const thisYear  = today.getFullYear()
  const thisMonth = String(today.getMonth() + 1).padStart(2, '0')

  const [statusF, setStatusF] = useState('all')
  const [yearF,   setYearF]   = useState(String(thisYear))
  const [monthF,  setMonthF]  = useState('all')

  const MONTHS = [
    { v: 'all', l: 'Të gjithë muajt' },
    { v: '01', l: 'Janar'   }, { v: '02', l: 'Shkurt' }, { v: '03', l: 'Mars'  },
    { v: '04', l: 'Prill'   }, { v: '05', l: 'Maj'    }, { v: '06', l: 'Qershor' },
    { v: '07', l: 'Korrik'  }, { v: '08', l: 'Gusht'  }, { v: '09', l: 'Shtator' },
    { v: '10', l: 'Tetor'   }, { v: '11', l: 'Nëntor' }, { v: '12', l: 'Dhjetor' },
  ]

  const years = useMemo(() => {
    const ys = new Set(invoices.map(i => i.date?.slice(0, 4)).filter(Boolean))
    return [...ys].sort((a, b) => b - a)
  }, [invoices])

  const todayStr = today.toISOString().slice(0, 10)

  const filtered = useMemo(() => invoices.filter(i => {
    if (statusF !== 'all') {
      if (statusF === 'overdue') {
        const isOv = i.status === 'overdue' || (i.status === 'pending' && i.due && i.due < todayStr)
        if (!isOv) return false
      } else {
        if (i.status !== statusF) return false
      }
    }
    if (yearF !== 'all' && !i.date?.startsWith(yearF)) return false
    if (monthF !== 'all' && i.date?.slice(5, 7) !== monthF) return false
    return true
  }), [invoices, statusF, yearF, monthF])

  const totalAmt = filtered.reduce((s, i) => s + (i.amount || 0), 0)

  const doExport = () => {
    const header = ['ID', 'Data', 'Klienti', 'Telefoni', 'Shuma (€)', 'Statusi', 'Afati i pagesës', 'Skadimi Abonimit', 'Referenti']
    const rows = filtered.map(i => {
      const phone = customers.find(c => c.name === i.customer)?.phone || ''
      const status = i.status === 'overdue' || (i.status === 'pending' && i.due && i.due < todayStr) ? 'Vonuar' :
                     i.status === 'paid' ? 'Paguar' :
                     i.status === 'pending' ? 'Pritje' :
                     i.status === 'draft' ? 'Draft' :
                     i.status === 'partial' ? 'Pjesërisht' : i.status || ''
      return [
        i.id, i.date || '', i.customer || '', phone,
        (i.amount || 0).toFixed(2), status,
        i.due || '', i.subscriptionExpiry || '', i.referent || '',
      ]
    })

    const csv = [header, ...rows]
      .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    const labelStatus = statusF === 'all' ? 'te-gjitha' : statusF
    const labelMonth  = monthF === 'all' ? '' : `-${monthF}`
    a.href     = url
    a.download = `faturat-${labelStatus}-${yearF}${labelMonth}.csv`
    a.click()
    URL.revokeObjectURL(url)
    onClose()
  }

  const Chip = ({ active, onClick, children }) => (
    <button onClick={onClick}
      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
        active ? 'bg-blue-500 text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
      }`}>
      {children}
    </button>
  )

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
              <Download size={15} className="text-blue-500"/>
            </div>
            <div>
              <h2 className="font-bold text-gray-800 text-sm">Eksporto Faturat</h2>
              <p className="text-[11px] text-gray-400">Zgjidh filtrat dhe shkarko CSV</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition-colors">
            <X size={16}/>
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Status filter */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Statusi</label>
            <div className="flex flex-wrap gap-1.5">
              {[
                { v: 'all',     l: 'Të gjitha' },
                { v: 'paid',    l: 'Paguar' },
                { v: 'pending', l: 'Pritje' },
                { v: 'overdue', l: 'Vonuar' },
                { v: 'draft',   l: 'Draft' },
              ].map(f => (
                <Chip key={f.v} active={statusF === f.v} onClick={() => setStatusF(f.v)}>{f.l}</Chip>
              ))}
            </div>
          </div>

          {/* Year filter */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Viti</label>
            <div className="flex flex-wrap gap-1.5">
              <Chip active={yearF === 'all'} onClick={() => setYearF('all')}>Të gjithë</Chip>
              {years.map(y => (
                <Chip key={y} active={yearF === y} onClick={() => setYearF(y)}>{y}</Chip>
              ))}
            </div>
          </div>

          {/* Month filter */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Muaji</label>
            <div className="flex flex-wrap gap-1.5">
              {MONTHS.map(m => (
                <Chip key={m.v} active={monthF === m.v} onClick={() => setMonthF(m.v)}>{m.l}</Chip>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="bg-blue-50 rounded-xl px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-blue-500 font-semibold">{filtered.length} fatura të zgjedhura</p>
              <p className="text-sm font-bold text-blue-700 mt-0.5">Totali: €{totalAmt.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
            </div>
            <CheckCircle2 size={20} className={filtered.length > 0 ? 'text-blue-400' : 'text-gray-300'}/>
          </div>
        </div>

        {/* Footer */}
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

/* ══════════════════════════════════════════════════════════
   Kanban Board
══════════════════════════════════════════════════════════ */
function KanbanCard({ inv, onOpen, customerMap, hidden }) {
  const { fmt: rawFmt, setModal, closeModal } = useApp()
  const fmt = hidden ? () => '••••••' : rawFmt
  const custObj  = customerMap.get(inv.customer)
  const rawPhone = cleanPhone(custObj?.phone || '')
  const today    = new Date().toISOString().slice(0, 10)
  const isOverdue = inv.status === 'overdue' ||
    (inv.due && inv.due < today && inv.status !== 'paid' && inv.status !== 'void')
  const canContact = rawPhone && inv.status !== 'void'
  const msgEncoded = encodeURIComponent(buildReminderMsg(inv))

  const daysLeft = inv.due
    ? Math.round((new Date(inv.due) - Date.now()) / 86_400_000)
    : null

  return (
    <div
      className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group"
      onClick={() => onOpen(inv.id)}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <p className="font-bold text-gray-800 text-sm truncate">{inv.customer}</p>
          <p className="text-[11px] text-gray-400 mt-0.5 font-mono">{inv.id}</p>
        </div>
        <span className="text-base font-bold text-gray-800 flex-shrink-0">{fmt(inv.amount)}</span>
      </div>

      {/* Dates */}
      <div className="flex items-center justify-between text-[11px] mb-3">
        <span className="text-gray-400">Data: {formatDate(inv.date)}</span>
        {inv.due && (
          <span className={`font-semibold ${isOverdue ? 'text-red-500' : daysLeft !== null && daysLeft <= 3 ? 'text-amber-500' : 'text-gray-500'}`}>
            {isOverdue
              ? `Vonuar ${Math.abs(daysLeft || 0)}d`
              : daysLeft === 0 ? 'Sot skadon'
              : daysLeft === 1 ? 'Nesër skadon'
              : `Afati: ${formatDate(inv.due)}`}
          </span>
        )}
      </div>

      {/* Subscription expiry */}
      {inv.subscriptionExpiry && (
        <div className="text-[11px] text-blue-500 mb-3 flex items-center gap-1">
          <span>🔄</span>
          <span>Abonim deri: {formatDate(inv.subscriptionExpiry)}</span>
        </div>
      )}

      {/* Actions */}
      <div
        className="flex items-center gap-1.5 pt-2 border-t border-gray-50"
        onClick={e => e.stopPropagation()}
      >
        {canContact && (
          <a
            href={`https://wa.me/${rawPhone}?text=${msgEncoded}`}
            target="_blank" rel="noopener noreferrer"
            className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${
              isOverdue ? 'bg-red-50 text-red-500 hover:bg-red-100' : 'bg-green-50 text-green-500 hover:bg-green-100'
            }`}
            title="WhatsApp"
          >
            <MessageCircle size={13}/>
          </a>
        )}
        {canContact && (
          <a
            href={`https://t.me/+${rawPhone}`}
            target="_blank" rel="noopener noreferrer"
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-sky-50 text-sky-500 hover:bg-sky-100 transition-colors"
            title="Telegram"
          >
            <Send size={13}/>
          </a>
        )}
        {(inv.status === 'pending' || inv.status === 'overdue') && (
          <button
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-emerald-50 text-emerald-500 hover:bg-emerald-100 transition-colors ml-auto"
            title="Regjistro pagesën"
            onClick={() => setModal(<PaymentModal invoice={inv} onClose={closeModal}/>)}
          >
            <CreditCard size={13}/>
          </button>
        )}
      </div>
    </div>
  )
}

/* ── Self-contained actions dropdown — isolates open/close state so parent never re-renders ── */
const RowActions = memo(function RowActions({ inv, canContact, isOverdue, rawPhone, onNavigate, onPayment, onDelete, isMobile }) {
  const [open, setOpen] = useState(false)
  const [menuPos, setMenuPos] = useState(null)
  const btnRef = useRef(null)
  const menuRef = useRef(null)
  const close = useCallback(() => setOpen(false), [])

  const openMenu = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    const openUp = spaceBelow < 260 && rect.top > spaceBelow
    setMenuPos({
      left: Math.max(8, rect.right - 208),
      top: openUp ? null : rect.bottom + 6,
      bottom: openUp ? window.innerHeight - rect.top + 6 : null,
    })
    setOpen(true)
  }

  /* Menu-ja rendohet me portal jashtë tabelës, prandaj mbyllja në klikim jashtë
     duhet të kontrollojë edhe butonin edhe vetë menu-në përmes ref-ave. */
  useEffect(() => {
    if (!open) return
    const handleClick = (e) => {
      if (btnRef.current?.contains(e.target)) return
      if (menuRef.current?.contains(e.target)) return
      setOpen(false)
    }
    const handleKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    const handleScroll = () => setOpen(false)
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    window.addEventListener('scroll', handleScroll, true)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [open])

  const msg = canContact ? encodeURIComponent(buildReminderMsg(inv)) : ''

  return (
    <div className="relative flex-shrink-0" onClick={e => e.stopPropagation()}>
      <button
        ref={btnRef}
        className={isMobile
          ? "w-10 h-10 flex items-center justify-center rounded-lg bg-gray-100 text-gray-600 hover:bg-blue-500 hover:text-white"
          : "icon-btn text-gray-400 hover:text-gray-600 hover:bg-gray-100"}
        title="Veprimet"
        onClick={e => { e.stopPropagation(); if (open) { setOpen(false); return }; openMenu(e) }}
      >
        <MoreVertical size={isMobile ? 18 : 16}/>
      </button>

      {open && menuPos && createPortal(
        <div
          ref={menuRef}
          className="fixed w-52 bg-white border border-gray-200 rounded-xl shadow-xl z-[9999] overflow-hidden"
          style={{ left: menuPos.left, ...(menuPos.top != null ? { top: menuPos.top } : { bottom: menuPos.bottom }) }}
        >
          <button
            className="w-full text-left px-3.5 py-2 text-[13px] font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2 border-b border-gray-100"
            onClick={() => { onNavigate(`invoices:${inv.id}:edit`); close() }}
          >
            <Pencil size={14}/> Ndrysho
          </button>

          {canContact && (
            <a
              href={`https://wa.me/${rawPhone}?text=${msg}`}
              target="_blank" rel="noopener noreferrer"
              className={`block w-full text-left px-3.5 py-2 text-[13px] font-medium hover:bg-green-50 flex items-center gap-2 border-b border-gray-100 ${isOverdue ? 'text-orange-600' : 'text-green-600'}`}
              onClick={() => { MessageLogService.logWhatsAppMessage(inv.customer, rawPhone, buildReminderMsg(inv), inv.id, 'prepared'); close() }}
            >
              <MessageCircle size={14}/> Pagesa WA {isOverdue && '🔔'}
            </a>
          )}

          {!isMobile && canContact && (
            <a
              href={`https://t.me/+${rawPhone}`}
              target="_blank" rel="noopener noreferrer"
              className="block w-full text-left px-3.5 py-2 text-[13px] font-medium text-sky-600 hover:bg-sky-50 flex items-center gap-2 border-b border-gray-100"
              onClick={close}
            >
              <Send size={14}/> Pagesa TG
            </a>
          )}

          {!isMobile && canContact && (
            <a
              href={`https://wa.me/${rawPhone}?text=${encodeURIComponent(buildInvoiceMsg(inv))}`}
              target="_blank" rel="noopener noreferrer"
              className="block w-full text-left px-3.5 py-2 text-[13px] font-medium text-blue-500 hover:bg-blue-50 flex items-center gap-2 border-b border-gray-100"
              onClick={() => { MessageLogService.logWhatsAppMessage(inv.customer, rawPhone, buildInvoiceMsg(inv), inv.id, 'prepared'); close() }}
            >
              <FileText size={14}/> Dërgo faturën WA
            </a>
          )}

          {(inv.status === 'pending' || inv.status === 'overdue') && (
            <button
              className="w-full text-left px-3.5 py-2 text-[13px] font-medium text-emerald-600 hover:bg-emerald-50 flex items-center gap-2 border-b border-gray-100"
              onClick={() => { onPayment(inv); close() }}
            >
              <CreditCard size={14}/> {isMobile ? 'Pagesa' : 'Regjistro Pagesën'}
            </button>
          )}

          <button
            className="w-full text-left px-3.5 py-2 text-[13px] font-medium text-blue-600 hover:bg-blue-50 flex items-center gap-2"
            onClick={() => { onDelete(inv.id); close() }}
          >
            <Trash2 size={14}/> Fshi
          </button>
        </div>,
        document.body
      )}
    </div>
  )
})

function KanbanBoard({ invoices, setPreview, customerMap, hidden }) {
  const today = new Date().toISOString().slice(0, 10)

  const pending = invoices.filter(i => i.status === 'pending')
  const overdue = invoices.filter(i =>
    i.status === 'overdue' ||
    (i.status === 'pending' && i.due && i.due < today)
  )
  const voidInv = invoices.filter(i => i.status === 'void')

  const columns = [
    {
      key:     'pending',
      label:   'Në pritje',
      count:   pending.length,
      items:   pending,
      accent:  'border-t-amber-400',
      badge:   'bg-amber-50 text-amber-700',
      empty:   'Nuk ka fatura në pritje',
    },
    {
      key:     'overdue',
      label:   'Jashtë afatit',
      count:   overdue.length,
      items:   overdue,
      accent:  'border-t-red-500',
      badge:   'bg-red-50 text-red-600',
      empty:   'Nuk ka fatura të vonuara',
    },
    {
      key:     'void',
      label:   'Void / Anuluar',
      count:   voidInv.length,
      items:   voidInv,
      accent:  'border-t-gray-400',
      badge:   'bg-gray-100 text-gray-500',
      empty:   'Nuk ka fatura void',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
      {columns.map(col => (
        <div key={col.key} className={`bg-white rounded-xl border border-gray-100 border-t-2 ${col.accent} flex flex-col`}>
          {/* Column header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
            <h3 className="font-bold text-gray-700 text-sm">{col.label}</h3>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${col.badge}`}>
              {col.count}
            </span>
          </div>

          {/* Cards */}
          <div className="p-3 space-y-3 flex-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 260px)' }}>
            {col.items.length === 0 ? (
              <p className="text-xs text-gray-300 italic text-center py-6">{col.empty}</p>
            ) : (
              col.items.map(inv => (
                <KanbanCard key={inv.id} inv={inv} onOpen={id => setPreview(id)} customerMap={customerMap} hidden={hidden} />
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════ */
/* Main Invoices page                                         */
/* ══════════════════════════════════════════════════════════ */
export default function Invoices() {
  console.log('🆕 PARTIAL PAYMENTS SYSTEM LOADED - Invoices.jsx updated')
  const {
    invoices, setInvoices,
    customers,
    setModal, closeModal,
    showToast, fmt: rawFmt,
    currentOrgId, currentOrg,
    page, navigate, logActivity,
    invoicesHidden: hideAmounts, setInvoicesHidden: setHideAmounts,
    invoicesExportOpen: showExport, setInvoicesExportOpen: setShowExport,
    invoicesImportOpen: importOpen, setInvoicesImportOpen: setImportOpen,
  } = useApp()
  const fmt = hideAmounts ? () => '••••••' : rawFmt

  // Detect if we're in form mode (page like "invoices:create" or "invoices:ID:edit")
  const pageMatch = page.split(':')
  const isFormMode = pageMatch[0] === 'invoices' && (pageMatch[1] === 'create' || pageMatch[1]?.includes('-'))
  const editInvoiceId = pageMatch[1]?.includes('-') ? pageMatch[1] : null
  const editInvoice = editInvoiceId ? invoices.find(i => i.id === editInvoiceId) : null

  // Close modal if we leave form mode
  useEffect(() => {
    if (!isFormMode) {
      closeModal()
    }
  }, [isFormMode, closeModal])

  // Only render form if we're in form mode
  // Use key to force remount when isFormMode changes
  const InvoiceFormPanel = isFormMode ? (
    <div key={`invoice-form-${editInvoiceId || 'create'}`}>
      <FormPageWrapper
        title={editInvoice ? `Ndrysho Faturën` : 'Faturë e Re'}
        subtitle={editInvoice ? editInvoice.id : 'Krijo një faturë të re'}
        onBack={() => navigate('invoices')}
      >
        <InvoiceModal
          key={`modal-${editInvoiceId || 'create'}`}
          initialData={editInvoice || undefined}
          onClose={() => navigate('invoices')}
          isFormPage={true}
        />
      </FormPageWrapper>
    </div>
  ) : null

  const [search,       setSearch]   = useState(() => {
    // Load search from header if user searched by customer name
    const headerSearch = localStorage.getItem('arestv_invoice_search')
    localStorage.removeItem('arestv_invoice_search') // Clear it after reading
    return headerSearch || ''
  })
  const [statusFilter, setStatus]   = useState(() => {
    const f = JSON.parse(localStorage.getItem('arestv_nav_filter') || 'null')
    if (f?.status) { localStorage.removeItem('arestv_nav_filter'); return 'pending' }
    return 'all'
  })
  const [typeFilter,   setTypeFilter]= useState(() => {
    const f = JSON.parse(localStorage.getItem('arestv_nav_filter') || 'null')
    return f?.type && f.type !== 'all' ? f.type : 'all'
  })
  const [paginationPage,  setPaginationPage] = useState(1)
  const [perPage,      setPerPage]  = useState(10)
  const [sortField,    setSortField]= useState('id')
  const [sortDir,      setSortDir]  = useState('desc')
  const [preview,      setPreview]   = useState(null)
  const [viewMode,     setViewMode] = useState('table')
  const [selectedCustomer, setSelectedCustomer] = useState(null) // Customer details modal
  const [selected,     setSelected] = useState(new Set()) // Selected invoices for bulk delete
  const [confirmDelAll, setConfirmDelAll] = useState(false) // Confirmation dialog for bulk delete
  const [deletingInvoiceId, setDeletingInvoiceId] = useState(null) // Track which invoice is being deleted from dropdown
  const { columns: invoiceColumns, allColumns: allInvoiceColumns, savePrefs: saveInvoiceColumnPrefs } = useColumnPrefs('invoices', INVOICE_TABLE_COLUMNS)
  const [draggedCol, setDraggedCol] = useState(null)
  const [dragOverCol, setDragOverCol] = useState(null)

  // Rendit kolonën e tërhequr pikërisht te pozita e kolonës mbi të cilën u lëshua
  // (futet para saj) — ndikon radhën e RUAJTUR (të gjitha kolonat, jo vetëm ato
  // të dukshme), që kolonat e fshehura të mos i humbin vendin kur rishfaqen.
  const handleColDrop = useCallback((targetKey) => {
    if (!draggedCol || draggedCol === targetKey) { setDraggedCol(null); setDragOverCol(null); return }
    const order = allInvoiceColumns.map(c => c.key)
    const hidden = allInvoiceColumns.filter(c => c.hidden).map(c => c.key)
    const withoutDragged = order.filter(k => k !== draggedCol)
    const targetIdx = withoutDragged.indexOf(targetKey)
    if (targetIdx === -1) { setDraggedCol(null); setDragOverCol(null); return }
    withoutDragged.splice(targetIdx, 0, draggedCol)
    saveInvoiceColumnPrefs(withoutDragged, hidden)
    setDraggedCol(null)
    setDragOverCol(null)
  }, [draggedCol, allInvoiceColumns, saveInvoiceColumnPrefs])

  // E lëshove kolonën jashtë rreshtit të kokave (diku tjetër në faqe) — e njëjta
  // logjikë si të çkyçje-shosh checkbox-in e saj te paneli "Kolonat e tabelës".
  const handleColDropOutside = useCallback(() => {
    if (!draggedCol) return
    const order = allInvoiceColumns.map(c => c.key)
    const hidden = allInvoiceColumns.filter(c => c.hidden).map(c => c.key)
    if (hidden.length + 1 < order.length) { // mos lejo me fsheh kolonën e fundit të dukshme
      saveInvoiceColumnPrefs(order, [...hidden, draggedCol])
    }
    setDraggedCol(null)
    setDragOverCol(null)
  }, [draggedCol, allInvoiceColumns, saveInvoiceColumnPrefs])

  // Optimize customer lookups: O(1) instead of O(n)
  const customerMap = useMemo(() => new Map(customers.map(c => [c.name, c])), [customers])

  // Memoize long overdue check to avoid scanning all invoices per row
  const longOverdueSet = useMemo(() => {
    const now = new Date()
    const s = new Set()
    invoices.forEach(inv => {
      if (inv.status === 'paid' || inv.status === 'void' || !inv.due) return
      const daysOverdue = Math.floor((now - new Date(inv.due)) / (1000 * 60 * 60 * 24))
      if (daysOverdue > 21) s.add(inv.customer)
    })
    return s
  }, [invoices])

  const getCustomerType = useCallback(name =>
    customerMap.get(name)?.type || 'individual',
    [customerMap]
  )

  function handleImportInvoices(rows) {
    console.error('🔴🔴🔴 IMPORT ORGID CHECK:')
    console.error('  currentOrgId:', currentOrgId)
    console.error('  currentOrg.name:', currentOrg?.name)

    console.log('[Import] =============== STARTING IMPORT ===============')
    console.log('[Import] Received rows:', rows.length)

    setInvoices(prev => {
      console.log('[Import] Current invoices in state:', prev.length)

      // ALWAYS import all rows - generate NEW IDs for all
      // This prevents deduplication by ID which was filtering 940 invoices
      const maxNum = prev.reduce((m, i) => {
        const n = parseInt(i.id.replace('INV-','')) || 0
        return n > m ? n : m
      }, 0)
      console.log('[Import] Max existing invoice number:', maxNum)

      // Generate new IDs for ALL imported invoices to avoid conflicts
      const renumbered = rows.map((r, i) => ({
        ...r,
        id: `INV-${String(maxNum + i + 1).padStart(6, '0')}`,
      }))

      console.log('[Import] Imported invoices with new IDs:', renumbered.length)
      if (renumbered.length > 0) {
        console.log('[Import] First: ID=' + renumbered[0].id + ', Customer=' + renumbered[0].customer)
        console.log('[Import] Last: ID=' + renumbered[renumbered.length - 1].id + ', Customer=' + renumbered[renumbered.length - 1].customer)
      }

      const result = [...prev, ...renumbered]
      console.log('[Import] Final total invoices:', result.length)

      // DEBUG: Check orgId on imported invoices
      const importedInvoices = result.slice(-renumbered.length)
      console.error('🔴 IMPORTED INVOICES ORGID CHECK:')
      console.error('  Count:', importedInvoices.length)
      console.error('  First invoice orgId:', importedInvoices[0]?.orgId)
      console.error('  Sample invoices:', importedInvoices.slice(0, 3).map(i => ({ id: i.id, orgId: i.orgId, customer: i.customer })))
      console.log('[Import] =============== IMPORT COMPLETE ===============')

      showToast(`U importuan ${renumbered.length} fatura`, 'success')
      return result
    })
  }

  // Bulk delete functions
  const toggleSelectInvoice = (id) => {
    setSelected(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) newSet.delete(id)
      else newSet.add(id)
      return newSet
    })
  }

  const toggleSelectAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map(i => i.id)))
    }
  }

  const handleDeleteSelected = () => {
    const count = selected.size
    const deletedInvoices = invoices.filter(i => selected.has(i.id))
    setInvoices(prev => prev.filter(i => !selected.has(i.id)))
    deletedInvoices.forEach(inv => {
      logActivity(`Fshiu faturën ${inv.id} — ${inv.customer} €${inv.amount}`, 'Faturat')
    })
    setSelected(new Set())
    setConfirmDelAll(false)
    showToast(`U fshihen ${count} fatura`, 'success')
  }

  const today = new Date().toISOString().slice(0, 10)

  // Normalize text: convert spaces and underscores to uniform format for fuzzy search
  const normalize = (text) => (text || '').toLowerCase().replace(/[\s_-]/g, ' ').trim()

  const filtered = useMemo(() => invoices.filter(i => {
    // Status filter - special handling for 'overdue' and 'unpaid'
    if (statusFilter !== 'all') {
      if (statusFilter === 'overdue') {
        // Overdue includes: explicit 'overdue' status OR pending with past due date
        const isOverdue = i.status === 'overdue' || (i.status === 'pending' && i.due && i.due < today)
        if (!isOverdue) return false
      } else if (statusFilter === 'unpaid') {
        // "Papaguara Sellers" KPI card — pending or overdue, matches sellerInvoices below
        if (i.status !== 'pending' && i.status !== 'overdue') return false
      } else {
        if (i.status !== statusFilter) return false
      }
    }

    if (typeFilter === 'reseller'   && getCustomerType(i.customer) !== 'reseller')   return false
    if (typeFilter === 'individual' && getCustomerType(i.customer) === 'reseller')    return false
    if (search) {
      const searchNorm = normalize(search)
      const matchCustomer = normalize(i.customer).includes(searchNorm)
      const matchId = i.id.includes(search)
      const matchReferent = i.referent && normalize(i.referent).includes(searchNorm)
      if (!matchCustomer && !matchId && !matchReferent) return false
    }
    return true
  }), [invoices, statusFilter, typeFilter, search, customerMap])

  const toggleSort = field => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
    setPaginationPage(1)
  }

  const sorted = useMemo(() => [...filtered].sort((a, b) => {
    let cmp = 0
    if      (sortField === 'id')       cmp = a.id.localeCompare(b.id)
    else if (sortField === 'customer') cmp = a.customer.localeCompare(b.customer)
    else if (sortField === 'amount')   cmp = a.amount - b.amount
    else if (sortField === 'status')   cmp = (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9)
    return sortDir === 'asc' ? cmp : -cmp
  }), [filtered, sortField, sortDir])

  const getPhone = useCallback(name => {
    const c = customerMap.get(name)
    return c?.phone || ''
  }, [customerMap])

  const hasLongOverdue = useCallback(customerName => longOverdueSet.has(customerName), [longOverdueSet])

  // Clear preview and navigate (used for create/edit buttons)
  const navigateWithClearPreview = useCallback((path) => {
    setPreview(null)
    navigate(path)
  }, [navigate])

  // Paginated slice of `sorted` -- used by both the default table view and the
  // split-preview left rail below. Without this, opening a preview used to
  // render an InvoiceListCard for every invoice matching the current filter
  // (thousands on real data) instead of just the current page, which is what
  // made clicking an invoice take several seconds to open.
  const paged = sorted.slice((paginationPage - 1) * perPage, paginationPage * perPage)

  /* ── SPLIT LAYOUT (when a preview is selected) ── */
  if (preview) {
    return (
      <div
        className="-m-3 sm:-m-5 md:-m-6 flex overflow-hidden bg-gray-50"
        style={{ height: 'calc(100vh - 56px)' }}
      >
        {/* Left: invoice list — hidden on mobile (show only detail panel) */}
        <div className="hidden md:flex w-[340px] flex-shrink-0 border-r border-gray-200 flex-col overflow-hidden bg-white">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div>
              <p className="font-extrabold text-sm text-gray-900">Të gjitha faturat</p>
              <p className="text-[11px] text-gray-400 font-medium">{filtered.length.toLocaleString('en-US')} rezultate</p>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setHideAmounts(h => !h)}
                title={hideAmounts ? 'Shfaq shumat' : 'Fshih shumat'}
                className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 text-gray-500 hover:text-blue-600 transition-colors flex-shrink-0"
              >
                {hideAmounts ? <EyeOff size={13}/> : <Eye size={13}/>}
              </button>
              <button
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-xl bg-blue-500 hover:bg-blue-600 text-white shadow-sm transition-colors"
                onClick={() => navigateWithClearPreview('invoices:create')}
              >
                <Plus size={12}/> Faturë
              </button>
            </div>
          </div>

          <div className="px-3 pt-3">
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5 focus-within:border-blue-400 focus-within:bg-white transition-all">
              <Search size={12} className="text-gray-400 flex-shrink-0"/>
              <input
                className="bg-transparent border-none outline-none text-xs text-gray-600 w-full placeholder-gray-400"
                placeholder="Kërko..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="text-gray-400 hover:text-gray-600 flex-shrink-0 cursor-pointer p-0.5 rounded hover:bg-gray-100 transition-colors"
                  title="Fshi kërkimin"
                >
                  <X size={14}/>
                </button>
              )}
            </div>
          </div>

          <div className="flex gap-2 px-3 py-2 border-b border-gray-100">
            <select
              value={statusFilter}
              onChange={(e) => setStatus(e.target.value)}
              className="flex-1 text-[11px] font-semibold bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 outline-none focus:border-blue-400 cursor-pointer"
            >
              <option value="all">Të gjitha</option>
              <option value="pending">Pritje</option>
              <option value="overdue">Vonuar</option>
              <option value="paid">Paguar</option>
              <option value="unpaid">Papaguar (Pritje+Vonuar)</option>
              <option value="draft">Draft</option>
              <option value="void">Void</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="flex-1 text-[11px] font-semibold bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 outline-none focus:border-blue-400 cursor-pointer"
            >
              <option value="all">Të gjithë</option>
              <option value="individual">👤 Klientë</option>
              <option value="reseller">🔄 Reseller</option>
            </select>
          </div>

          <div className="flex-1 overflow-y-auto pb-1.5">
            {paged.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-8">Asnjë faturë nuk u gjet</p>
            ) : (
              paged.map(inv => (
                <InvoiceListCard
                  key={inv.id}
                  inv={inv}
                  selected={preview === inv.id}
                  onClick={() => setPreview(inv.id)}
                  customerMap={customerMap}
                  hidden={hideAmounts}
                />
              ))
            )}
          </div>

          <Pagination page={paginationPage} total={filtered.length} perPage={perPage} onChange={setPaginationPage}/>
        </div>

        {/* Right: invoice side panel */}
        <div className="flex-1 flex flex-col overflow-hidden lg:max-w-[900px]">
          <InvoiceSidePanel
            key={preview}
            invId={preview}
            onClose={() => setPreview(null)}
            setSelectedCustomer={setSelectedCustomer}
            customerMap={customerMap}
            hidden={hideAmounts}
          />
        </div>

        {/* Customer Details Modal */}
        {selectedCustomer && (
          <CustomerDetailsModal
            customer={selectedCustomer}
            onClose={() => setSelectedCustomer(null)}
          />
        )}
      </div>
    )
  }

  /* ── KANBAN BOARD VIEW ── */
  if (viewMode === 'board') {
    return (
      <div>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Faturat</h2>
            <p className="text-sm text-gray-400 mt-0.5">{invoices.length} fatura gjithsej</p>
          </div>
          <div className="flex items-center gap-1.5">
            {/* Hide/show amounts */}
            <button
              onClick={() => setHideAmounts(h => !h)}
              className="w-9 h-9 flex items-center justify-center rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
              title={hideAmounts ? 'Shfaq shumat' : 'Fshih shumat'}
            >
              {hideAmounts ? <EyeOff size={16}/> : <Eye size={16}/>}
            </button>

            {/* Switch to table view */}
            <button
              onClick={() => setViewMode('table')}
              className="w-9 h-9 flex items-center justify-center rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
              title="Tabela"
            >
              <LayoutList size={16}/>
            </button>

            {/* Export */}
            <button
              className="w-9 h-9 flex items-center justify-center rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
              title="Eksporto"
              onClick={() => setShowExport(true)}
            >
              <Download size={16}/>
            </button>

            {/* New Invoice */}
            <button
              className="w-9 h-9 flex items-center justify-center rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors font-bold text-lg"
              onClick={() => navigateWithClearPreview('invoices:create')}
              title="Faturë e re"
            >
              +
            </button>
          </div>
        </div>

        <KanbanBoard invoices={invoices} setPreview={setPreview} customerMap={customerMap} hidden={hideAmounts} />

        {/* Customer Details Modal */}
        {selectedCustomer && (
          <CustomerDetailsModal
            customer={selectedCustomer}
            onClose={() => setSelectedCustomer(null)}
          />
        )}
      </div>
    )
  }

  /* ── DEFAULT LAYOUT (full-width table) ── */

  /* Calculate stats - based on filtered invoices */
  const pendingValue = filtered
    .filter(i => i.status === 'pending')
    .reduce((sum, i) => sum + (i.amount || 0), 0)
  const overdueValue = filtered
    .filter(i => i.status === 'overdue' || (i.status === 'pending' && i.due && i.due < today))
    .reduce((sum, i) => sum + (i.amount || 0), 0)

  // Counts for the KPI card badges -- same predicates as above, just .length
  const pendingInvoicesCount = filtered.filter(i => i.status === 'pending').length
  const overdueInvoicesCount = filtered.filter(i => i.status === 'overdue' || (i.status === 'pending' && i.due && i.due < today)).length

  // Calculate total unpaid invoices for resellers from filtered data
  const sellerInvoices = filtered.filter(i => {
    const customer = customerMap.get(i.customer)
    return customer?.type === 'reseller' && (i.status === 'pending' || i.status === 'overdue')
  })
  const totalUnpaidSellers = sellerInvoices.reduce((sum, i) => sum + (i.amount || 0), 0)

  // Paid invoices -- new stat card, doesn't affect any existing calculation
  const paidInvoicesList = filtered.filter(i => i.status === 'paid')
  const paidValue = paidInvoicesList.reduce((sum, i) => sum + (i.amount || 0), 0)

  // KPI cards double as filters for the list below — clicking one sets
  // statusFilter/typeFilter; clicking the same (already-active) card again
  // clears back to "all" instead of getting stuck filtered.
  const toggleStatusFilter = (value) => {
    setStatus(prev => prev === value ? 'all' : value)
    setPaginationPage(1)
  }
  const isSellerFilterActive = statusFilter === 'unpaid' && typeFilter === 'reseller'
  const toggleSellerFilter = () => {
    if (isSellerFilterActive) {
      setStatus('all')
      setTypeFilter('all')
    } else {
      setStatus('unpaid')
      setTypeFilter('reseller')
    }
    setPaginationPage(1)
  }

  // If in form mode, show only the form
  if (isFormMode) {
    return InvoiceFormPanel
  }

  return (
    <div
      onDragOver={e => { if (draggedCol) e.preventDefault() }}
      onDrop={e => { if (draggedCol) { e.preventDefault(); handleColDropOutside() } }}
    >
      {/* Header — titulli, hide/columns/eksporto/importo/+Faturë tani jetojnë te header-i global
         (Header.jsx, kur page === 'invoices'); këtu mbetet vetëm veprimi kontekstual i tabelës
         (fshi të zgjedhurat), kur ka rreshta të selektuar. */}
      <div className="flex flex-col gap-6 mb-6">
        {selected.size > 0 && (
          <div className="flex justify-end">
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors text-xs font-bold"
              onClick={() => setConfirmDelAll(true)}
            >
              <Trash2 size={14}/> Fshi {selected.size}
            </button>
          </div>
        )}

        {/* KPI cards — klikueshme, veprojnë si filtra për listën poshtë */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <button
            type="button"
            onClick={() => toggleStatusFilter('pending')}
            title="Filtro: fatura në pritje"
            className={`text-left bg-white rounded-2xl p-4 border shadow-sm cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 ${
              statusFilter === 'pending' ? 'border-amber-400 ring-2 ring-amber-200' : 'border-amber-200/80'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-gray-500">Në pritje</span>
              <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 whitespace-nowrap">
                {pendingInvoicesCount} fatura
              </span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-2">{fmt(pendingValue)}</p>
            <p className="text-[11px] text-amber-700 mt-1">Presin arkëtim brenda afatit</p>
          </button>

          <button
            type="button"
            onClick={() => toggleStatusFilter('overdue')}
            title="Filtro: fatura të vonuara"
            className={`text-left bg-white rounded-2xl p-4 border shadow-sm cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 ${
              statusFilter === 'overdue' ? 'border-red-400 ring-2 ring-red-200' : 'border-red-200/80'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-gray-500">Të vonuara</span>
              <span className="text-[11px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-full border border-red-200 whitespace-nowrap">
                {overdueInvoicesCount} fatura
              </span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-red-600 mt-2">{fmt(overdueValue)}</p>
            <p className="text-[11px] text-red-700 mt-1">Kërkojnë ndjekje urgjente</p>
          </button>

          <button
            type="button"
            onClick={toggleSellerFilter}
            title="Filtro: fatura të papaguara të rishitësve"
            className={`text-left bg-white rounded-2xl p-4 border shadow-sm cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 ${
              isSellerFilterActive ? 'border-indigo-400 ring-2 ring-indigo-200' : 'border-indigo-200/80'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-gray-500">Papaguara Sellers</span>
              <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200 whitespace-nowrap">
                {sellerInvoices.length} seller
              </span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-2">{fmt(totalUnpaidSellers)}</p>
            <p className="text-[11px] text-indigo-700 mt-1">Bilanci i rishitësve</p>
          </button>

          <button
            type="button"
            onClick={() => toggleStatusFilter('paid')}
            title="Filtro: fatura të paguara"
            className={`text-left bg-white rounded-2xl p-4 border shadow-sm cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 ${
              statusFilter === 'paid' ? 'border-emerald-400 ring-2 ring-emerald-200' : 'border-emerald-200/80'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-gray-500">Të paguara</span>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 whitespace-nowrap">
                {paidInvoicesList.length.toLocaleString('en-US')} fatura
              </span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-emerald-600 mt-2">{fmt(paidValue)}</p>
            <p className="text-[11px] text-emerald-700 mt-1">Likuiduar me sukses</p>
          </button>
        </div>
      </div>
      {importOpen && (
        <Suspense fallback={null}>
          <ImportExcelModal
            entity="invoices"
            onImport={handleImportInvoices}
            onClose={() => setImportOpen(false)}
          />
        </Suspense>
      )}

      {/* Bulk delete confirmation modal */}
      {confirmDelAll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6 max-w-sm">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Trash2 size={24} className="text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 dark:text-white text-lg">Fshi {selected.size} {selected.size === 1 ? 'faturën' : 'faturat'}?</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Kjo veprim nuk mund të rikthehej.</p>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 mb-6 border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                <span className="font-semibold">{selected.size}</span> {selected.size === 1 ? 'fatura' : 'fatura'} do të fshihen përgjithmonë.
              </p>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDelAll(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                Anulo
              </button>
              <button
                onClick={handleDeleteSelected}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                Po, fshi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Single invoice delete confirmation modal */}
      {deletingInvoiceId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6 max-w-sm">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Trash2 size={24} className="text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 dark:text-white text-lg">Fshi faturën?</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Kjo veprim nuk mund të rikthehej.</p>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 mb-6 border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Fatura <span className="font-semibold">{deletingInvoiceId}</span> do të fshihet përgjithmonë.
              </p>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeletingInvoiceId(null)}
                className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                Anulo
              </button>
              <button
                onClick={() => {
                  const inv = invoices.find(i => i.id === deletingInvoiceId)
                  setInvoices(p => p.filter(i => i.id !== deletingInvoiceId))
                  if (inv) {
                    logActivity(`Fshiu faturën ${inv.id} — ${inv.customer} €${inv.amount}`, 'Faturat')
                  }
                  showToast('Fatura u fshi')
                  setDeletingInvoiceId(null)
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                Po, fshi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters — kërkimi majtas, statusi dhe tipi si dropdown, gjithçka në një rresht */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-3 sm:p-4 mb-4">
        <div className="flex flex-wrap items-center gap-2">

          {/* Search — e para, majtas */}
          <div className="w-full sm:w-64 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-50 transition-all">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              className="bg-transparent border-none outline-none text-xs text-gray-600 w-full placeholder-gray-400"
              placeholder="Kërko me Emër, ID apo Referent..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPaginationPage(1) }}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="text-gray-400 hover:text-gray-600 flex-shrink-0 cursor-pointer p-0.5 rounded hover:bg-gray-100 transition-colors"
                title="Fshi kërkimin"
              >
                <X size={14}/>
              </button>
            )}
          </div>

          {/* Status — dropdown */}
          <select
            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-medium text-gray-600 outline-none focus:border-blue-400 cursor-pointer"
            value={statusFilter}
            onChange={e => { setStatus(e.target.value); setPaginationPage(1) }}
          >
            <option value="all">Të gjitha</option>
            <option value="paid">Paguar</option>
            <option value="pending">Pritje</option>
            <option value="overdue">Vonuar</option>
            <option value="unpaid">Papaguar (Pritje+Vonuar)</option>
            <option value="draft">Draft</option>
            <option value="void">Void</option>
          </select>

          {/* Type + per-page — dropdown */}
          <div className="flex items-center gap-2">
            <select
              className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-medium text-gray-600 outline-none focus:border-blue-400 cursor-pointer"
              value={typeFilter}
              onChange={e => { setTypeFilter(e.target.value); setPaginationPage(1) }}
            >
              <option value="all">Të gjithë</option>
              <option value="individual">👤 Klientë</option>
              <option value="reseller">🔄 Reseller</option>
            </select>
            <select
              className="hidden sm:block bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs font-medium text-gray-600 outline-none focus:border-blue-400 cursor-pointer"
              value={perPage}
              onChange={e => { setPerPage(Number(e.target.value)); setPaginationPage(1) }}
            >
              <option value={10}>10/faqe</option>
              <option value={25}>25/faqe</option>
              <option value={50}>50/faqe</option>
              <option value={100}>100/faqe</option>
              <option value={200}>200/faqe</option>
            </select>
          </div>
        </div>
      </div>

      {/* Mobile Card View - Hidden on sm+ */}
      {paged.length > 0 && (
        <div className="sm:hidden space-y-2 mb-6">
          {paged.map(inv => {
            const rawPhone = cleanPhone(getPhone(inv.customer))
            const canContact = (inv.status === 'pending' || inv.status === 'overdue') && rawPhone
            const isOverdue = inv.status === 'overdue' || (inv.due && inv.due < today && inv.status !== 'paid' && inv.status !== 'void')

            return (
              <div key={inv.id} className="bg-white border border-gray-200 rounded-lg p-3">
                <div className="flex justify-between items-start gap-2">
                  {/* Col 1: Customer + Subscription Expiry */}
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setPreview(inv.id)}>
                    <p className="font-bold text-gray-800 text-sm truncate hover:text-blue-500 transition-colors">{inv.customer}</p>
                    <p className="text-xs font-bold text-blue-500 mt-0.5">
{formatDate(inv.subscriptionExpiry)}
                    </p>
                  </div>

                  {/* Col 2: Amount + Status */}
                  <div className="text-right">
                    <p className="font-bold text-gray-800 text-sm">{fmt(inv.amount)}</p>
                    <div className="mt-0.5">
                      <StatusBadge status={isOverdue && inv.status !== 'paid' && inv.status !== 'void' ? 'overdue' : inv.status}/>
                    </div>
                  </div>

                  {/* Col 3: Actions */}
                  <RowActions
                    inv={inv}
                    canContact={canContact}
                    isOverdue={isOverdue}
                    rawPhone={rawPhone}
                    onNavigate={navigate}
                    onPayment={inv => setModal(<PaymentModal invoice={inv} onClose={closeModal}/>)}
                    onDelete={setDeletingInvoiceId}
                    isMobile={true}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Mobile pagination - hidden on sm+ */}
      {paged.length > 0 && (
        <div className="sm:hidden mb-6">
          <Pagination page={paginationPage} total={filtered.length} perPage={perPage} onChange={setPaginationPage}/>
        </div>
      )}

      {/* Table - Hidden on Mobile */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden hidden sm:block">
        {paged.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Nuk u gjetën fatura"
            sub="Ndryshoni filtrat ose krijoni një faturë të re"
            action={<button className="btn btn-primary mt-2" onClick={() => navigateWithClearPreview('invoices:create')}>+ Faturë e re</button>}
          />
        ) : (
          <>
            <div className="overflow-y-auto overflow-x-visible" style={{ maxHeight: 'calc(100vh - 270px)' }}>
              <table className="w-full min-w-[500px]" style={{ position: 'relative' }}>
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-gray-200 bg-gray-50">
                    {invoiceColumns.map(col => renderInvoiceColHeader(col, {
                      sortField, sortDir, toggleSort, draggedCol, dragOverCol,
                      onColDragStart: setDraggedCol,
                      onColDragOver: setDragOverCol,
                      onColDrop: handleColDrop,
                      onColDragEnd: () => { setDraggedCol(null); setDragOverCol(null) },
                    }))}
                    <th className="table-th text-right">Veprimet</th>
                    <th className="table-th w-8 text-center hidden sm:table-cell">
                      <input
                        type="checkbox"
                        checked={selected.size === filtered.length && filtered.length > 0}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 cursor-pointer"
                        title={selected.size === filtered.length ? "Deselekto të gjitha" : "Selekto të gjitha"}
                      />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map(inv => {
                    const rawPhone = cleanPhone(getPhone(inv.customer))
                    const canContact = (inv.status === 'pending' || inv.status === 'overdue' || inv.status === 'paid') && rawPhone
                    const isOverdue  = inv.status === 'overdue' ||
                      (inv.due && inv.due < today && inv.status !== 'paid' && inv.status !== 'void')

                    return (
                      <tr
                        key={inv.id}
                        className={`hover:bg-gray-50 transition-colors group ${selected.has(inv.id) ? 'bg-blue-50' : ''}`}
                      >
                        {invoiceColumns.map(col => renderInvoiceColCell(col, inv, { isOverdue, fmt, hasLongOverdue, getCustomerType, setPreview }))}
                        <td className="table-td" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end">
                            <RowActions
                              inv={inv}
                              canContact={canContact}
                              isOverdue={isOverdue}
                              rawPhone={rawPhone}
                              onNavigate={navigate}
                              onPayment={inv => setModal(<PaymentModal invoice={inv} onClose={closeModal}/>)}
                              onDelete={setDeletingInvoiceId}
                              isMobile={false}
                            />
                          </div>
                        </td>
                        <td className="table-td w-8 text-center hidden sm:table-cell" onClick={e => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selected.has(inv.id)}
                            onChange={() => toggleSelectInvoice(inv.id)}
                            className="w-4 h-4 cursor-pointer"
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <Pagination page={paginationPage} total={filtered.length} perPage={perPage} onChange={setPaginationPage}/>
          </>
        )}
      </div>

      {/* Customer Details Modal */}
      {selectedCustomer && (
        <CustomerDetailsModal
          customer={selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
        />
      )}

      {/* Export Panel */}
      {showExport && (
        <ExportPanel
          invoices={invoices}
          customers={customers}
          fmt={fmt}
          onClose={() => setShowExport(false)}
        />
      )}

      {/* Invoice Form Side Panel */}
      {InvoiceFormPanel}

      {/* Floating Action Button - Mobile only */}
      <div
        className="fab sm:hidden"
        onClick={() => navigateWithClearPreview('invoices:create')}
        title="Faturë e re"
      >
        <Plus size={28}/>
      </div>
    </div>
  )
}
