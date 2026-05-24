import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  FilePlus, Pencil, Search, ChevronDown, X, Plus, UserPlus, User, Users,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Modal, FormGroup } from '../components/UI'
import { countries } from '../data/mockData'

/* ─────────────────────────────────────────────────────────────
   Searchable Combobox  (portal-based, escapes modal overflow)
───────────────────────────────────────────────────────────── */
function Combobox({
  options = [], value = '', onChange, placeholder,
  getKey, getLabel, renderOption,
  onAddNew, addNewLabel = 'Shto të ri',
}) {
  const [open, setOpen]     = useState(false)
  const [search, setSearch] = useState('')
  const triggerRef          = useRef(null)
  const dropRef             = useRef(null)
  const [pos, setPos]       = useState({ top: 0, left: 0, width: 200 })

  const openDrop = () => {
    if (triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 4, left: r.left, width: r.width })
    }
    setOpen(v => !v)
  }

  useEffect(() => {
    if (!open) return
    const h = e => {
      if (!triggerRef.current?.contains(e.target) && !dropRef.current?.contains(e.target)) {
        setOpen(false); setSearch('')
      }
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  const filtered = options.filter(o =>
    getLabel(o).toLowerCase().includes(search.toLowerCase())
  )
  const selected = options.find(o => getLabel(o) === value)

  return (
    <>
      <div
        ref={triggerRef}
        className="form-control flex items-center justify-between cursor-pointer select-none gap-2 min-h-[38px]"
        onClick={openDrop}
      >
        <span className={`text-sm truncate flex-1 ${selected ? 'text-gray-800' : 'text-gray-400'}`}>
          {selected ? getLabel(selected) : placeholder}
        </span>
        <ChevronDown size={14} className={`text-gray-400 flex-shrink-0 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </div>

      {open && createPortal(
        <div
          ref={dropRef}
          style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width, zIndex: 9999 }}
          className="bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden"
        >
          <div className="p-2 bg-gray-50 border-b border-gray-100">
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-2.5 py-1.5">
              <Search size={12} className="text-gray-400 flex-shrink-0" />
              <input
                autoFocus
                className="bg-transparent outline-none text-xs w-full text-gray-700 placeholder-gray-400"
                placeholder="Kërko..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search && <button onClick={() => setSearch('')} className="text-gray-300 hover:text-gray-500"><X size={10}/></button>}
            </div>
          </div>
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 && !onAddNew && (
              <p className="text-xs text-gray-400 text-center py-4 italic">Nuk u gjet asgjë</p>
            )}
            {filtered.map((o, i) => (
              <div
                key={getKey ? getKey(o) : i}
                className={`px-3 py-2.5 cursor-pointer hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0 ${
                  getLabel(o) === value ? 'bg-blue-50' : ''
                }`}
                onClick={() => { onChange(o); setOpen(false); setSearch('') }}
              >
                {renderOption ? renderOption(o) : (
                  <span className={`text-sm ${getLabel(o) === value ? 'text-blue-700 font-semibold' : 'text-gray-700'}`}>
                    {getLabel(o)}
                  </span>
                )}
              </div>
            ))}
            {onAddNew && (
              <div
                className="px-3 py-2.5 cursor-pointer hover:bg-emerald-50 transition-colors border-t border-gray-100 flex items-center gap-2"
                onClick={() => { onAddNew(search); setOpen(false); setSearch('') }}
              >
                <UserPlus size={13} className="text-emerald-600 flex-shrink-0" />
                <span className="text-sm text-emerald-700 font-semibold">
                  {addNewLabel}
                  {search && <span className="text-emerald-500 font-normal ml-1">"{search}"</span>}
                </span>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

/* ─────────────────────────────────────────────────────────────
   Quick-Add Customer  (forma e plotë, identike me Klientët)
───────────────────────────────────────────────────────────── */
const CUST_COLORS = ['#2563eb','#7c3aed','#059669','#d97706','#dc2626','#0891b2','#be185d','#0f766e']

const FLD = 'text-[10px] text-gray-500 font-bold uppercase tracking-wide block mb-1'

function QuickAddCustomer({ initialName, onSave, onCancel }) {
  const parts = (initialName || '').trim().split(' ')
  const [form, setForm] = useState({
    type:       'individual',
    firstName:  parts[0] || '',
    lastName:   parts.slice(1).join(' ') || '',
    phone:      '',
    email:      '',
    country:    'Kosovë',
    app:        '',
    macAddress: '',
    username:   '',
    panel:      '',
    referredBy: '',
    color:      CUST_COLORS[0],
  })
  const [err, setErr] = useState('')
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const isReseller = form.type === 'reseller'

  const handleSave = () => {
    if (!form.firstName.trim()) { setErr('Emri është i detyrueshëm.'); return }
    if (!form.lastName.trim())  { setErr('Mbiemri është i detyrueshëm.'); return }
    if (!form.phone.trim())     { setErr('Numri i telefonit është i detyrueshëm.'); return }
    if (!form.country)          { setErr('Shteti është i detyrueshëm.'); return }
    onSave(form)
  }

  return (
    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-4">
      {/* Header */}
      <div className="flex items-center gap-1.5 mb-3">
        <UserPlus size={14} className="text-emerald-600" />
        <span className="text-xs font-bold text-emerald-700">Klient i ri — plotëso të dhënat</span>
      </div>

      {err && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-3">{err}</div>
      )}

      {/* Lloji */}
      <div className="mb-3">
        <label className={FLD}>Lloji i klientit *</label>
        <div className="flex gap-2">
          <button type="button" onClick={() => set('type', 'individual')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold border-2 transition-all ${
              !isReseller ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-200 bg-white text-gray-500 hover:border-blue-300'
            }`}>
            <User size={12}/> Individual
          </button>
          <button type="button" onClick={() => set('type', 'reseller')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold border-2 transition-all ${
              isReseller ? 'border-purple-600 bg-purple-600 text-white' : 'border-gray-200 bg-white text-gray-500 hover:border-purple-300'
            }`}>
            <Users size={12}/> Reseller
          </button>
        </div>
      </div>

      {/* Emri + Mbiemri */}
      <div className="grid grid-cols-2 gap-2 mb-2">
        <div>
          <label className={FLD}>Emri *</label>
          <input className="form-control text-sm bg-white" autoFocus
            value={form.firstName} onChange={e => set('firstName', e.target.value)}
            placeholder="p.sh. Ardit" />
        </div>
        <div>
          <label className={FLD}>Mbiemri *</label>
          <input className="form-control text-sm bg-white"
            value={form.lastName} onChange={e => set('lastName', e.target.value)}
            placeholder="p.sh. Krasniqi" />
        </div>
      </div>

      {/* Telefon + Email */}
      <div className="grid grid-cols-2 gap-2 mb-2">
        <div>
          <label className={FLD}>Numri i telefonit *</label>
          <input className="form-control text-sm bg-white"
            value={form.phone} onChange={e => set('phone', e.target.value)}
            placeholder="+383 44 000 000" />
        </div>
        <div>
          <label className={FLD}>Email</label>
          <input className="form-control text-sm bg-white" type="email"
            value={form.email} onChange={e => set('email', e.target.value)}
            placeholder="email@shembull.com" />
        </div>
      </div>

      {/* Shteti */}
      <div className="mb-2">
        <label className={FLD}>Shteti *</label>
        <select className="form-control text-sm bg-white"
          value={form.country} onChange={e => set('country', e.target.value)}>
          <option value="">— Zgjidh shtetin —</option>
          {countries.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Fushat sipas llojit */}
      <div className="grid grid-cols-2 gap-2 mb-2">
        {!isReseller ? (
          <>
            <div>
              <label className={FLD}>Aplikacioni që përdor</label>
              <input className="form-control text-sm bg-white"
                value={form.app} onChange={e => set('app', e.target.value)}
                placeholder="p.sh. Predator IPTV" />
            </div>
            <div>
              <label className={FLD}>MAC Adresa</label>
              <input className="form-control text-sm bg-white"
                value={form.macAddress} onChange={e => set('macAddress', e.target.value)}
                placeholder="AA:BB:CC:DD:EE:FF" />
            </div>
          </>
        ) : (
          <>
            <div>
              <label className={FLD}>Username</label>
              <input className="form-control text-sm bg-white"
                value={form.username} onChange={e => set('username', e.target.value)}
                placeholder="p.sh. ardit_reseller" />
            </div>
            <div>
              <label className={FLD}>Paneli</label>
              <input className="form-control text-sm bg-white"
                value={form.panel} onChange={e => set('panel', e.target.value)}
                placeholder="p.sh. panel1.iptv.com" />
            </div>
          </>
        )}
      </div>

      {/* Referuar nga */}
      <div className="mb-3">
        <label className={FLD}>Referuar nga</label>
        <input className="form-control text-sm bg-white"
          value={form.referredBy} onChange={e => set('referredBy', e.target.value)}
          placeholder="Emri i personit që e referoi..." />
      </div>

      {/* Ngjyra */}
      <div className="mb-4">
        <label className={FLD}>Ngjyra e avatit</label>
        <div className="flex gap-2 mt-1">
          {CUST_COLORS.map(c => (
            <button key={c} type="button" onClick={() => set('color', c)}
              className="w-6 h-6 rounded-md transition-all flex-shrink-0"
              style={{ background: c, outline: form.color === c ? `3px solid ${c}` : 'none', outlineOffset: 2 }} />
          ))}
        </div>
      </div>

      {/* Veprimet */}
      <div className="flex gap-2 justify-end pt-3 border-t border-emerald-200">
        <button className="btn btn-outline text-xs py-1.5 px-3" onClick={onCancel}>Anulo</button>
        <button className="btn btn-primary text-xs py-1.5 px-3" onClick={handleSave}>
          Shto dhe Zgjidh
        </button>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   Item Row  (inline linear layout)
───────────────────────────────────────────────────────────── */
function ItemRow({ item, products, onUpdate, onRemove, canRemove }) {
  const lineTotal = (Number(item.qty) || 0) * (Number(item.unitPrice) || 0)
  const fmtN = v => new Intl.NumberFormat('de-DE').format(v)

  return (
    <div
      className="grid items-center gap-2 py-2.5 px-3 border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors"
      style={{ gridTemplateColumns: '1fr 72px 100px 86px 28px' }}
    >
      {/* Product combobox */}
      <Combobox
        options={products}
        value={item.desc}
        onChange={p => onUpdate({ desc: p.name, unitPrice: String(p.salePrice) })}
        placeholder="Zgjedh ose shëno..."
        getKey={p => p.id}
        getLabel={p => p.name}
        renderOption={p => (
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm text-gray-800 truncate">{p.name}</span>
            <span className="text-xs font-bold text-blue-600 flex-shrink-0">€{p.salePrice}</span>
          </div>
        )}
      />

      {/* Sasia */}
      <input
        className="form-control text-center text-sm px-1 py-1.5"
        type="number" min="0.01" step="1"
        value={item.qty}
        onChange={e => onUpdate({ qty: e.target.value })}
      />

      {/* Çmimi */}
      <input
        className="form-control text-right text-sm px-2 py-1.5"
        type="number" min="0" step="0.01"
        value={item.unitPrice}
        onChange={e => onUpdate({ unitPrice: e.target.value })}
        placeholder="0.00"
      />

      {/* Line total */}
      <div className={`text-right text-sm font-bold py-1.5 px-1 ${lineTotal > 0 ? 'text-gray-800' : 'text-gray-300'}`}>
        €{fmtN(lineTotal)}
      </div>

      {/* Remove */}
      {canRemove ? (
        <button
          onClick={onRemove}
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors"
        >
          <X size={14} />
        </button>
      ) : <div />}
    </div>
  )
}

/* ── Llogarit ditët nga emri i produktit ── */
function extractMonths(name) {
  if (!name) return null
  // "12+2 muaj" → 14
  const plusMatch = name.match(/(\d+)\s*\+\s*(\d+)\s*muaj/i)
  if (plusMatch) return parseInt(plusMatch[1]) + parseInt(plusMatch[2])
  // "X muaj" ose "X Muaj"
  const m = name.match(/(\d+)\s*muaj/i)
  return m ? parseInt(m[1]) : null
}
function monthsToDays(m) {
  // 12 muaj → 365 ditë, të tjerët → muaj × 30
  return m === 12 ? 365 : m * 30
}

/* ══════════════════════════════════════════════════════════
   InvoiceModal
══════════════════════════════════════════════════════════ */
export default function InvoiceModal({ initialData }) {
  const { customers, setCustomers, items: products, setInvoices, showToast, closeModal } = useApp()

  const isEdit = !!(initialData?.id)
  const due3d  = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  /* ── Init line items from existing invoice ── */
  const initLineItems = () => {
    if (initialData?.items?.length) {
      return initialData.items.map(it => ({
        id:        Math.random(),
        desc:      it.desc  || '',
        qty:       it.qty   ?? 1,
        unitPrice: it.price != null ? String(it.price) : '',
      }))
    }
    return [{ id: Math.random(), desc: '', qty: 1, unitPrice: '' }]
  }

  const [lineItems,      setLineItems]      = useState(initLineItems)
  const [discount,       setDiscount]       = useState(initialData?.discount || { value: '', type: 'fixed' })
  const [addingCustomer, setAddingCustomer] = useState(null)   // null | { name }
  const [error,          setError]          = useState('')

  const [form, setForm] = useState({
    customer:           initialData?.customer           || '',
    due:                initialData?.due                || due3d,
    subscriptionExpiry: initialData?.subscriptionExpiry || '',
    notifyDate:         initialData?.notifyDate         || '',
    status:             initialData?.status             || 'draft',
  })

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  /* ── Computed totals ── */
  const subTotal   = lineItems.reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.unitPrice) || 0), 0)
  const discVal    = Number(discount.value) || 0
  const discAmount = discount.type === '%' ? subTotal * discVal / 100 : Math.min(discVal, subTotal)
  const total      = Math.max(0, subTotal - discAmount)
  const fmtN       = v => new Intl.NumberFormat('de-DE').format(v)

  /* ── Line item actions ── */
  const addItem    = () => setLineItems(p => [...p, { id: Math.random(), desc: '', qty: 1, unitPrice: '' }])
  const removeItem = id  => setLineItems(p => p.filter(it => it.id !== id))
  const updateItem = (id, patch) => {
    setLineItems(p => p.map(it => it.id === id ? { ...it, ...patch } : it))
    // kur selektohet produkt me muaj → auto-set datën e skadimit + njoftimin
    if (patch.desc !== undefined) {
      const months = extractMonths(patch.desc)
      if (months !== null) {
        const base = new Date(initialData?.date || new Date())
        const exp  = new Date(base)
        exp.setDate(exp.getDate() + monthsToDays(months))
        const expStr    = exp.toISOString().slice(0, 10)
        const notifyD   = new Date(exp)
        notifyD.setDate(notifyD.getDate() - 7)
        setForm(p => ({ ...p, subscriptionExpiry: expStr, notifyDate: notifyD.toISOString().slice(0, 10) }))
      }
    }
  }

  /* ── Customer ── */
  const handleAddNewCustomer = searchText => setAddingCustomer({ name: searchText })
  const confirmAddCustomer   = (formData) => {
    const fullName = `${formData.firstName.trim()} ${formData.lastName.trim()}`
    const nc = {
      id:         `CUS-Q-${Date.now()}`,
      name:       fullName,
      firstName:  formData.firstName.trim(),
      lastName:   formData.lastName.trim(),
      phone:      formData.phone      || '',
      email:      formData.email      || '',
      country:    formData.country    || '',
      app:        formData.app        || '',
      macAddress: formData.macAddress || '',
      username:   formData.username   || '',
      panel:      formData.panel      || '',
      referredBy: formData.referredBy || '',
      type:       formData.type       || 'individual',
      color:      formData.color      || CUST_COLORS[0],
      total:      0,
      invoices:   0,
    }
    setCustomers(p => [...p, nc])
    set('customer', fullName)
    setAddingCustomer(null)
  }

  /* ── Save ── */
  const save = () => {
    const validItems = lineItems.filter(it => Number(it.unitPrice) > 0)
    if (!form.customer)     { setError('Zgjidh klientin.'); return }
    if (!validItems.length) { setError('Shto të paktën një artikull me çmim.'); return }

    const invoiceItems = validItems.map(it => ({
      desc:  it.desc.trim() || 'Shërbim',
      qty:   Number(it.qty) || 1,
      price: Number(it.unitPrice),
    }))

    const custObj = customers.find(c => c.name === form.customer)
    const payload = {
      customer:           form.customer,
      country:            custObj?.country || '',
      email:              custObj?.email   || '',
      amount:             total,
      due:                form.due,
      subscriptionExpiry: form.subscriptionExpiry,
      notifyDate:         form.notifyDate,
      status:             form.status,
      items:              invoiceItems,
      discount:           discVal > 0 ? { value: discVal, type: discount.type } : null,
    }

    if (isEdit) {
      setInvoices(prev => prev.map(i => i.id === initialData.id ? { ...i, ...payload } : i))
      showToast('Fatura u përditësua! ✓')
    } else {
      setInvoices(p => [{
        ...payload,
        id:       `INV-${String(Date.now()).slice(-4)}`,
        date:     new Date().toISOString().slice(0, 10),
        comments: [],
      }, ...p])
      showToast('Fatura u krijua me sukses! ✓')
    }
    closeModal()
  }

  return (
    <Modal
      title={
        <span className="flex items-center gap-2">
          {isEdit ? <Pencil size={18} className="text-blue-500"/> : <FilePlus size={18} className="text-blue-500"/>}
          {isEdit ? 'Ndrysho Faturën' : 'Faturë e re'}
        </span>
      }
      onClose={closeModal}
      footer={<>
        <button className="btn btn-outline" onClick={closeModal}>Anulo</button>
        <button className="btn btn-primary" onClick={save}>
          {isEdit ? 'Ruaj ndryshimet' : 'Krijo Faturën'}
        </button>
      </>}
    >
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 text-xs rounded-lg px-3 py-2.5 mb-4">
          {error}
        </div>
      )}

      {/* ── Klienti ── */}
      <FormGroup label="Klienti *">
        <Combobox
          options={customers}
          value={form.customer}
          onChange={c => set('customer', c.name)}
          placeholder="Zgjedh klientin..."
          getKey={c => c.id}
          getLabel={c => c.name}
          renderOption={c => (
            <div>
              <p className="text-sm font-semibold text-gray-800">{c.name}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">{[c.country, c.email].filter(Boolean).join(' · ')}</p>
            </div>
          )}
          onAddNew={handleAddNewCustomer}
          addNewLabel="Shto klient të ri"
        />
      </FormGroup>

      {/* Quick add customer form */}
      {addingCustomer && (
        <QuickAddCustomer
          initialName={addingCustomer.name}
          onSave={confirmAddCustomer}
          onCancel={() => setAddingCustomer(null)}
        />
      )}

      {/* ── Item Table ── */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <label className="form-label mb-0">Artikujt</label>
          {/* Column labels - hidden on very small screens */}
          <div
            className="hidden sm:grid text-[10px] text-gray-400 font-bold uppercase tracking-wide gap-2 pr-9"
            style={{ gridTemplateColumns: '1fr 72px 100px 86px' }}
          >
            <span className="pl-3">Produkt / Shërbim</span>
            <span className="text-center">Sasia</span>
            <span className="text-right">Çmimi (€)</span>
            <span className="text-right">Totali</span>
          </div>
        </div>

        <div className="border border-gray-200 rounded-xl overflow-x-auto bg-white">
          <div className="min-w-[380px]">
          {lineItems.map(item => (
            <ItemRow
              key={item.id}
              item={item}
              products={products}
              onUpdate={patch => updateItem(item.id, patch)}
              onRemove={() => removeItem(item.id)}
              canRemove={lineItems.length > 1}
            />
          ))}
          </div>
        </div>

        <button
          className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 px-1 py-1 transition-colors"
          onClick={addItem}
        >
          <Plus size={13} /> Shto artikull tjetër
        </button>
      </div>

      {/* ── Totals block ── */}
      <div className="bg-gray-50 rounded-xl border border-gray-100 px-4 py-3 mb-4 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500 font-medium">Sub Total</span>
          <span className="font-semibold text-gray-800">€{fmtN(subTotal)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-gray-500 font-medium">
            <span>Zbritja</span>
            <input
              className="w-14 border border-gray-200 rounded-lg px-2 py-0.5 text-xs text-right outline-none focus:border-blue-400 bg-white"
              type="number" min="0" max={discount.type === '%' ? 100 : undefined}
              value={discount.value}
              onChange={e => setDiscount(p => ({ ...p, value: e.target.value }))}
              placeholder="0"
            />
            <select
              className="border border-gray-200 rounded-lg px-1.5 py-0.5 text-xs outline-none focus:border-blue-400 bg-white text-gray-700"
              value={discount.type}
              onChange={e => setDiscount(p => ({ ...p, type: e.target.value }))}
            >
              <option value="%">%</option>
              <option value="fixed">€</option>
            </select>
          </div>
          <span className={`font-semibold ${discAmount > 0 ? 'text-red-500' : 'text-gray-300'}`}>
            -{discAmount > 0 ? `€${fmtN(discAmount)}` : '€0'}
          </span>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-gray-200">
          <span className="font-bold text-gray-800 text-sm">Total (€)</span>
          <span className="text-xl font-bold text-blue-700">€{fmtN(total)}</span>
        </div>
      </div>

      {/* ── Dates ── */}
      <div className="grid grid-cols-2 gap-4">
        <FormGroup label="Afati i pagesës (auto: 3 ditë)">
          <input className="form-control" type="date" value={form.due} onChange={e => set('due', e.target.value)} />
        </FormGroup>
        <FormGroup label="Data e skadimit të abonimit">
          <input className="form-control" type="date" value={form.subscriptionExpiry}
            onChange={e => {
              const v = e.target.value
              set('subscriptionExpiry', v)
              if (v) {
                const d = new Date(v)
                d.setDate(d.getDate() - 7)
                set('notifyDate', d.toISOString().slice(0, 10))
              }
            }} />
        </FormGroup>
      </div>

      {/* ── Notify date ── */}
      <FormGroup label="🔔 Njoftim rinovimi — data kur dërgojmë rikujtim">
        <input className="form-control" type="date" value={form.notifyDate} onChange={e => set('notifyDate', e.target.value)} />
        <p className="text-[11px] text-gray-400 mt-1">Shfaqet në menunë "Abonimet" si rikujtim për klientin.</p>
      </FormGroup>

      {/* ── Statusi ── */}
      <FormGroup label="Statusi">
        <select className="form-control" value={form.status} onChange={e => set('status', e.target.value)}>
          <option value="draft">Draft — Ruaj si skicë</option>
          <option value="pending">Dërgo — Në pritje</option>
          {isEdit && <option value="overdue">Vonuar</option>}
          {isEdit && <option value="paid">Paguar</option>}
        </select>
      </FormGroup>
    </Modal>
  )
}
