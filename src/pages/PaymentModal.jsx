import { useState, useRef } from 'react'
import { CreditCard, ChevronLeft, ChevronRight, AlertCircle, Pencil } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useFeatures } from '../features/useFeatures'
import { Modal, FormGroup } from '../components/UI'
import { depositedToOptions } from '../data/mockData'

/* ── horizontal chip-slider per deposit accounts ── */
function SlideSelect({ value, onChange, options }) {
  const ref = useRef(null)
  const scroll = dir => ref.current && (ref.current.scrollLeft += dir * 160)

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => scroll(-1)}
        className="flex-shrink-0 w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors"
      >
        <ChevronLeft size={14} />
      </button>

      <div
        ref={ref}
        className="flex gap-2 overflow-x-auto scroll-smooth flex-1"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {options.map(opt => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(value === opt ? '' : opt)}
            className={`flex-shrink-0 px-6 py-2 rounded-full text-sm font-semibold border transition-all whitespace-nowrap min-w-[calc(50%-8px)] ${
              value === opt
                ? 'bg-blue-500 text-white border-blue-500 shadow-sm'
                : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-500'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => scroll(1)}
        className="flex-shrink-0 w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors"
      >
        <ChevronRight size={14} />
      </button>
    </div>
  )
}

/* ── metoda e pagesës — pills ── */
function MethodPills({ value, onChange, modes }) {
  const icons = {
    'PayPal': '🅿️', 'Transfer Bankar': '🏦', 'Kesh': '💵',
    'Western Union': '🌐', 'Ria': '🔄', 'Money Gram': '💱',
    'Crypto': '₿', 'Stripe': '⚡',
  }
  return (
    <div className="flex flex-wrap gap-2">
      {modes.map(m => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
            value === m
              ? 'bg-blue-500 text-white border-blue-500 shadow-sm'
              : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-500'
          }`}
        >
          <span>{icons[m] || '💳'}</span> {m}
        </button>
      ))}
    </div>
  )
}

/* ── main modal ── */
/* invoice  = pre-selected invoice (create mode from invoice row)  */
/* payment  = existing payment to edit (edit mode)                  */
export default function PaymentModal({ invoice, payment: editPayment, onClose, isFormPage }) {
  const {
    invoices, setInvoices,
    setPayments, setExpenses,
    paymentModes, depositAccounts,
    showToast, fmt, logActivity,
  } = useApp()

  const { canUseDepositAccounts } = useFeatures()

  const isEdit = !!editPayment
  const today  = new Date().toISOString().slice(0, 10)

  /* In edit mode, find the invoice that this payment belongs to */
  const editInvoice    = isEdit ? invoices.find(i => i.id === editPayment.invoiceId) : null
  const displayInvoice = isEdit ? editInvoice : invoice   // shown in the blue header card

  /* Invoice dropdown (only used in create mode without a pre-selected invoice) */
  const [selectedInvId, setSelectedInvId] = useState(
    isEdit ? editPayment.invoiceId : (invoice?.id || '')
  )
  const selectedInv = displayInvoice || invoices.find(i => i.id === selectedInvId)

  /* Form state — pre-fill from editPayment in edit mode */
  const [form, setForm] = useState(isEdit ? {
    amount:         String(editPayment.amount),
    date:           editPayment.date,
    paidDate:       editPayment.paidDate || today,
    method:         editPayment.method,
    depositAccount: editPayment.depositAccount || '',
    fee:            editPayment.fee > 0 ? String(editPayment.fee) : '',
    reference:      editPayment.reference || '',
    depositedTo:    editPayment.depositedTo || '',
    notes:          editPayment.notes || '',
  } : {
    amount:         invoice?.amount ?? '',
    date:           today,
    paidDate:       today,
    method:         paymentModes[0],
    depositAccount: '',
    fee:            '',
    reference:      '',
    depositedTo:    '',
    notes:          '',
  })

  const [err, setErr] = useState('')
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const unpaidInvoices = invoices.filter(i => {
    // Shfaq faturat e paguara totalisht ose në pritje/pjesërisht
    return i.status !== 'paid' && i.status !== 'draft'
  })

  const save = () => {
    if (!selectedInv)
      { setErr('Zgjidh faturën.'); return }
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0)
      { setErr('Shuma duhet të jetë numër pozitiv.'); return }

    // Deposit fields are required only if feature is enabled
    if (canUseDepositAccounts && !form.depositedTo)
      { setErr('Zgjidh te kush depozitohet.'); return }

    const fee = form.fee === '' ? 0 : Number(form.fee)
    const net = Number(form.amount) - fee

    if (isEdit) {
      /* ── UPDATE existing payment ── */
      setPayments(prev => prev.map(p =>
        p.id === editPayment.id
          ? {
              ...p,
              amount:         Number(form.amount),
              fee,
              net,
              date:           form.date,
              method:         form.method,
              depositAccount: form.depositAccount,
              reference:      form.reference,
              depositedTo:    form.depositedTo,
              notes:          form.notes,
            }
          : p
      ))
      logActivity(`Përditësoi pagesën ${editPayment.id} — ${editPayment.customer} €${Number(form.amount)}`, 'Pagesat')
      showToast(`Pagesa u përditësua! Neto: ${fmt(net)} ✓`)
      onClose()
      return
    }

    /* ── CREATE new payment ── */
    const payment = {
      id:             `PAY-${Date.now()}`,
      invoiceId:      selectedInv.id,
      customer:       selectedInv.customer,
      amount:         Number(form.amount),
      fee,
      net,
      date:           form.date,
      paidDate:       form.paidDate,
      method:         form.method,
      depositAccount: form.depositAccount,
      reference:      form.reference,
      depositedTo:    form.depositedTo,
      notes:          form.notes,
    }

    /* 1 — regjistro pagesën */
    setPayments(prev => [payment, ...prev])
    logActivity(`Regjistroi pagesën ${payment.id} — ${selectedInv.customer} €${Number(form.amount)}`, 'Pagesat')

    /* 2 — kalkuloj shumin totale të paguar për këtë faturë */
    // Përfshirë pagesën e re që sapo u regjistrua
    setInvoices(prev => prev.map(i => {
      if (i.id !== selectedInv.id) return i

      // Kalkuloj shumin e paguar = pagesa e re + shuma tashmë e paguar
      const newPaidAmount = (i.paidAmount || 0) + Number(form.amount)
      const invoiceTotal = i.amount

      // Përcaktoj statusin:
      // - Nëse pagesa >= shuma totale: 'paid' (e paguar)
      // - Nëse pagesa > 0 e < shuma totale: 'partial' (pjesërisht e paguar)
      // - Nëse pagesa = 0: 'pending' (në pritje)
      let status = 'pending'
      if (newPaidAmount >= invoiceTotal) {
        status = 'paid'
      } else if (newPaidAmount > 0) {
        status = 'partial'
      }

      // Add paidDate when invoice becomes fully paid
      const updates = { ...i, paidAmount: newPaidAmount, status }
      if (status === 'paid' && !i.paidDate) {
        updates.paidDate = form.paidDate
      }
      return updates
    }))

    /* 3 — krijo shpenzim automatikisht nëse ka fee */
    if (fee > 0) {
      setExpenses(prev => [{
        id:            `EXP-${Date.now() + 1}`,
        date:          form.date,
        type:          'Pagesa tjera',
        vendor:        form.method,
        paidFrom:      form.depositAccount || '',
        reference:     `Fee transaksioni — ${form.method} (${selectedInv.id})`,
        paidBy:        form.depositedTo,
        recurring:     false,
        recurringFreq: '',
        amount:        fee,
      }, ...prev])
    }

    showToast(`Pagesa u regjistrua! Neto: ${fmt(net)} ✓`)
    onClose()
  }

  return (
    <Modal
      title={
        <span className="flex items-center gap-2">
          {isEdit
            ? <Pencil size={18} className="text-blue-500" />
            : <CreditCard size={18} className="text-emerald-500" />}
          {isEdit ? 'Ndrysho Pagesën' : 'Regjistro Pagesën'}
        </span>
      }
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-outline" onClick={onClose}>Anulo</button>
          <button
            className={`btn gap-2 text-white ${
              isEdit
                ? 'bg-blue-500 hover:bg-blue-600'
                : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
            onClick={save}
          >
            {isEdit
              ? <><Pencil size={15} /> Ruaj ndryshimet</>
              : <><CreditCard size={15} /> Konfirmo Pagesën</>}
          </button>
        </>
      }
    >
      {err && (
        <div className="flex items-center gap-2 text-xs text-blue-500 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 mb-4">
          <AlertCircle size={14} /> {err}
        </div>
      )}

      {/* Edit-mode info banner */}
      {isEdit && (
        <div className="flex items-center gap-2 text-xs text-blue-500 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 mb-4">
          ✏️ Duke ndryshuar pagesën ekzistuese. Shënim: ndryshimi i fee nuk përditëson automatikisht shpenzimet e krijuara.
        </div>
      )}

      {/* Fatura */}
      {displayInvoice ? (
        <div className="flex items-center justify-between bg-blue-50 rounded-xl px-4 py-3 mb-4">
          <div>
            <p className="text-xs text-blue-400 font-semibold uppercase tracking-wide">Fatura</p>
            <p className="font-bold text-blue-600 text-sm mt-0.5">
              {displayInvoice.id} — {displayInvoice.customer}
            </p>
          </div>
          <span className="font-bold text-blue-500 text-lg">{fmt(displayInvoice.amount)}</span>
        </div>
      ) : (
        <FormGroup label="Zgjidh faturën *">
          <select
            className="form-control"
            value={selectedInvId}
            onChange={e => {
              setSelectedInvId(e.target.value)
              const inv = invoices.find(i => i.id === e.target.value)
              if (inv) set('amount', inv.amount)
            }}
          >
            <option value="">— Zgjidh faturën —</option>
            {unpaidInvoices.map(i => (
              <option key={i.id} value={i.id}>
                {i.id} · {i.customer} · {fmt(i.amount)}
              </option>
            ))}
          </select>
        </FormGroup>
      )}

      {/* Shuma + Data */}
      <div className="grid grid-cols-2 gap-4">
        <FormGroup label="Shuma e paguar *">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm select-none">€</span>
            <input
              className="form-control pl-7"
              type="number" min="0" step="0.01"
              value={form.amount}
              onChange={e => set('amount', e.target.value)}
              placeholder="0.00"
            />
          </div>
        </FormGroup>
        <FormGroup label="Data e pagesës">
          <input
            className="form-control"
            type="date"
            value={form.date}
            onChange={e => set('date', e.target.value)}
          />
        </FormGroup>
      </div>

      {/* Data e pagimit (kur u pagua) */}
      <FormGroup label="Data e pagimit (kur u pagua faktikisht)">
        <input
          className="form-control"
          type="date"
          value={form.paidDate}
          onChange={e => set('paidDate', e.target.value)}
          title="Data kur u pagua faktikisht - zëvendësohet automatikisht me datën e sotme kur regjistrohet pagesa"
        />
        <p className="text-xs text-gray-400 mt-1">Auto-set sot, por mund ta ndryshosh manualisht</p>
      </FormGroup>

      {/* Metoda e pagesës */}
      <FormGroup label="Metoda e pagesës">
        <MethodPills
          value={form.method}
          onChange={v => set('method', v)}
          modes={paymentModes}
        />
      </FormGroup>

      {/* Depozituar te — dropdown - Only for organizations with feature enabled */}
      {canUseDepositAccounts && (
        <FormGroup label="Depozituar te">
          <select
            className="form-control"
            value={form.depositAccount}
            onChange={e => set('depositAccount', e.target.value)}
          >
            <option value="">— Zgjidh llogarin —</option>
            {depositAccounts.map(acc => (
              <option key={acc} value={acc}>
                💰 {acc}
              </option>
            ))}
          </select>
        </FormGroup>
      )}

      {/* Fee + Referenca */}
      <div className="grid grid-cols-2 gap-4">
        <FormGroup label="Fee transaksioni (€)">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm select-none">€</span>
            <input
              className="form-control pl-7"
              type="number" min="0" step="0.01"
              value={form.fee}
              onChange={e => set('fee', e.target.value)}
              placeholder="0.00"
            />
          </div>
          {form.fee > 0 && (
            <p className="text-xs text-amber-500 mt-1">
              {isEdit
                ? '⚠ Ndryshimi nuk përditëson shpenzimet ekzistuese'
                : '⚠ Do regjistrohet si shpenzim automatikisht'}
            </p>
          )}
        </FormGroup>
        <FormGroup label="Referenca (kush pranoi)">
          <input
            className="form-control"
            value={form.reference}
            onChange={e => set('reference', e.target.value)}
            placeholder="p.sh. Ardit Krasniqi"
          />
        </FormGroup>
      </div>

      {/* Live net amount */}
      {form.amount > 0 && (
        <div className="grid grid-cols-3 gap-3 my-1 text-center">
          <div className="bg-gray-50 rounded-xl py-3">
            <p className="text-xs text-gray-400 mb-1">Shuma</p>
            <p className="font-bold text-gray-700">{fmt(Number(form.amount) || 0)}</p>
          </div>
          <div className="bg-amber-50 rounded-xl py-3">
            <p className="text-xs text-gray-400 mb-1">Fee</p>
            <p className="font-bold text-amber-500">- {fmt(Number(form.fee) || 0)}</p>
          </div>
          <div className="bg-emerald-50 rounded-xl py-3">
            <p className="text-xs text-gray-400 mb-1">Neto</p>
            <p className="font-bold text-emerald-600">
              {fmt((Number(form.amount) || 0) - (Number(form.fee) || 0))}
            </p>
          </div>
        </div>
      )}

      {/* Depozituar tek — slide select (cards) - Only for organizations with feature enabled */}
      {canUseDepositAccounts && (
        <FormGroup label="Depozituar tek *">
          <SlideSelect
            value={form.depositedTo}
            onChange={v => set('depositedTo', v)}
            options={depositedToOptions}
          />
          {form.depositedTo && (
            <p className="text-xs text-blue-500 mt-1.5 font-medium">✓ {form.depositedTo}</p>
          )}
        </FormGroup>
      )}

      {/* Shënime */}
      <FormGroup label="Shënime (opsionale)">
        <textarea
          className="form-control resize-none"
          rows={2}
          value={form.notes}
          onChange={e => set('notes', e.target.value)}
          placeholder="Çdo shënim shtesë..."
        />
      </FormGroup>
    </Modal>
  )
}
