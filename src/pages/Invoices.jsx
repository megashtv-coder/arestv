import { useState, useEffect, lazy, Suspense } from 'react'
import {
  FileText, Download, Pencil, Trash2, CreditCard,
  MessageCircle, Send, XCircle, X, MessageSquare,
  Search, Plus, LayoutList, Columns, AlertTriangle, FileSpreadsheet,
  MoreVertical, Edit3,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { formatDate } from '../utils/dateFormat'
import { StatusBadge, EmptyState, Pagination } from '../components/UI'
import FormPageWrapper from '../components/FormPageWrapper'
import InvoiceModal from './InvoiceModal'
import PaymentModal from './PaymentModal'
import { downloadTemplate } from '../components/ImportExcelModal'
const ImportExcelModal = lazy(() => import('../components/ImportExcelModal'))
import CustomerDetailsModal from './CustomerDetailsModal'
import MessageLogService from '../services/MessageLogService'

const STATUS_ORDER = { overdue: 0, pending: 1, partial: 1.5, draft: 2, paid: 3, void: 4 }

/* ── helpers ─────────────────────────────────────────── */
const cleanPhone = p => (p || '').replace(/[\s+\-()]/g, '')

function buildReminderMsg(inv) {
  const firstName = (inv.customer || '').split(' ')[0]
  const today = new Date().toISOString().slice(0, 10)
  const late = inv.status === 'overdue' ||
    (inv.due && inv.due < today && inv.status !== 'paid' && inv.status !== 'void')
  if (late)
    return `Pershendetje ${firstName}!\nFatura juaj me vlere €${inv.amount} ka kaluar afatin e pageses (${formatDate(inv.due)}).\nJu lutem kryeni pagesen urgjentisht per te shmangur nderprerjene sherbimit tuaj.\nFaleminderit!\nMe respekt, PREDATOR - MEGA SH TV`
  return `Pershendetje ${firstName}!\nFatura juaj me vlere €${inv.amount} eshte ne pritje te pageses deri me date ${formatDate(inv.due)}.\nJu lutem kryeni pagesen ne kohe.\nFaleminderit!\nMe respekt, PREDATOR - MEGA SH TV`
}

function buildInvoiceMsg(inv) {
  return `Fatura per: ${inv.customer}\nData e abonimit: ${inv.date || '—'}\nData e skadimit te abonimit: ${inv.subscriptionExpiry || '—'}\nAfati i pageses: ${inv.due || '—'}\nPer pagese: €${inv.amount}`
}

/* ── compact invoice card (left panel list) ─────────── */
function InvoiceListCard({ inv, selected, onClick }) {
  const { fmt, customers } = useApp()
  const isReseller = customers.find(c => c.name === inv.customer)?.type === 'reseller'
  const diff = inv.due
    ? Math.round((new Date(inv.due) - Date.now()) / 86_400_000)
    : null

  let dueLabel, dueCls
  if      (inv.status === 'paid')  { dueLabel = 'PAGUAR';         dueCls = 'text-emerald-600' }
  else if (inv.status === 'partial') {
    // Shfaq shumin e paguar dhe të mbetur për faturat e paguara pjesërisht
    const paid = inv.paidAmount || 0
    const remaining = inv.amount - paid
    const paidFormatted = Math.round(paid * 100) / 100
    const remainingFormatted = Math.round(remaining * 100) / 100
    dueLabel = `€${paidFormatted} / €${remainingFormatted}`
    dueCls = 'text-blue-600 font-semibold'
  }
  else if (inv.status === 'void')  { dueLabel = 'VOID';           dueCls = 'text-gray-400 line-through' }
  else if (inv.status === 'draft') { dueLabel = 'DRAFT';          dueCls = 'text-gray-400' }
  else if (diff === null)          { dueLabel = '—';              dueCls = 'text-gray-400' }
  else if (diff < 0)               { dueLabel = 'VONUAR';         dueCls = 'text-red-500' }
  else if (diff === 0)             { dueLabel = 'SOT SKADON';     dueCls = 'text-orange-500 font-black' }
  else if (diff === 1)             { dueLabel = 'NGA 1 DITË';     dueCls = 'text-amber-500' }
  else                             { dueLabel = `NGA ${diff} DITË`; dueCls = 'text-amber-500' }

  return (
    <div
      className={`px-4 py-3 cursor-pointer border-b border-gray-100 transition-all ${
        selected
          ? 'bg-blue-50 border-l-[3px] border-l-blue-500'
          : 'hover:bg-gray-50 border-l-[3px] border-l-transparent'
      }`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <p className="font-semibold text-gray-800 text-sm truncate">{inv.customer}</p>
            {isReseller && (
              <span className="text-[9px] font-bold px-1 py-0.5 bg-purple-100 text-purple-600 rounded flex-shrink-0">R</span>
            )}
          </div>
          <p className="text-[11px] text-gray-400 mt-0.5">{inv.id} · {formatDate(inv.date)}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="font-bold text-gray-800 text-sm">{fmt(inv.amount)}</p>
          <p className={`text-[10px] font-bold mt-0.5 ${dueCls}`}>{dueLabel}</p>
        </div>
      </div>
    </div>
  )
}

/* ── invoice side panel (right panel) ───────────────── */
function InvoiceSidePanel({ invId, onClose, setSelectedCustomer }) {
  const {
    invoices, setInvoices,
    customers,
    payments, setPayments,
    setModal, closeModal,
    showToast, fmt, logActivity,
  } = useApp()

  const inv = invoices.find(i => i.id === invId)
  if (!inv) return null

  const [confirmVoid,       setConfirmVoid]       = useState(false)
  const [confirmDel,        setConfirmDel]        = useState(false)
  const [confirmDelPayment, setConfirmDelPayment] = useState(false)
  const [comment,           setComment]           = useState('')

  const custObj  = customers.find(c => c.name === inv.customer)
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
    const remainingAmount = allPaymentsForInvoice
      .filter(p => p.id !== linkedPayment.id)
      .reduce((sum, p) => sum + Number(p.amount), 0)

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

  const TB = 'flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors'

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Action toolbar ── */}
      <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-gray-100 bg-white flex-wrap">
        {/* Mobile back button */}
        <button className="md:hidden icon-btn mr-1 text-blue-600" onClick={onClose} title="Kthehu">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <div className="flex items-center gap-2 mr-1">
          <span className="font-bold text-gray-800 text-sm">{inv.id}</span>
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
            className={`${TB} border-blue-200 text-blue-600 hover:bg-blue-50`}
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
            className={`${TB} ${isOverdue ? 'border-orange-200 text-orange-600 hover:bg-orange-50' : 'border-green-200 text-green-600 hover:bg-green-50'}`}
          >
            <MessageCircle size={13}/> WhatsApp{isOverdue ? ' 🔔' : ''}
          </a>
        )}

        {canContact && (
          <a
            href={`https://t.me/+${rawPhone}`}
            target="_blank" rel="noopener noreferrer"
            className={`${TB} border-sky-200 text-sky-600 hover:bg-sky-50`}
          >
            <Send size={13}/> Telegram
          </a>
        )}

        {canPay && (
          <button
            className={`${TB} border-emerald-200 text-emerald-600 hover:bg-emerald-50`}
            onClick={() => setModal(<PaymentModal invoice={inv} onClose={closeModal}/>)}
          >
            <CreditCard size={13}/> Regjistro Pagesën
          </button>
        )}

        {canVoid && (
          <button
            className={`${TB} border-amber-200 text-amber-600 hover:bg-amber-50`}
            onClick={() => setConfirmVoid(true)}
          >
            <XCircle size={13}/> Void
          </button>
        )}

        <button
          className={`${TB} border-red-200 text-red-500 hover:bg-red-50`}
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
        <div className="flex items-center gap-3 bg-red-50 border-b border-red-100 px-4 py-2 text-xs">
          <span className="text-red-700 font-semibold">Fshij përgjithmonë faturën {inv.id}?</span>
          <button className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg" onClick={doDelete}>Po, fshij</button>
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
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex justify-between items-start px-6 pt-6 pb-3">
            <div>
              {inv.country && (
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-400 text-sm">🌍</span>
                  <span className="text-sm font-semibold text-gray-600">{inv.country}</span>
                </div>
              )}
            </div>
            <div className="text-right">
              <h2 className="text-2xl font-light tracking-[0.22em] text-blue-700 uppercase">Faturë</h2>
              <p className="text-xs font-bold text-gray-500 mt-0.5">Numri i faturës {inv.id}</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-between gap-4 sm:gap-6 px-6 pb-5">
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-1.5">Fatura për</p>
              <button
                onClick={() => setSelectedCustomer(custObj)}
                className="font-bold text-blue-700 text-base leading-tight hover:text-blue-900 hover:underline cursor-pointer transition-colors text-left"
              >
                {inv.customer}
              </button>
              {inv.country && <p className="text-xs text-gray-500 mt-1">{inv.country}</p>}
              {inv.email   && <p className="text-xs text-gray-400 mt-0.5">{inv.email}</p>}
              {custObj?.phone && <p className="text-xs text-gray-400 mt-0.5">📞 {custObj.phone}</p>}
            </div>
            <div className="text-left sm:text-right sm:min-w-[190px]">
              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-1">Totali për pagesë</p>
              <p className="text-[1.7rem] font-bold text-gray-800 leading-tight mb-3">{fmt(inv.amount)}</p>

              {/* Shfaq shumin e paguar dhe balancën për faturat e paguara pjesërisht */}
              {inv.status === 'partial' && inv.paidAmount > 0 && (
                <div className="mb-3 p-2 bg-blue-50 rounded-lg border border-blue-100">
                  <div className="flex items-center justify-between sm:justify-end gap-4 text-xs mb-1.5">
                    <span className="text-blue-600 font-semibold">Paguar:</span>
                    <span className="font-bold text-blue-700 w-24 text-right">{fmt(inv.paidAmount)}</span>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-4 text-xs">
                    <span className="text-amber-600 font-semibold">Mbetur:</span>
                    <span className="font-bold text-amber-700 w-24 text-right">{fmt(inv.amount - inv.paidAmount)}</span>
                  </div>
                  {/* Indikatori i progresit */}
                  <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all"
                      style={{ width: `${(inv.paidAmount / inv.amount) * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}

              <div className="space-y-1 text-xs">
                <div className="flex items-center justify-between sm:justify-end gap-4">
                  <span className="text-gray-400">Data e faturës:</span>
                  <span className="font-medium text-gray-700 w-24 text-right">{formatDate(inv.date)}</span>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-4">
                  <span className="text-gray-400">Afati i pagesës:</span>
                  <span className={`font-semibold w-24 text-right ${isOverdue ? 'text-red-500' : 'text-gray-700'}`}>
{formatDate(inv.due)}
                  </span>
                </div>
                {inv.subscriptionExpiry && (
                  <div className="flex items-center justify-between sm:justify-end gap-4">
                    <span className="text-gray-400">Skadimi:</span>
                    <span className="font-medium text-blue-700 w-24 text-right">{formatDate(inv.subscriptionExpiry)}</span>
                  </div>
                )}
                {inv.notifyDate && (
                  <div className="flex items-center justify-between sm:justify-end gap-4">
                    <span className="text-gray-400">🔔 Njoftim:</span>
                    <span className="font-medium text-orange-600 w-24 text-right">{inv.notifyDate}</span>
                  </div>
                )}
              </div>
              <div className="mt-2 flex justify-start sm:justify-end">
                <StatusBadge status={isOverdue && inv.status !== 'paid' && inv.status !== 'void' ? 'overdue' : inv.status}/>
              </div>
            </div>
          </div>

          <div className="px-6 pb-4 overflow-x-auto">
            <table className="w-full text-xs border-collapse min-w-[380px]">
              <thead>
                <tr className="bg-blue-600 text-white">
                  <th className="text-center px-3 py-2.5 rounded-tl-lg w-8">#</th>
                  <th className="text-left px-3 py-2.5">Artikulli &amp; Përshkrimi</th>
                  <th className="text-right px-3 py-2.5 w-14">Sasia</th>
                  <th className="text-right px-3 py-2.5 w-20">Çmimi</th>
                  <th className="text-right px-3 py-2.5 rounded-tr-lg w-24">Shuma</th>
                </tr>
              </thead>
              <tbody>
                {inv.items.map((item, i) => (
                  <tr key={i} className="border-b border-gray-100 hover:bg-gray-50/50">
                    <td className="px-3 py-2.5 text-center text-gray-400">{i + 1}</td>
                    <td className="px-3 py-2.5">
                      <p className="text-gray-700 font-medium">{item.desc}</p>
                      {item.note && <p className="text-xs text-gray-400 italic mt-0.5">{item.note}</p>}
                    </td>
                    <td className="px-3 py-2.5 text-right text-gray-600">{item.qty}</td>
                    <td className="px-3 py-2.5 text-right text-gray-600">{fmt(item.price)}</td>
                    <td className="px-3 py-2.5 text-right font-bold text-gray-800">{fmt(item.qty * item.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-end mt-3 pt-3 border-t-2 border-blue-200">
              <div className="flex items-center gap-10 text-sm">
                <span className="font-bold text-blue-700">Totali</span>
                <span className="font-bold text-gray-800 text-base">{fmt(inv.amount)}</span>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 px-6 py-3 text-center">
            <p className="text-xs text-blue-500 font-medium">Faleminderit për besimin tuaj!</p>
          </div>
        </div>

        {linkedPayment && (
          <div className="bg-emerald-50 rounded-xl border border-emerald-100 p-4">
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                <CreditCard size={13}/> Pagesa e regjistruar
              </p>
              <div className="flex items-center gap-1">
                <button
                  className="icon-btn text-blue-400 hover:bg-blue-50"
                  title="Ndrysho pagesën"
                  onClick={() => setModal(<PaymentModal payment={linkedPayment} onClose={closeModal}/>)}
                >
                  <Pencil size={13}/>
                </button>
                {confirmDelPayment ? (
                  <div className="flex items-center gap-1">
                    <button className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded" onClick={doDeletePayment}>Po</button>
                    <button className="px-2 py-0.5 border border-gray-200 text-gray-600 text-xs font-bold rounded hover:bg-gray-50" onClick={() => setConfirmDelPayment(false)}>Jo</button>
                  </div>
                ) : (
                  <button
                    className="icon-btn text-red-400 hover:bg-red-50"
                    title="Fshij pagesën"
                    onClick={() => setConfirmDelPayment(true)}
                  >
                    <Trash2 size={13}/>
                  </button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
              <div><p className="text-gray-400 mb-0.5">Data</p><p className="font-semibold text-gray-700">{linkedPayment.date}</p></div>
              <div><p className="text-gray-400 mb-0.5">Shuma</p><p className="font-bold text-emerald-600">{fmt(linkedPayment.amount)}</p></div>
              <div><p className="text-gray-400 mb-0.5">Metoda</p><p className="font-semibold text-gray-700">{linkedPayment.method}</p></div>
              <div>
                <p className="text-gray-400 mb-0.5">Tek</p>
                <p className={`font-bold ${linkedPayment.depositedTo === 'Enndy' ? 'text-blue-600' : 'text-purple-600'}`}>
                  {linkedPayment.depositedTo}
                </p>
              </div>
            </div>
            {linkedPayment.fee > 0 && (
              <p className="text-[11px] text-amber-600 mt-2 text-center">
                Fee: -{fmt(linkedPayment.fee)} · Neto: {fmt(linkedPayment.net)}
              </p>
            )}
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
            <MessageSquare size={12}/> Komentet e stafit
          </h4>
          {(inv.comments || []).length === 0 ? (
            <p className="text-xs text-gray-300 italic mb-3">Nuk ka komente ende.</p>
          ) : (
            <div className="space-y-2.5 mb-3">
              {(inv.comments || []).map((c, i) => (
                <div key={i} className="flex gap-2">
                  <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center text-xs font-bold text-blue-600 flex-shrink-0 mt-0.5">
                    {c.author[0]}
                  </div>
                  <div className="flex-1 bg-gray-50 rounded-xl px-3 py-2">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-semibold text-gray-700">{c.author}</span>
                      <span className="text-[10px] text-gray-400">{c.date}</span>
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed">{c.text}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <textarea
              className="form-control text-xs resize-none flex-1"
              rows={2}
              placeholder="Shto koment rreth kësaj fature… (Enter = dërgo)"
              value={comment}
              onChange={e => setComment(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addComment() }
              }}
            />
            <button
              className="self-end btn btn-primary btn-sm text-xs px-3 py-1.5 flex items-center gap-1"
              onClick={addComment}
              disabled={!comment.trim()}
            >
              <Send size={12}/> Dërgo
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════
   Kanban Board
══════════════════════════════════════════════════════════ */
function KanbanCard({ inv, onOpen }) {
  const { fmt, customers, setModal, closeModal } = useApp()
  const custObj  = customers.find(c => c.name === inv.customer)
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

function KanbanBoard({ invoices, setPreview }) {
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
                <KanbanCard key={inv.id} inv={inv} onOpen={id => setPreview(id)} />
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
    showToast, fmt,
    currentOrgId, currentOrg,
    page, navigate, logActivity,
  } = useApp()

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
    const headerSearch = localStorage.getItem('xflow_invoice_search')
    localStorage.removeItem('xflow_invoice_search') // Clear it after reading
    return headerSearch || ''
  })
  const [statusFilter, setStatus]   = useState('all')
  const [typeFilter,   setTypeFilter]= useState('all')   // 'all' | 'reseller' | 'individual'
  const [paginationPage,  setPaginationPage] = useState(1)
  const [perPage,      setPerPage]  = useState(50)
  const [sortField,    setSortField]= useState('id')
  const [sortDir,      setSortDir]  = useState('desc')
  const [preview,      setPreview]  = useState(null)
  const [viewMode,     setViewMode] = useState('table')
  const [importOpen,   setImportOpen] = useState(false)
  const [openDropdown, setOpenDropdown] = useState(null) // Track which row's dropdown is open
  const [selectedCustomer, setSelectedCustomer] = useState(null) // Customer details modal
  const [selected,     setSelected] = useState(new Set()) // Selected invoices for bulk delete
  const [confirmDelAll, setConfirmDelAll] = useState(false) // Confirmation dialog for bulk delete
  const [deletingInvoiceId, setDeletingInvoiceId] = useState(null) // Track which invoice is being deleted from dropdown

  const getCustomerType = name =>
    customers.find(c => c.name === name)?.type || 'individual'

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

  const filtered = invoices.filter(i => {
    // Status filter - special handling for 'overdue'
    if (statusFilter !== 'all') {
      if (statusFilter === 'overdue') {
        // Overdue includes: explicit 'overdue' status OR pending with past due date
        const isOverdue = i.status === 'overdue' || (i.status === 'pending' && i.due && i.due < today)
        if (!isOverdue) return false
      } else {
        if (i.status !== statusFilter) return false
      }
    }

    if (typeFilter === 'reseller'   && getCustomerType(i.customer) !== 'reseller')   return false
    if (typeFilter === 'individual' && getCustomerType(i.customer) === 'reseller')    return false
    if (search) {
      const searchLower = search.toLowerCase()
      const matchCustomer = i.customer.toLowerCase().includes(searchLower)
      const matchId = i.id.includes(search)
      const matchReferent = i.referent && i.referent.toLowerCase().includes(searchLower)
      if (!matchCustomer && !matchId && !matchReferent) return false
    }
    return true
  })

  const toggleSort = field => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
    setPaginationPage(1)
  }

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0
    if      (sortField === 'id')       cmp = a.id.localeCompare(b.id)
    else if (sortField === 'customer') cmp = a.customer.localeCompare(b.customer)
    else if (sortField === 'amount')   cmp = a.amount - b.amount
    else if (sortField === 'status')   cmp = (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9)
    return sortDir === 'asc' ? cmp : -cmp
  })

  const getPhone = name => {
    const c = customers.find(c => c.name === name)
    return c?.phone || ''
  }

  // Check if customer has invoices overdue more than 3 weeks (21 days)
  const hasLongOverdue = (customerName) => {
    const today = new Date()
    return invoices.some(inv => {
      if (inv.customer !== customerName || inv.status === 'paid' || inv.status === 'void') return false
      if (!inv.due) return false
      const dueDate = new Date(inv.due)
      const daysOverdue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24))
      return daysOverdue > 21  // More than 3 weeks
    })
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setOpenDropdown(null)
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  /* ── SPLIT LAYOUT (when a preview is selected) ── */
  if (preview) {
    return (
      <div
        className="-m-3 sm:-m-5 md:-m-6 flex overflow-hidden bg-gray-50"
        style={{ height: 'calc(100vh - 56px)' }}
      >
        {/* Left: invoice list — hidden on mobile (show only detail panel) */}
        <div className="hidden md:flex w-[340px] flex-shrink-0 border-r border-gray-200 flex-col overflow-hidden bg-white">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <div>
              <p className="font-bold text-sm text-gray-800">Të gjitha faturat</p>
              <p className="text-[11px] text-gray-400">{filtered.length} rezultate</p>
            </div>
            <button
              className="flex items-center gap-1 btn btn-primary btn-sm text-xs px-2.5 py-1.5"
              onClick={() => navigate('invoices:create')}
            >
              <Plus size={12}/> Faturë
            </button>
          </div>

          <div className="px-3 py-2 border-b border-gray-100">
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5
                            focus-within:border-blue-400 focus-within:bg-white transition-all">
              <Search size={12} className="text-gray-400 flex-shrink-0"/>
              <input
                className="bg-transparent border-none outline-none text-xs text-gray-600 w-full placeholder-gray-400"
                placeholder="Kërko..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search && <button onClick={() => setSearch('')} className="text-gray-300 hover:text-gray-500"><X size={11}/></button>}
            </div>
          </div>

          <div className="flex gap-1 px-3 py-2 border-b border-gray-100 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {[
              { key: 'all',     label: 'Të gjitha' },
              { key: 'pending', label: 'Pritje' },
              { key: 'overdue', label: 'Vonuar' },
              { key: 'paid',    label: 'Paguar' },
              { key: 'draft',   label: 'Draft' },
              { key: 'void',    label: 'Void' },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setStatus(f.key)}
                className={`flex-shrink-0 text-xs px-2.5 py-1 rounded-full transition-colors ${
                  statusFilter === f.key
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          {/* Filter lloji klienti — panel anësor */}
          <div className="flex gap-1 px-3 py-2 border-b border-gray-100 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {[
              { key: 'all',        label: 'Të gjithë' },
              { key: 'individual', label: '👤 Klientë' },
              { key: 'reseller',   label: '🔄 Reseller' },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setTypeFilter(f.key)}
                className={`flex-shrink-0 text-xs px-2.5 py-1 rounded-full transition-colors ${
                  typeFilter === f.key
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto">
            {sorted.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-8">Asnjë faturë nuk u gjet</p>
            ) : (
              sorted.map(inv => (
                <InvoiceListCard
                  key={inv.id}
                  inv={inv}
                  selected={preview === inv.id}
                  onClick={() => setPreview(inv.id)}
                />
              ))
            )}
          </div>
        </div>

        {/* Right: invoice side panel */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <InvoiceSidePanel
            key={preview}
            invId={preview}
            onClose={() => setPreview(null)}
            setSelectedCustomer={setSelectedCustomer}
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
            >
              <Download size={16}/>
            </button>

            {/* New Invoice */}
            <button
              className="w-9 h-9 flex items-center justify-center rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors font-bold text-lg"
              onClick={() => navigate('invoices:create')}
              title="Faturë e re"
            >
              +
            </button>
          </div>
        </div>

        <KanbanBoard invoices={invoices} setPreview={setPreview} />

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
  const paged = sorted.slice((paginationPage - 1) * perPage, paginationPage * perPage)

  /* Calculate stats - based on filtered invoices */
  const pendingValue = filtered
    .filter(i => i.status === 'pending')
    .reduce((sum, i) => sum + (i.amount || 0), 0)
  const overdueValue = filtered
    .filter(i => i.status === 'overdue' || (i.status === 'pending' && i.due && i.due < today))
    .reduce((sum, i) => sum + (i.amount || 0), 0)

  // Calculate total unpaid invoices for resellers from filtered data
  const sellerInvoices = filtered.filter(i => {
    const customer = customers.find(c => c.name === i.customer)
    return customer?.type === 'reseller' && (i.status === 'pending' || i.status === 'overdue')
  })
  const totalUnpaidSellers = sellerInvoices.reduce((sum, i) => sum + (i.amount || 0), 0)

  // If in form mode, show only the form
  if (isFormMode) {
    return InvoiceFormPanel
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col gap-3 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Faturat</h2>
            <p className="text-sm text-gray-400 mt-0.5">{invoices.length} fatura gjithsej</p>
          </div>

          {/* Stats in the middle - Card style for desktop */}
          <div className="hidden md:flex items-center gap-3">
            <div className="bg-amber-50 rounded-lg p-3 border border-amber-100 min-w-max">
              <p className="text-xs text-amber-600 font-medium">Në pritje</p>
              <p className="text-base font-bold text-amber-700">{fmt(pendingValue)}</p>
            </div>
            <div className="bg-red-50 rounded-lg p-3 border border-red-100 min-w-max">
              <p className="text-xs text-red-600 font-medium">Të vonuara</p>
              <p className="text-base font-bold text-red-700">{fmt(overdueValue)}</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-100 min-w-max">
              <p className="text-xs text-blue-600 font-medium">Papaguara Sellers</p>
              <p className="text-base font-bold text-blue-700">{fmt(totalUnpaidSellers)}</p>
            </div>
          </div>

        {/* Action buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Export - Icon only - Hidden on mobile */}
            <button
              className="hidden sm:flex w-9 h-9 items-center justify-center rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
              title="Eksporto faturat"
            >
              <Download size={16}/>
            </button>

            {/* Import - Icon only - Hidden on mobile */}
            <button
              className="hidden sm:flex w-9 h-9 items-center justify-center rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
              onClick={() => setImportOpen(true)}
              title="Importo Excel"
            >
              <FileSpreadsheet size={16}/>
            </button>

            {/* Delete selected - Show only when items selected */}
            {selected.size > 0 && (
              <button
                className="w-9 h-9 flex items-center justify-center rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                onClick={() => setConfirmDelAll(true)}
                title={`Fshi ${selected.size}`}
              >
                <Trash2 size={16}/>
              </button>
            )}

            {/* New Invoice - Primary button with + icon - Hidden on mobile (see FAB below) */}
            <button
              className="hidden sm:flex w-9 h-9 items-center justify-center rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors font-bold text-lg"
              onClick={() => navigate('invoices:create')}
              title="Faturë e re"
            >
              +
            </button>
          </div>
        </div>

        {/* Mobile stats (show on small screens) */}
        <div className="md:hidden flex gap-2">
          <div className="flex-1 bg-amber-50 rounded-lg p-3 border border-amber-100">
            <p className="text-xs text-amber-600 font-medium">Në pritje</p>
            <p className="text-base font-bold text-amber-700">{fmt(pendingValue)}</p>
          </div>
          <div className="flex-1 bg-red-50 rounded-lg p-3 border border-red-100">
            <p className="text-xs text-red-600 font-medium">Të vonuara</p>
            <p className="text-base font-bold text-red-700">{fmt(overdueValue)}</p>
          </div>
          <div className="flex-1 bg-blue-50 rounded-lg p-3 border border-blue-100">
            <p className="text-xs text-blue-600 font-medium">Papaguara Sellers</p>
            <p className="text-base font-bold text-blue-700">{fmt(totalUnpaidSellers)}</p>
          </div>
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
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <Trash2 size={24} className="text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 dark:text-white text-lg">Fshi {selected.size} {selected.size === 1 ? 'faturën' : 'faturat'}?</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Kjo veprim nuk mund të rikthehej.</p>
              </div>
            </div>

            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 mb-6 border border-red-200 dark:border-red-800">
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
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
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
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <Trash2 size={24} className="text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 dark:text-white text-lg">Fshi faturën?</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Kjo veprim nuk mund të rikthehej.</p>
              </div>
            </div>

            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 mb-6 border border-red-200 dark:border-red-800">
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
                  setOpenDropdown(null)
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                Po, fshi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2
                        focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-50 transition-all flex-1 min-w-[160px]">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            className="bg-transparent border-none outline-none text-sm text-gray-600 w-full placeholder-gray-400"
            placeholder="Kërko fatura..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPaginationPage(1) }}
          />
        </div>
        <select
          className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 outline-none focus:border-blue-400 cursor-pointer"
          value={statusFilter}
          onChange={e => { setStatus(e.target.value); setPaginationPage(1) }}
        >
          <option value="all">Të gjitha</option>
          <option value="paid">Paguar</option>
          <option value="pending">Pritje</option>
          <option value="overdue">Vonuar</option>
          <option value="draft">Draft</option>
          <option value="void">Void</option>
        </select>

        <select
          className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 outline-none focus:border-blue-400 cursor-pointer"
          value={typeFilter}
          onChange={e => { setTypeFilter(e.target.value); setPaginationPage(1) }}
        >
          <option value="all">Të gjithë</option>
          <option value="individual">👤 Klientë</option>
          <option value="reseller">🔄 Reseller</option>
        </select>
        <select
          className="hidden sm:block bg-white border border-gray-200 rounded-lg px-2.5 py-2 text-sm text-gray-600 outline-none focus:border-blue-400 cursor-pointer"
          value={perPage}
          onChange={e => { setPerPage(Number(e.target.value)); setPaginationPage(1) }}
        >
          <option value={25}>25/faqe</option>
          <option value={50}>50/faqe</option>
          <option value={100}>100/faqe</option>
          <option value={200}>200/faqe</option>
        </select>
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
                    <p className="font-bold text-gray-800 text-sm truncate hover:text-blue-600 transition-colors">{inv.customer}</p>
                    <p className="text-xs font-bold text-blue-600 mt-0.5">
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

                  {/* Col 3: Actions - Larger Button */}
                  <div className="relative flex-shrink-0">
                    <button
                      className="w-10 h-10 flex items-center justify-center rounded-lg bg-gray-100 text-gray-600 hover:bg-blue-600 hover:text-white transition-all duration-150"
                      onClick={e => {
                        e.stopPropagation()
                        setOpenDropdown(openDropdown === inv.id ? null : inv.id)
                      }}
                    >
                      <MoreVertical size={18}/>
                    </button>

                    {/* Dropdown */}
                    {openDropdown === inv.id && (
                      <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-xl z-50">
                        <button
                          className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 flex items-center gap-2 border-b"
                          onClick={e => {
                            e.stopPropagation()
                            navigate(`invoices:${inv.id}:edit`)
                            setOpenDropdown(null)
                          }}
                        >
                          <Pencil size={14}/> Ndrysho
                        </button>

                        {canContact && (
                          <a
                            href={`https://wa.me/${rawPhone}?text=${encodeURIComponent(buildReminderMsg(inv))}`}
                            target="_blank" rel="noopener noreferrer"
                            className={`block w-full text-left px-3 py-2 text-sm hover:bg-green-50 flex items-center gap-2 border-b ${isOverdue ? 'text-orange-600' : 'text-green-600'}`}
                            onClick={e => {
                              e.stopPropagation()
                              MessageLogService.logWhatsAppMessage(inv.customer, rawPhone, buildReminderMsg(inv), inv.id, 'prepared')
                              setOpenDropdown(null)
                            }}
                          >
                            <MessageCircle size={14}/> Pagesa WA {isOverdue && '🔔'}
                          </a>
                        )}

                        {(inv.status === 'pending' || inv.status === 'overdue') && (
                          <button
                            className="w-full text-left px-3 py-2 text-sm text-emerald-600 hover:bg-emerald-50 flex items-center gap-2 border-b"
                            onClick={e => {
                              e.stopPropagation()
                              setModal(<PaymentModal invoice={inv} onClose={closeModal}/>)
                              setOpenDropdown(null)
                            }}
                          >
                            <CreditCard size={14}/> Pagesa
                          </button>
                        )}

                        <button
                          className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                          onClick={e => {
                            e.stopPropagation()
                            setDeletingInvoiceId(inv.id)
                            setOpenDropdown(null)
                          }}
                        >
                          <Trash2 size={14}/> Fshi
                        </button>
                      </div>
                    )}
                  </div>
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
      <div className="card hidden sm:block">
        {paged.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Nuk u gjetën fatura"
            sub="Ndryshoni filtrat ose krijoni një faturë të re"
            action={<button className="btn btn-primary mt-2" onClick={() => navigate('invoices:create')}>+ Faturë e re</button>}
          />
        ) : (
          <>
            <div className="overflow-y-auto overflow-x-visible" style={{ maxHeight: 'calc(100vh - 270px)' }}>
              <table className="w-full min-w-[500px]" style={{ position: 'relative' }}>
                <thead className="sticky top-0 z-10">
                  <tr className="border-b-2 border-gray-100 bg-white">
                    <th className="table-th hidden sm:table-cell">Data</th>
                    {[
                      { key: 'id',       label: 'ID',     cls: 'hidden sm:table-cell' },
                      { key: 'customer', label: 'Klienti',cls: '' },
                      { key: 'referent', label: 'Referenti', cls: 'hidden sm:table-cell' },
                    ].map(col => (
                      <th key={col.key} className={`table-th cursor-pointer select-none hover:text-blue-600 ${col.cls}`}
                          onClick={() => toggleSort(col.key)}>
                        <span className="flex items-center gap-1">
                          {col.label}
                          <span className="text-[10px]">{sortField === col.key ? (sortDir === 'asc' ? '↑' : '↓') : <span className="text-gray-300">↕</span>}</span>
                        </span>
                      </th>
                    ))}
                    <th className="table-th sm:table-cell lg:table-cell">Skadimi Abonimit</th>
                    <th className="table-th cursor-pointer select-none hover:text-blue-600"
                        onClick={() => toggleSort('amount')}>
                      <span className="flex items-center gap-1">
                        Shuma
                        <span className="text-[10px]">{sortField === 'amount' ? (sortDir === 'asc' ? '↑' : '↓') : <span className="text-gray-300">↕</span>}</span>
                      </span>
                    </th>
                    <th className="table-th hidden lg:table-cell">Afati</th>
                    <th className="table-th cursor-pointer select-none hover:text-blue-600"
                        onClick={() => toggleSort('status')}>
                      <span className="flex items-center gap-1">
                        Statusi
                        <span className="text-[10px]">{sortField === 'status' ? (sortDir === 'asc' ? '↑' : '↓') : <span className="text-gray-300">↕</span>}</span>
                      </span>
                    </th>
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
                    const canContact = (inv.status === 'pending' || inv.status === 'overdue') && rawPhone
                    const isOverdue  = inv.status === 'overdue' ||
                      (inv.due && inv.due < today && inv.status !== 'paid' && inv.status !== 'void')
                    const msg = canContact ? encodeURIComponent(buildReminderMsg(inv)) : ''
                    const isDropdownOpen = openDropdown === inv.id

                    return (
                      <tr
                        key={inv.id}
                        className={`hover:bg-blue-50/30 transition-colors group ${selected.has(inv.id) ? 'bg-blue-100' : ''}`}
                      >
                        <td className="table-td text-gray-400 hidden sm:table-cell">{formatDate(inv.date)}</td>
                        <td className="table-td font-bold text-blue-600 text-sm hidden sm:table-cell cursor-pointer" onClick={() => setPreview(inv.id)}>{inv.id}</td>
                        <td className="table-td font-medium text-gray-800 cursor-pointer" onClick={() => setPreview(inv.id)}>
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
                        <td className="table-td text-gray-600 hidden sm:table-cell text-sm">
                          {inv.referent ? (
                            <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                              {inv.referent}
                            </span>
                          ) : (
                            <span className="text-gray-300 italic text-xs">-</span>
                          )}
                        </td>
                        <td className="table-td text-blue-600 sm:table-cell lg:table-cell text-sm font-medium">
                          {inv.subscriptionExpiry ? (
                            <span className="px-2 py-1 bg-blue-50 rounded-full text-xs">
                              {formatDate(inv.subscriptionExpiry)}
                            </span>
                          ) : (
                            <span className="text-gray-300 italic text-xs">-</span>
                          )}
                        </td>
                        <td className="table-td font-bold text-gray-800">{fmt(inv.amount)}</td>
                        <td className={`table-td hidden lg:table-cell ${isOverdue ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
                          {formatDate(inv.due)}
                        </td>
                        <td className="table-td"><StatusBadge status={isOverdue && inv.status !== 'paid' && inv.status !== 'void' ? 'overdue' : inv.status}/></td>
                        <td className="table-td relative" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end">
                            <div className="relative">
                              <button
                                className="icon-btn text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                                title="Veprimet"
                                data-invoice-id={inv.id}
                                onClick={e => {
                                  e.stopPropagation()
                                  setOpenDropdown(isDropdownOpen ? null : inv.id)
                                }}
                              >
                                <MoreVertical size={16}/>
                              </button>

                              {/* Dropdown Menu - using fixed to escape scroll container */}
                              {isDropdownOpen && (() => {
                                const buttonRect = document.querySelector(`[data-invoice-id="${inv.id}"]`)?.getBoundingClientRect()
                                return (
                                <div
                                  className="fixed w-48 bg-white border border-gray-200 rounded-lg shadow-2xl z-[9999] pointer-events-auto"
                                  style={{
                                    top: buttonRect ? buttonRect.bottom + 5 : '0',
                                    right: window.innerWidth - (buttonRect ? buttonRect.right : 0),
                                  }}
                                >
                                  <button
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 flex items-center gap-2 border-b border-gray-100"
                                    onClick={e => {
                                      e.stopPropagation()
                                      navigate(`invoices:${inv.id}:edit`)
                                      setOpenDropdown(null)
                                    }}
                                  >
                                    <Pencil size={14}/> Ndrysho
                                  </button>

                                  {canContact && (
                                    <a
                                      href={`https://wa.me/${rawPhone}?text=${msg}`}
                                      target="_blank" rel="noopener noreferrer"
                                      className={`block w-full text-left px-4 py-2 text-sm hover:bg-green-50 flex items-center gap-2 border-b border-gray-100 ${isOverdue ? 'text-orange-600' : 'text-green-600'}`}
                                      onClick={e => {
                                        e.stopPropagation()
                                        // Log reminder message as "prepared"
                                        const loggedMsg = MessageLogService.logWhatsAppMessage(inv.customer, rawPhone, buildReminderMsg(inv), inv.id, 'prepared')

                                        // Auto-mark as "sent" after 5 seconds
                                        if (loggedMsg?.id) {
                                          setTimeout(() => {
                                            MessageLogService.updateMessageStatus(loggedMsg.id, 'sent')
                                          }, 5000)
                                        }

                                        setOpenDropdown(null)
                                      }}
                                    >
                                      <MessageCircle size={14}/> Pagesa WA {isOverdue && '🔔'}
                                    </a>
                                  )}

                                  {canContact && (
                                    <a
                                      href={`https://t.me/+${rawPhone}`}
                                      target="_blank" rel="noopener noreferrer"
                                      className="block w-full text-left px-4 py-2 text-sm text-sky-600 hover:bg-sky-50 flex items-center gap-2 border-b border-gray-100"
                                      onClick={e => {
                                        e.stopPropagation()
                                        setOpenDropdown(null)
                                      }}
                                    >
                                      <Send size={14}/> Pagesa TG
                                    </a>
                                  )}

                                  {canContact && (
                                    <a
                                      href={`https://wa.me/${rawPhone}?text=${encodeURIComponent(buildInvoiceMsg(inv))}`}
                                      target="_blank" rel="noopener noreferrer"
                                      className="block w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2 border-b border-gray-100"
                                      onClick={e => {
                                        e.stopPropagation()
                                        // Log as "prepared" when button is clicked
                                        const loggedMsg = MessageLogService.logWhatsAppMessage(inv.customer, rawPhone, buildInvoiceMsg(inv), inv.id, 'prepared')

                                        // Auto-mark as "sent" after 5 seconds (assumes user sends it)
                                        if (loggedMsg?.id) {
                                          setTimeout(() => {
                                            MessageLogService.updateMessageStatus(loggedMsg.id, 'sent')
                                          }, 5000)
                                        }

                                        setOpenDropdown(null)
                                      }}
                                    >
                                      <FileText size={14}/> Dërgo faturën WA
                                    </a>
                                  )}

                                  {(inv.status === 'pending' || inv.status === 'overdue') && (
                                    <button
                                      className="w-full text-left px-4 py-2 text-sm text-emerald-600 hover:bg-emerald-50 flex items-center gap-2 border-b border-gray-100"
                                      onClick={e => {
                                        e.stopPropagation()
                                        setModal(<PaymentModal invoice={inv} onClose={closeModal}/>)
                                        setOpenDropdown(null)
                                      }}
                                    >
                                      <CreditCard size={14}/> Regjistro Pagesën
                                    </button>
                                  )}

                                  <button
                                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                    onClick={e => {
                                      e.stopPropagation()
                                      setDeletingInvoiceId(inv.id)
                                    }}
                                  >
                                    <Trash2 size={14}/> Fshi
                                  </button>
                                </div>
                                )
                              })()}
                            </div>
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

      {/* Invoice Form Side Panel */}
      {InvoiceFormPanel}

      {/* Floating Action Button - Mobile only */}
      <div
        className="fab sm:hidden"
        onClick={() => navigate('invoices:create')}
        title="Faturë e re"
      >
        <Plus size={28}/>
      </div>
    </div>
  )
}
