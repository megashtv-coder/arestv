import { useState, useMemo } from 'react'
import {
  Users, Mail, Phone, UserPlus, Search, X,
  Pencil, Monitor, Wifi, UserCheck, Globe, Filter,
  MessageCircle, Send, LayoutGrid, User, AlertTriangle, FileSpreadsheet,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Avatar, Modal, FormGroup, EmptyState } from '../components/UI'
import { countries } from '../data/mockData'
import ImportExcelModal from '../components/ImportExcelModal'

const COLORS = ['#2563eb','#7c3aed','#059669','#d97706','#dc2626','#0891b2','#be185d','#0f766e']

/* ── helper: pastro numrin e telefonit për URL ── */
const cleanPhone = p => (p || '').replace(/[\s\+\-\(\)]/g, '')

/* ══════════════════════════════════════════════════════════
   Dropdown "Referuar nga" me mundësi shtimi
══════════════════════════════════════════════════════════ */
function ReferredBySelect({ value, onChange, excludeId }) {
  const { customers } = useApp()

  const names = useMemo(() =>
    customers
      .filter(c => c.id !== excludeId)
      .map(c => c.name || `${c.firstName} ${c.lastName}`)
      .filter(Boolean)
      .sort(),
    [customers, excludeId]
  )

  const isCustom = !!(value && !names.includes(value))
  const [showCustom, setShowCustom] = useState(isCustom)

  const handleSelect = e => {
    const v = e.target.value
    if (v === '__custom__') { setShowCustom(true); onChange('') }
    else { setShowCustom(false); onChange(v) }
  }

  return (
    <div className="space-y-2">
      <select
        className="form-control"
        value={showCustom ? '__custom__' : (value || '')}
        onChange={handleSelect}
      >
        <option value="">— Asnjë —</option>
        {names.map(n => <option key={n} value={n}>{n}</option>)}
        <option value="__custom__">+ Shto person tjetër...</option>
      </select>
      {showCustom && (
        <input
          className="form-control text-sm"
          placeholder="Shkruaj emrin e personit referues..."
          value={value}
          onChange={e => onChange(e.target.value)}
          autoFocus
        />
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════
   Modal — shto / edito klient
══════════════════════════════════════════════════════════ */
export function CustomerModal({ customer, onClose }) {
  const { setCustomers, showToast } = useApp()
  const isEdit = !!customer

  const empty = {
    firstName: '', lastName: '', phone: '', email: '',
    country: 'Kosovë',
    /* individual */
    app: '', macAddress: '',
    /* reseller */
    username: '', panel: '',
    /* common */
    referredBy: '', type: 'individual', color: COLORS[0],
  }

  const [form, setForm] = useState(isEdit ? {
    firstName:  customer.firstName  || '',
    lastName:   customer.lastName   || '',
    phone:      customer.phone      || '',
    email:      customer.email      || '',
    country:    customer.country    || 'Kosovë',
    app:        customer.app        || '',
    macAddress: customer.macAddress || '',
    username:   customer.username   || '',
    panel:      customer.panel      || '',
    referredBy: customer.referredBy || '',
    type:       customer.type       || 'individual',
    color:      customer.color      || COLORS[0],
  } : empty)

  const [err, setErr] = useState('')
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const isReseller = form.type === 'reseller'

  const save = () => {
    if (!form.firstName.trim()) { setErr('Emri është i detyrueshëm.'); return }
    if (!form.lastName.trim())  { setErr('Mbiemri është i detyrueshëm.'); return }
    if (!form.phone.trim())     { setErr('Numri i telefonit është i detyrueshëm.'); return }
    if (!form.country)          { setErr('Shteti është i detyrueshëm.'); return }

    const fullName = `${form.firstName.trim()} ${form.lastName.trim()}`
    const payload = {
      ...form,
      name:     fullName,
      id:       isEdit ? customer.id       : `CUS-${Date.now()}`,
      total:    isEdit ? customer.total    : 0,
      invoices: isEdit ? customer.invoices : 0,
    }

    if (isEdit) {
      setCustomers(prev => prev.map(c => c.id === customer.id ? payload : c))
      showToast('Klienti u përditësua! ✓')
    } else {
      setCustomers(prev => [payload, ...prev])
      showToast('Klienti u shtua me sukses! ✓')
    }
    onClose()
  }

  return (
    <Modal
      title={
        <span className="flex items-center gap-2">
          <UserPlus size={18} className="text-blue-500" />
          {isEdit ? `Edito — ${customer.firstName} ${customer.lastName}` : 'Klient i ri'}
        </span>
      }
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-outline" onClick={onClose}>Anulo</button>
          <button className="btn btn-primary" onClick={save}>
            {isEdit ? 'Ruaj ndryshimet' : 'Shto klientin'}
          </button>
        </>
      }
    >
      {err && (
        <div className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4">
          {err}
        </div>
      )}

      {/* Lloji i klientit — lart në modal */}
      <FormGroup label="Lloji i klientit *">
        <div className="flex gap-3">
          <button type="button" onClick={() => set('type', 'individual')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${
              !isReseller
                ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                : 'border-gray-200 bg-white text-gray-500 hover:border-blue-300'
            }`}>
            <User size={15}/> Individual
          </button>
          <button type="button" onClick={() => set('type', 'reseller')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${
              isReseller
                ? 'border-purple-600 bg-purple-600 text-white shadow-sm'
                : 'border-gray-200 bg-white text-gray-500 hover:border-purple-300'
            }`}>
            <Users size={15}/> Reseller
          </button>
        </div>
      </FormGroup>

      {/* Emri + Mbiemri */}
      <div className="grid grid-cols-2 gap-4">
        <FormGroup label="Emri *">
          <input className="form-control" value={form.firstName}
            onChange={e => set('firstName', e.target.value)}
            placeholder="p.sh. Ardit" autoFocus />
        </FormGroup>
        <FormGroup label="Mbiemri *">
          <input className="form-control" value={form.lastName}
            onChange={e => set('lastName', e.target.value)}
            placeholder="p.sh. Krasniqi" />
        </FormGroup>
      </div>

      {/* Telefon + Email */}
      <div className="grid grid-cols-2 gap-4">
        <FormGroup label="Numri i telefonit *">
          <input className="form-control" value={form.phone}
            onChange={e => set('phone', e.target.value)}
            placeholder="+383 44 000 000" />
        </FormGroup>
        <FormGroup label="Email">
          <input className="form-control" type="email" value={form.email}
            onChange={e => set('email', e.target.value)}
            placeholder="email@shembull.com" />
        </FormGroup>
      </div>

      {/* Shteti */}
      <FormGroup label="Shteti *">
        <select className="form-control" value={form.country}
          onChange={e => set('country', e.target.value)}>
          <option value="">— Zgjidh shtetin —</option>
          {countries.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </FormGroup>

      {/* Fushat sipas llojit */}
      {!isReseller ? (
        /* ── INDIVIDUAL: Aplikacioni + MAC ── */
        <div className="grid grid-cols-2 gap-4">
          <FormGroup label="Aplikacioni që përdor">
            <input className="form-control" value={form.app}
              onChange={e => set('app', e.target.value)}
              placeholder="p.sh. Predator IPTV" />
          </FormGroup>
          <FormGroup label="MAC Adresa">
            <input className="form-control" value={form.macAddress}
              onChange={e => set('macAddress', e.target.value)}
              placeholder="AA:BB:CC:DD:EE:FF" />
          </FormGroup>
        </div>
      ) : (
        /* ── RESELLER: Username + Panel ── */
        <div className="grid grid-cols-2 gap-4">
          <FormGroup label="Username">
            <input className="form-control" value={form.username}
              onChange={e => set('username', e.target.value)}
              placeholder="p.sh. ardit_reseller" />
          </FormGroup>
          <FormGroup label="Paneli">
            <input className="form-control" value={form.panel}
              onChange={e => set('panel', e.target.value)}
              placeholder="p.sh. panel1.iptv.com" />
          </FormGroup>
        </div>
      )}

      {/* Referuar nga */}
      <FormGroup label="Referuar nga">
        <ReferredBySelect
          value={form.referredBy}
          onChange={v => set('referredBy', v)}
          excludeId={isEdit ? customer.id : null}
        />
      </FormGroup>

      {/* Ngjyra */}
      <FormGroup label="Ngjyra e avatit">
        <div className="flex gap-2 mt-1">
          {COLORS.map(c => (
            <button key={c} type="button" onClick={() => set('color', c)}
              className="w-7 h-7 rounded-lg transition-all"
              style={{ background: c, outline: form.color === c ? `3px solid ${c}` : 'none', outlineOffset: 2 }}/>
          ))}
        </div>
      </FormGroup>
    </Modal>
  )
}

/* ══════════════════════════════════════════════════════════
   Karta e klientit
══════════════════════════════════════════════════════════ */
function CustomerCard({ c, onEdit, fmt, isLatePayer }) {
  const phone  = cleanPhone(c.phone)
  const isReseller = c.type === 'reseller'

  return (
    <div
      className={`bg-white rounded-xl border p-5 hover:shadow-md transition-all duration-200 cursor-pointer group ${
        isLatePayer
          ? 'border-orange-200 hover:border-orange-300'
          : 'border-gray-100 hover:border-blue-200'
      }`}
      onClick={() => onEdit(c)}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <Avatar name={c.name || c.firstName || '?'} color={c.color} size={44} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="font-bold text-gray-800 truncate text-sm">
              {c.name || `${c.firstName} ${c.lastName}`}
            </p>
            {isLatePayer && (
              <span
                className="flex items-center gap-0.5 bg-orange-50 text-orange-500 border border-orange-100 text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                title="Ky klient ka shfaqur vonesa pagese"
              >
                <AlertTriangle size={9}/> Vonues
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Globe size={10} className="text-gray-300 flex-shrink-0"/>
            <p className="text-xs text-gray-400 truncate">{c.country}</p>
          </div>
        </div>
        {/* Type badge */}
        <span className={`flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${
          isReseller ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-500'
        }`}>
          {isReseller ? 'Reseller' : 'Individual'}
        </span>
      </div>

      {/* Info rows */}
      <div className="space-y-1.5 mb-3 text-xs text-gray-500">
        {c.email && (
          <div className="flex items-center gap-2">
            <Mail size={11} className="text-gray-300 flex-shrink-0"/>
            <span className="truncate">{c.email}</span>
          </div>
        )}
        {c.phone && (
          <div className="flex items-center gap-2">
            <Phone size={11} className="text-gray-300 flex-shrink-0"/>
            <span>{c.phone}</span>
          </div>
        )}

        {/* Individual: App + MAC */}
        {!isReseller && c.app && (
          <div className="flex items-center gap-2">
            <Monitor size={11} className="text-gray-300 flex-shrink-0"/>
            <span className="truncate">{c.app}</span>
          </div>
        )}
        {!isReseller && c.macAddress && (
          <div className="flex items-center gap-2">
            <Wifi size={11} className="text-gray-300 flex-shrink-0"/>
            <span className="font-mono text-[10px] truncate">{c.macAddress}</span>
          </div>
        )}

        {/* Reseller: Username + Panel */}
        {isReseller && c.username && (
          <div className="flex items-center gap-2">
            <User size={11} className="text-gray-300 flex-shrink-0"/>
            <span className="font-mono text-[10px]">{c.username}</span>
          </div>
        )}
        {isReseller && c.panel && (
          <div className="flex items-center gap-2">
            <LayoutGrid size={11} className="text-gray-300 flex-shrink-0"/>
            <span className="truncate text-[10px]">{c.panel}</span>
          </div>
        )}

        {/* Referral */}
        {c.referredBy && (
          <div className="flex items-center gap-2">
            <UserCheck size={11} className="text-gray-300 flex-shrink-0"/>
            <span className="truncate text-emerald-600">Ref: {c.referredBy}</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center pt-3 border-t border-gray-50">
        <div>
          <p className="text-base font-bold text-blue-600">{fmt(c.total)}</p>
          <p className="text-[10px] text-gray-400 uppercase tracking-wide">Totali</p>
        </div>
        <div className="text-right">
          <p className="text-base font-bold text-gray-700">{c.invoices}</p>
          <p className="text-[10px] text-gray-400 uppercase tracking-wide">Fatura</p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5">
          {/* WhatsApp */}
          {phone && (
            <a
              href={`https://wa.me/${phone}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-green-50 text-green-500 hover:bg-green-100 hover:text-green-700 transition-colors"
              title="Kontakto në WhatsApp"
            >
              <MessageCircle size={14}/>
            </a>
          )}
          {/* Telegram */}
          {phone && (
            <a
              href={`https://t.me/+${phone}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-sky-50 text-sky-500 hover:bg-sky-100 hover:text-sky-700 transition-colors"
              title="Kontakto në Telegram"
            >
              <Send size={14}/>
            </a>
          )}
          {/* Edit */}
          <button
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-50 text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors opacity-0 group-hover:opacity-100"
            onClick={e => { e.stopPropagation(); onEdit(c) }}
            title="Edito"
          >
            <Pencil size={13}/>
          </button>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════
   Faqja kryesore
══════════════════════════════════════════════════════════ */
export default function Customers() {
  const { customers, setCustomers, setModal, closeModal, fmt, invoices, showToast } = useApp()
  const [search,        setSearch]        = useState('')
  const [typeFilt,      setTypeFilt]      = useState('all')
  const [countryFilt,   setCountryFilt]   = useState('all')
  const [importOpen,    setImportOpen]    = useState(false)

  function handleImportCustomers(rows) {
    setCustomers(prev => {
      const existing = new Set(prev.map(c => c.name?.toLowerCase()))
      const news = rows.filter(r => !existing.has(r.name?.toLowerCase()))
      showToast(`U importuan ${news.length} klientë të rinj`, 'success')
      return [...prev, ...news]
    })
  }

  const usedCountries = [...new Set(customers.map(c => c.country).filter(Boolean))]

  /* klientët me vonesë pagese: kanë fatura overdue ose kaluar afatin */
  const today = new Date().toISOString().slice(0, 10)
  const latePayerNames = useMemo(() => {
    const names = new Set()
    invoices.forEach(inv => {
      if (
        inv.status === 'overdue' ||
        (inv.due && inv.due < today && inv.status !== 'paid' && inv.status !== 'void')
      ) {
        names.add(inv.customer)
      }
    })
    return names
  }, [invoices, today])

  const filtered = useMemo(() => customers.filter(c => {
    const name = c.name || `${c.firstName || ''} ${c.lastName || ''}`.trim()
    const matchSearch  = !search ||
      name.toLowerCase().includes(search.toLowerCase()) ||
      (c.email      || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.phone      || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.app        || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.username   || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.referredBy || '').toLowerCase().includes(search.toLowerCase())
    const matchType    = typeFilt    === 'all' || c.type    === typeFilt
    const matchCountry = countryFilt === 'all' || c.country === countryFilt
    return matchSearch && matchType && matchCountry
  }), [customers, search, typeFilt, countryFilt])

  /* stats */
  const totalResellers   = customers.filter(c => c.type === 'reseller').length
  const totalIndividuals = customers.filter(c => c.type === 'individual').length
  const topCountry       = usedCountries
    .map(co => ({ co, count: customers.filter(c => c.country === co).length }))
    .sort((a, b) => b.count - a.count)[0]

  const openAdd  = ()     => setModal(<CustomerModal onClose={closeModal} />)
  const openEdit = cust   => setModal(<CustomerModal customer={cust} onClose={closeModal} />)

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Klientët</h2>
          <p className="text-sm text-gray-400 mt-0.5">{customers.length} klientë aktiv</p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button className="btn btn-outline btn-sm" onClick={() => setImportOpen(true)}>
            <FileSpreadsheet size={15}/> Import Excel
          </button>
          <button className="btn btn-primary btn-sm" onClick={openAdd}>
            <UserPlus size={15}/> Shto klient
          </button>
        </div>
      </div>
      {importOpen && (
        <ImportExcelModal
          entity="customers"
          onImport={handleImportCustomers}
          onClose={() => setImportOpen(false)}
        />
      )}

      {/* Mini stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 px-5 py-4">
          <p className="text-2xl font-bold text-gray-800">{customers.length}</p>
          <p className="text-xs text-gray-400 mt-0.5 font-medium">Klientë gjithsej</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 px-5 py-4">
          <p className="text-2xl font-bold text-blue-600">{totalIndividuals}</p>
          <p className="text-xs text-gray-400 mt-0.5 font-medium">Individualë</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 px-5 py-4">
          <p className="text-2xl font-bold text-purple-600">{totalResellers}</p>
          <p className="text-xs text-gray-400 mt-0.5 font-medium">Resellers</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 px-5 py-4">
          <p className="text-2xl font-bold text-emerald-600">{usedCountries.length}</p>
          <p className="text-xs text-gray-400 mt-0.5 font-medium flex flex-wrap items-center gap-1">
            Shtete
            {topCountry && (
              <span className="text-gray-400 font-normal">· {topCountry.co} ({topCountry.count})</span>
            )}
          </p>
        </div>
      </div>

      {/* Filtrat */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2
                        focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-50 transition-all flex-1 min-w-[160px]">
          <Search size={14} className="text-gray-400 flex-shrink-0" />
          <input
            className="bg-transparent border-none outline-none text-sm text-gray-600 w-full placeholder-gray-400"
            placeholder="Kërko emër, telefon..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-gray-300 hover:text-gray-500">
              <X size={13} />
            </button>
          )}
        </div>

        <select
          className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 outline-none focus:border-blue-400 cursor-pointer"
          value={typeFilt} onChange={e => setTypeFilt(e.target.value)}
        >
          <option value="all">Të gjitha llojet</option>
          <option value="individual">Individualë</option>
          <option value="reseller">Resellers</option>
        </select>

        <select
          className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 outline-none focus:border-blue-400 cursor-pointer"
          value={countryFilt} onChange={e => setCountryFilt(e.target.value)}
        >
          <option value="all">Të gjitha shtetet</option>
          {usedCountries.sort().map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <span className="text-xs text-gray-400 flex items-center gap-1 ml-auto">
          <Filter size={12} /> {filtered.length}
        </span>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nuk u gjetën klientë"
          sub={search ? 'Provo kërkim tjetër' : 'Shto klientin e parë'}
          action={!search && (
            <button className="btn btn-primary mt-2" onClick={openAdd}>
              <UserPlus size={14}/> Shto klient
            </button>
          )}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(c => (
            <CustomerCard
              key={c.id}
              c={c}
              onEdit={openEdit}
              fmt={fmt}
              isLatePayer={latePayerNames.has(c.name)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
