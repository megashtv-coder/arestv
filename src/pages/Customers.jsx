import { useState, useMemo, useRef, useEffect, memo, lazy, Suspense } from 'react'
import {
  Users, Mail, Phone, UserPlus, Search, X,
  Pencil, Monitor, Wifi, UserCheck, Globe,
  MessageCircle, Send, LayoutGrid, User, AlertTriangle,
  ChevronDown, Trash2,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Avatar, Modal, FormGroup, EmptyState } from '../components/UI'
import FormPageWrapper from '../components/FormPageWrapper'
import CustomerDetailsModal from './CustomerDetailsModal'
import { countries } from '../data/mockData'
import { downloadTemplate } from '../components/ImportExcelModal'
const ImportExcelModal = lazy(() => import('../components/ImportExcelModal'))
import { ContactImportButton } from '../features/contacts'

const COLORS = ['#2563eb','#7c3aed','#059669','#d97706','#dc2626','#0891b2','#be185d','#0f766e']

/* ── helper: pastro numrin e telefonit për URL ── */
const cleanPhone = p => (p || '').replace(/[\s\+\-\(\)]/g, '')

/* ══════════════════════════════════════════════════════════
   Searchable combobox "Referuar nga"
══════════════════════════════════════════════════════════ */
function ReferredBySelect({ value, onChange, excludeId }) {
  const { customers, representatives } = useApp()
  const [query,  setQuery]  = useState(value || '')
  const [open,   setOpen]   = useState(false)
  const [active, setActive] = useState(-1)
  const wrapRef  = useRef(null)
  const inputRef = useRef(null)

  // Mban listën e emrave nga të dyja burimet: klientë + përfaqësues (unique)
  const names = useMemo(() => {
    const uniqueNames = new Set([
      // Emrat e klientëve
      ...customers
        .filter(c => c.id !== excludeId)
        .map(c => (c.name || `${c.firstName || ''} ${c.lastName || ''}`).trim())
        .filter(Boolean),
      // Përfaqësuesit e ruajtur
      ...(representatives || [])
    ])
    return Array.from(uniqueNames).sort()
  }, [customers, representatives, excludeId])

  // Filtrimi live
  const filtered = useMemo(() => {
    const q = (query || '').trim().toLowerCase()
    if (!q) return names
    return names.filter(n => n.toLowerCase().includes(q))
  }, [names, query])

  // Mbyll dropdown-in nëse klikohet jashtë
  useEffect(() => {
    const handler = e => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Sinkronizon query me value nga jashtë (p.sh. reset form)
  useEffect(() => { setQuery(value || '') }, [value])

  const select = name => {
    setQuery(name)
    onChange(name)
    setOpen(false)
    setActive(-1)
  }

  const clear = () => {
    setQuery('')
    onChange('')
    setOpen(false)
    inputRef.current?.focus()
  }

  const handleKey = e => {
    if (!open) { if (e.key === 'ArrowDown' || e.key === 'Enter') setOpen(true); return }
    if (e.key === 'ArrowDown')  { e.preventDefault(); setActive(a => Math.min(a + 1, filtered.length - 1)) }
    if (e.key === 'ArrowUp')    { e.preventDefault(); setActive(a => Math.max(a - 1, -1)) }
    if (e.key === 'Enter')      { e.preventDefault(); if (active >= 0 && filtered[active]) select(filtered[active]) }
    if (e.key === 'Escape')     { setOpen(false); setActive(-1) }
  }

  return (
    <div ref={wrapRef} className="relative">
      {/* Input */}
      <div className="relative flex items-center">
        <Search size={14} className="absolute left-3 text-gray-400 pointer-events-none" />
        <input
          ref={inputRef}
          className="form-control pl-8 pr-8"
          placeholder="Kërko person referues..."
          value={query}
          onChange={e => { setQuery(e.target.value); onChange(e.target.value); setOpen(true); setActive(-1) }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKey}
          autoComplete="off"
        />
        {query
          ? <button type="button" onClick={clear} className="absolute right-3 text-gray-300 hover:text-gray-500"><X size={13}/></button>
          : <ChevronDown size={13} className="absolute right-3 text-gray-300 pointer-events-none"/>
        }
      </div>

      {/* Dropdown list */}
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-52 overflow-y-auto">
          {/* Opsioni "asnjë" */}
          <div
            className="px-3 py-2 text-xs text-gray-400 hover:bg-gray-50 cursor-pointer border-b border-gray-100"
            onMouseDown={() => select('')}
          >
            — Asnjë —
          </div>

          {/* Filtered results */}
          {filtered.length > 0 ? (
            filtered.map((name, i) => (
              <div
                key={name}
                className={`px-3 py-2 text-sm cursor-pointer flex items-center gap-2 transition-colors ${
                  i === active ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50 text-gray-700'
                }`}
                onMouseDown={() => select(name)}
                onMouseEnter={() => setActive(i)}
              >
                <UserCheck size={12} className="text-gray-300 flex-shrink-0"/>
                {name}
              </div>
            ))
          ) : null}

          {/* Add new referrer option */}
          {query.trim() && (filtered.length === 0 || !filtered.includes(query.trim())) ? (
            <div
              className={`px-3 py-2 text-sm cursor-pointer flex items-center gap-2 transition-colors hover:bg-blue-50 text-blue-500 hover:text-blue-600 font-medium ${
                filtered.length > 0 ? 'border-t border-gray-100' : ''
              }`}
              onMouseDown={() => select(query.trim())}
              onMouseEnter={() => setActive(filtered.length)}
            >
              <UserCheck size={12} className="flex-shrink-0"/>
              ✓ Shto "{query.trim()}" si referues të ri
            </div>
          ) : null}

          {/* No results */}
          {filtered.length === 0 && !query.trim() ? (
            <div className="px-3 py-3 text-xs text-gray-400 text-center">Nuk u gjet asnjë klient</div>
          ) : null}
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════
   Modal — shto / edito klient
══════════════════════════════════════════════════════════ */
export function CustomerModal({ customer, onClose, isFormPage }) {
  const { customers, setCustomers, showToast, representatives, setRepresentatives, currentOrgId, logActivity } = useApp()
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

    // Check for duplicate customer name (only when creating new, not when editing)
    if (!isEdit) {
      const existingCustomer = customers.find(c =>
        c.name && c.name.toLowerCase() === fullName.toLowerCase()
      )
      if (existingCustomer) {
        setErr(`Klienti "${fullName}" ekziston tashmë. Nuk mund të krijohen klientë me të njëjtin emër.`)
        return
      }
    }

    const payload = {
      ...form,
      name:     fullName,
      id:       isEdit ? customer.id       : `CUS-${Date.now()}`,
      total:    isEdit ? customer.total    : 0,
      invoices: isEdit ? customer.invoices : 0,
      orgId:    isEdit ? customer.orgId    : currentOrgId,
    }

    // Sync referrer to representatives list if it's new
    if (form.referredBy && form.referredBy.trim() && !representatives.includes(form.referredBy.trim())) {
      setRepresentatives(prev => [...prev, form.referredBy.trim()])
    }

    if (isEdit) {
      setCustomers(prev => prev.map(c => c.id === customer.id ? payload : c))
      logActivity(`Përditësoi klientin ${fullName}`, 'Klientët')
      showToast('Klienti u përditësua! ✓')
    } else {
      setCustomers(prev => [payload, ...prev])
      logActivity(`Shtoi klientin ${fullName}`, 'Klientët')
      showToast('Klienti u shtua me sukses! ✓')
    }
    // Always call onClose to close the form (handles both modal and form page modes)
    onClose()
  }

  const formContent = (
    <>
      {err && (
        <div className="text-xs text-blue-500 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 mb-4">
          {err}
        </div>
      )}

      {/* Lloji i klientit — lart në modal */}
      <FormGroup label="Lloji i klientit *">
        <div className="flex gap-3">
          <button type="button" onClick={() => set('type', 'individual')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${
              !isReseller
                ? 'border-blue-500 bg-blue-500 text-white shadow-sm'
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

      {/* 🆕 Contact Import */}
      <div className="flex gap-2">
        <ContactImportButton
          variant="secondary"
          onSelect={(contact) => {
            set('firstName', contact.firstName)
            set('lastName', contact.lastName)
            set('phone', contact.phone)
            showToast(`✓ Kontakti u importua: ${contact.firstName} ${contact.lastName}`)
          }}
          onError={(error) => setErr(error)}
        />
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
    </>
  )

  // If rendering as form page (side panel), don't use Modal wrapper
  if (isFormPage) {
    return (
      <div className="space-y-4">
        {formContent}
        <div className="flex gap-2 pt-4 border-t border-gray-200">
          <button className="btn btn-outline flex-1" onClick={onClose}>Anulo</button>
          <button className="btn btn-primary flex-1" onClick={save}>
            {isEdit ? 'Ruaj ndryshimet' : 'Shto klientin'}
          </button>
        </div>
      </div>
    )
  }

  // Otherwise, render with Modal wrapper
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
      {formContent}
    </Modal>
  )
}

/* ══════════════════════════════════════════════════════════
   Karta e klientit
══════════════════════════════════════════════════════════ */
const CustomerCard = memo(function CustomerCard({ c, onEdit, fmt, isLatePayer, onDelete, checked, onToggleSelect }) {
  const phone  = cleanPhone(c.phone)
  const isReseller = c.type === 'reseller'

  return (
    <div
      className={`bg-white rounded-2xl border p-4 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between gap-3 cursor-pointer ${
        checked
          ? 'border-blue-500'
          : isLatePayer
            ? 'border-orange-200 hover:border-orange-300'
            : 'border-gray-200/90'
      }`}
      onClick={() => onEdit(c)}
    >
      <div>
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2.5">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => {
                e.stopPropagation()
                onToggleSelect()
              }}
              className="w-4 h-4 mt-1.5 rounded border-gray-300 text-blue-500 cursor-pointer flex-shrink-0"
              onClick={(e) => e.stopPropagation()}
            />
            <Avatar name={c.name || c.firstName || '?'} color={c.color} size={36} />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="font-bold text-gray-900 truncate text-sm leading-tight">
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
              <div className="flex items-center gap-1 text-[11px] text-gray-400 mt-0.5">
                <Globe size={10} className="flex-shrink-0"/>
                <span className="truncate">{c.country}</span>
              </div>
            </div>
          </div>
          {/* Type badge */}
          <span className={`flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${
            isReseller ? 'bg-purple-100 text-purple-600' : 'bg-blue-50 text-blue-600'
          }`}>
            {isReseller ? 'Reseller' : 'Individual'}
          </span>
        </div>

        {/* Info rows */}
        <div className="pl-[26px] mt-3 space-y-1 text-xs text-gray-500">
          {c.email && (
            <div className="flex items-center gap-1.5">
              <Mail size={11} className="text-gray-400 flex-shrink-0"/>
              <span className="truncate text-[11px]">{c.email}</span>
            </div>
          )}
          {c.phone && (
            <div className="flex items-center gap-1.5 font-mono">
              <Phone size={11} className="text-gray-400 flex-shrink-0"/>
              <span className="text-[11px]">{c.phone}</span>
            </div>
          )}

          {/* Individual: App + MAC */}
          {!isReseller && c.app && (
            <div className="flex items-center gap-1.5">
              <Monitor size={11} className="text-gray-400 flex-shrink-0"/>
              <span className="truncate text-[11px] font-semibold text-gray-700">{c.app}</span>
            </div>
          )}
          {!isReseller && c.macAddress && (
            <div className="flex items-center gap-1.5 font-mono">
              <Wifi size={11} className="text-gray-400 flex-shrink-0"/>
              <span className="text-[11px] truncate">{c.macAddress}</span>
            </div>
          )}

          {/* Reseller: Username + Panel */}
          {isReseller && c.username && (
            <div className="flex items-center gap-1.5 font-mono">
              <User size={11} className="text-gray-400 flex-shrink-0"/>
              <span className="text-[11px]">{c.username}</span>
            </div>
          )}
          {isReseller && c.panel && (
            <div className="flex items-center gap-1.5">
              <LayoutGrid size={11} className="text-gray-400 flex-shrink-0"/>
              <span className="truncate text-[11px]">{c.panel}</span>
            </div>
          )}

          {/* Referral */}
          {c.referredBy && (
            <div className="text-[11px] font-semibold text-emerald-600 mt-1">
              Ref: {c.referredBy}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center pt-3 border-t border-gray-100">
        <div className="flex items-center gap-4">
          <div>
            <span className="text-xs font-black font-mono text-blue-600 block">{fmt(c.total)}</span>
            <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Totali</span>
          </div>
          <div>
            <span className="text-xs font-black font-mono text-gray-800 block">{c.invoices}</span>
            <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Fatura</span>
          </div>
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
              className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 border border-green-200/50 transition-colors"
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
              className="p-1.5 rounded-lg bg-sky-50 text-sky-600 hover:bg-sky-100 border border-sky-200/50 transition-colors"
              title="Kontakto në Telegram"
            >
              <Send size={14}/>
            </a>
          )}
          {/* Edit */}
          <button
            className="p-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-blue-50 hover:text-blue-600 border border-transparent hover:border-blue-200/50 transition-colors"
            onClick={e => { e.stopPropagation(); onEdit(c) }}
            title="Edito"
          >
            <Pencil size={14}/>
          </button>
          {/* Delete */}
          <button
            className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200/50 transition-colors"
            onClick={e => { e.stopPropagation(); onDelete(c.id) }}
            title="Fshi klientin"
          >
            <Trash2 size={14}/>
          </button>
        </div>
      </div>
    </div>
  )
})

/* ══════════════════════════════════════════════════════════
   Tabela e klientëve — vetëm desktop (sm:hidden në mobile)
══════════════════════════════════════════════════════════ */
const CustomerRow = memo(function CustomerRow({ c, onEdit, fmt, isLatePayer, onDelete, checked, onToggleSelect }) {
  const isReseller = c.type === 'reseller'

  return (
    <tr
      className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50/80 transition-colors cursor-pointer"
      onClick={() => onEdit(c)}
    >
      <td className="p-3" onClick={e => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggleSelect}
          className="w-4 h-4 rounded border-gray-300 text-blue-500 cursor-pointer"
        />
      </td>
      <td className="p-3">
        <div className="flex items-center gap-3">
          <Avatar name={c.name || c.firstName || '?'} color={c.color} size={34} />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-gray-900 text-sm truncate">{c.name || `${c.firstName} ${c.lastName}`}</span>
              {isLatePayer && (
                <span className="flex items-center gap-0.5 bg-orange-50 text-orange-500 border border-orange-100 text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0" title="Ky klient ka shfaqur vonesa pagese">
                  <AlertTriangle size={9}/> Vonues
                </span>
              )}
            </div>
            <span className="text-[11px] text-gray-400 flex items-center gap-1">
              <Globe size={10}/> {c.country}
            </span>
          </div>
        </div>
      </td>
      <td className="p-3 text-xs">
        {c.email && <div className="flex items-center gap-1.5 text-gray-700"><Mail size={11} className="text-gray-400"/>{c.email}</div>}
        {c.phone && <div className="flex items-center gap-1.5 font-mono text-gray-400 mt-0.5">{c.phone}</div>}
      </td>
      <td className="p-3 text-xs">
        {isReseller ? (
          <>
            {c.username && <span className="font-mono font-semibold text-gray-800 block">{c.username}</span>}
            {c.panel && <span className="font-mono text-[11px] text-gray-400">{c.panel}</span>}
          </>
        ) : (
          <>
            {c.app && <span className="font-semibold text-gray-800 block">{c.app}</span>}
            {c.macAddress && <span className="font-mono text-[11px] text-gray-400">{c.macAddress}</span>}
          </>
        )}
      </td>
      <td className="p-3">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${
          isReseller ? 'bg-purple-100 text-purple-600' : 'bg-blue-50 text-blue-600'
        }`}>
          {isReseller ? 'Reseller' : 'Individual'}
        </span>
      </td>
      <td className="p-3 text-right font-mono font-bold text-blue-600 text-xs">{fmt(c.total)}</td>
      <td className="p-3 text-right font-mono font-bold text-gray-800 text-xs">{c.invoices}</td>
      <td className="p-3 text-right" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => onEdit(c)}
            className="px-2.5 py-1.5 rounded-lg bg-gray-100 text-gray-600 font-bold text-[11px] hover:bg-gray-200 transition-colors"
          >
            Detajet
          </button>
          <button
            onClick={() => onEdit(c)}
            className="p-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition-colors"
            title="Edito"
          >
            <Pencil size={13}/>
          </button>
          <button
            onClick={() => onDelete(c.id)}
            className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
            title="Fshi klientin"
          >
            <Trash2 size={13}/>
          </button>
        </div>
      </td>
    </tr>
  )
})

/* ══════════════════════════════════════════════════════════
   Faqja kryesore
══════════════════════════════════════════════════════════ */
export default function Customers() {
  const {
    customers, setCustomers, closeModal, fmt, invoices, showToast, page, navigate, logActivity,
    customersImportOpen: importOpen, setCustomersImportOpen: setImportOpen,
  } = useApp()
  const [search,        setSearch]        = useState('')
  const [typeFilt,      setTypeFilt]      = useState('all')
  const [countryFilt,   setCountryFilt]   = useState('all')
  const [sortBy,        setSortBy]        = useState('default')
  const [selected,      setSelected]      = useState(new Set())
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null) // null | 'single' | 'multiple'
  const [selectedCustomer, setSelectedCustomer] = useState(null) // Customer for details modal
  const [currentPage,   setCurrentPage]   = useState(1)
  const ITEMS_PER_PAGE = 20

  // Detect if we're in form mode (page like "customers:create" or "customers:ID:edit")
  const pageMatch = page.split(':')
  const isFormMode = pageMatch[0] === 'customers' && (pageMatch[1] === 'create' || pageMatch[1]?.includes('CUS-'))
  const editCustomerId = pageMatch[1]?.includes('CUS-') ? pageMatch[1] : null
  const editCustomer = editCustomerId ? customers.find(c => c.id === editCustomerId) : null

  // Close modal if we leave form mode
  useEffect(() => {
    if (!isFormMode) {
      closeModal()
    }
  }, [isFormMode, closeModal])

  function handleImportCustomers(rows) {
    setCustomers(prev => {
      const existing = new Set(prev.map(c => c.name?.toLowerCase()))
      const news = rows.filter(r => !existing.has(r.name?.toLowerCase()))
      showToast(`U importuan ${news.length} klientë të rinj`, 'success')
      return [...prev, ...news]
    })
  }

  const handleDeleteCustomer = (customerId) => {
    setSelected(new Set())
    setShowDeleteConfirm({ type: 'single', id: customerId })
  }

  const handleConfirmDelete = () => {
    if (showDeleteConfirm.type === 'single') {
      const name = customers.find(c => c.id === showDeleteConfirm.id)?.name
      setCustomers(prev => prev.filter(c => c.id !== showDeleteConfirm.id))
      logActivity(`Fshi klientin ${name}`, 'Klientët')
      showToast(`Klienti "${name}" u fshi ✓`, 'success')
    } else if (showDeleteConfirm.type === 'multiple') {
      const count = selected.size
      const names = customers.filter(c => selected.has(c.id)).map(c => c.name).join(', ')
      setCustomers(prev => prev.filter(c => !selected.has(c.id)))
      setSelected(new Set())
      logActivity(`Fshi ${count} klientë: ${names}`, 'Klientët')
      showToast(`${count} klientë u fshin ✓`, 'success')
    }
    setShowDeleteConfirm(null)
  }

  const toggleSelectCustomer = (customerId) => {
    setSelected(prev => {
      const newSelected = new Set(prev)
      if (newSelected.has(customerId)) {
        newSelected.delete(customerId)
      } else {
        newSelected.add(customerId)
      }
      return newSelected
    })
  }

  // If in form mode, show only the form
  if (isFormMode) {
    return (
      <div key={`customer-form-${editCustomerId || 'create'}`}>
        <FormPageWrapper
          title={editCustomer ? `Ndrysho Klientin` : 'Klient i Ri'}
          subtitle={editCustomer ? editCustomer.name : 'Krijo një klient të ri'}
          onBack={() => navigate('customers')}
        >
          <CustomerModal
            key={`modal-${editCustomerId || 'create'}`}
            customer={editCustomer || undefined}
            onClose={() => navigate('customers')}
            isFormPage={true}
          />
        </FormPageWrapper>
      </div>
    )
  }

  const toggleSelectAll = () => {
    const pageIds = new Set(paginatedCustomers.map(c => c.id))
    const allPageSelected = paginatedCustomers.every(c => selected.has(c.id))
    if (allPageSelected) {
      const newSelected = new Set(selected)
      pageIds.forEach(id => newSelected.delete(id))
      setSelected(newSelected)
    } else {
      const newSelected = new Set(selected)
      pageIds.forEach(id => newSelected.add(id))
      setSelected(newSelected)
    }
  }

  const usedCountries = useMemo(() => [...new Set(customers.map(c => c.country).filter(Boolean))], [customers])

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

  // Normalize text: convert spaces, underscores, dashes to uniform format for fuzzy search
  const normalize = (text) => (text || '').toLowerCase().replace(/[\s_-]/g, ' ').trim()

  const filtered = useMemo(() => {
    let result = customers.filter(c => {
      const name = c.name || `${c.firstName || ''} ${c.lastName || ''}`.trim()
      const searchNorm = normalize(search)
      const matchSearch  = !search ||
        normalize(name).includes(searchNorm) ||
        normalize(c.email || '').includes(searchNorm) ||
        normalize(c.phone || '').includes(searchNorm) ||
        normalize(c.app || '').includes(searchNorm) ||
        normalize(c.username || '').includes(searchNorm) ||
        normalize(c.referredBy || '').includes(searchNorm)
      const matchType    = typeFilt    === 'all' || c.type    === typeFilt
      const matchCountry = countryFilt === 'all' || c.country === countryFilt
      return matchSearch && matchType && matchCountry
    })

    // Apply sorting
    if (sortBy === 'alphabetic') {
      result.sort((a, b) => {
        const nameA = (a.name || `${a.firstName || ''} ${a.lastName || ''}`.trim()).toLowerCase()
        const nameB = (b.name || `${b.firstName || ''} ${b.lastName || ''}`.trim()).toLowerCase()
        return nameA.localeCompare(nameB)
      })
    }

    return result
  }, [customers, search, typeFilt, countryFilt, sortBy])

  /* stats — single pass instead of a country × customers nested scan */
  const { totalResellers, totalIndividuals, topCountry } = useMemo(() => {
    let resellers = 0
    let individuals = 0
    const countryCounts = new Map()
    for (const c of customers) {
      if (c.type === 'reseller') resellers++
      else if (c.type === 'individual') individuals++
      if (c.country) countryCounts.set(c.country, (countryCounts.get(c.country) || 0) + 1)
    }
    let top = null
    for (const [co, count] of countryCounts) {
      if (!top || count > top.count) top = { co, count }
    }
    return { totalResellers: resellers, totalIndividuals: individuals, topCountry: top }
  }, [customers])

  const openAdd  = ()     => navigate('customers:create')
  const openEdit = cust   => navigate(`customers:${cust.id}:edit`)

  /* Pagination */
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE)
  const startIdx = (currentPage - 1) * ITEMS_PER_PAGE
  const endIdx = startIdx + ITEMS_PER_PAGE
  const paginatedCustomers = filtered.slice(startIdx, endIdx)

  // Reset to page 1 when filters change
  if (currentPage > totalPages && currentPage > 1) {
    setCurrentPage(1)
  }

  return (
    <div>
      {/* Titulli, importi dhe +Shto Klient tani jetojnë te header-i global (Header.jsx,
         kur page === 'customers'); FAB-i mobil mbetet këtu. */}
      {importOpen && (
        <Suspense fallback={null}>
          <ImportExcelModal
            entity="customers"
            onImport={handleImportCustomers}
            onClose={() => setImportOpen(false)}
          />
        </Suspense>
      )}

      {/* Mini stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
        <div className="bg-white rounded-2xl border border-gray-200/90 shadow-sm px-4 py-4">
          <span className="text-3xl font-black font-mono tracking-tight text-gray-900 block">{customers.length}</span>
          <p className="text-xs text-gray-500 mt-1 font-bold">Klientë gjithsej</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200/90 shadow-sm px-4 py-4">
          <span className="text-3xl font-black font-mono tracking-tight text-blue-600 block">{totalIndividuals}</span>
          <p className="text-xs text-gray-500 mt-1 font-bold">Individualë</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200/90 shadow-sm px-4 py-4">
          <span className="text-3xl font-black font-mono tracking-tight text-purple-600 block">{totalResellers}</span>
          <p className="text-xs text-gray-500 mt-1 font-bold">Resellers</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200/90 shadow-sm px-4 py-4">
          <span className="text-3xl font-black font-mono tracking-tight text-emerald-600 block">{usedCountries.length}</span>
          <p className="text-xs text-gray-500 mt-1 font-bold flex flex-wrap items-center gap-1">
            Shtete
            {topCountry && (
              <span className="font-normal">· {topCountry.co} ({topCountry.count})</span>
            )}
          </p>
        </div>
      </div>

      {/* Filtrat */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-gray-200/90 shadow-sm mb-5">
        {/* Left: Select all + delete-selected + search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
          {paginatedCustomers.length > 0 && (
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-700 flex-shrink-0 whitespace-nowrap">
              <input
                type="checkbox"
                checked={paginatedCustomers.length > 0 && paginatedCustomers.every(c => selected.has(c.id))}
                onChange={toggleSelectAll}
                className="w-4 h-4 rounded border-gray-300 text-blue-500 cursor-pointer"
              />
              <span>{selected.size > 0 ? `${selected.size} zgjedhur` : 'Zgjidh faqen'}</span>
            </label>
          )}

          {selected.size > 0 && (
            <button
              onClick={() => setShowDeleteConfirm({ type: 'multiple' })}
              className="flex items-center justify-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-600 hover:bg-blue-100 rounded-xl px-3 py-1.5 text-xs font-bold transition-colors flex-shrink-0"
            >
              <Trash2 size={14}/>
              Fshi {selected.size}
            </button>
          )}

          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="w-full pl-8 pr-8 py-1.5 text-xs rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
              placeholder="Kërko emër, telefon..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Right: filters + sort + count */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="text-xs px-2.5 py-1.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-700 font-semibold outline-none focus:border-blue-400 cursor-pointer"
            value={typeFilt} onChange={e => setTypeFilt(e.target.value)}
          >
            <option value="all">Të gjitha llojet</option>
            <option value="individual">Individualë</option>
            <option value="reseller">Resellers</option>
          </select>

          <select
            className="text-xs px-2.5 py-1.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-700 font-semibold outline-none focus:border-blue-400 cursor-pointer"
            value={countryFilt} onChange={e => setCountryFilt(e.target.value)}
          >
            <option value="all">Të gjitha shtetet</option>
            {usedCountries.sort().map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <select
            className="text-xs px-2.5 py-1.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-700 font-semibold outline-none focus:border-blue-400 cursor-pointer"
            value={sortBy} onChange={e => setSortBy(e.target.value)}
          >
            <option value="default">Renditja — Parazgjedhur</option>
            <option value="alphabetic">A — Z (Alfabetik)</option>
          </select>

          <span className="text-xs font-bold text-gray-400 font-mono px-2">
            {filtered.length}
          </span>
        </div>
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
        <>
          {/* Desktop: table */}
          <div className="hidden sm:block bg-white rounded-2xl border border-gray-200/90 shadow-sm overflow-hidden mb-6">
            <div className="overflow-x-auto">
              <table className="w-full text-left" style={{ minWidth: 760 }}>
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="p-3 w-10"></th>
                    <th className="p-3 text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Klienti</th>
                    <th className="p-3 text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Kontaktet</th>
                    <th className="p-3 text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Aplikacioni / Panel</th>
                    <th className="p-3 text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Tipi</th>
                    <th className="p-3 text-[10px] font-extrabold text-gray-400 uppercase tracking-wider text-right">Totali</th>
                    <th className="p-3 text-[10px] font-extrabold text-gray-400 uppercase tracking-wider text-right">Fatura</th>
                    <th className="p-3 text-[10px] font-extrabold text-gray-400 uppercase tracking-wider text-right">Veprime</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedCustomers.map(c => (
                    <CustomerRow
                      key={c.id}
                      c={c}
                      onEdit={setSelectedCustomer}
                      fmt={fmt}
                      isLatePayer={latePayerNames.has(c.name)}
                      onDelete={handleDeleteCustomer}
                      checked={selected.has(c.id)}
                      onToggleSelect={() => toggleSelectCustomer(c.id)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile: cards */}
          <div className="sm:hidden grid grid-cols-1 gap-4 mb-6">
            {paginatedCustomers.map(c => (
              <CustomerCard
                key={c.id}
                c={c}
                onEdit={setSelectedCustomer}
                fmt={fmt}
                isLatePayer={latePayerNames.has(c.name)}
                onDelete={handleDeleteCustomer}
                checked={selected.has(c.id)}
                onToggleSelect={() => toggleSelectCustomer(c.id)}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8 pb-4">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                ← Mbrapa
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                  let pageNum
                  if (totalPages <= 5) {
                    pageNum = i + 1
                  } else if (currentPage <= 3) {
                    pageNum = i + 1
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i
                  } else {
                    pageNum = currentPage - 2 + i
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        currentPage === pageNum
                          ? 'bg-blue-500 text-white'
                          : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                })}
              </div>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Përpara →
              </button>
              <span className="text-xs text-gray-400 ml-2">
                Faqja {currentPage} nga {totalPages}
              </span>
            </div>
          )}
        </>
      )}

      {/* Delete confirmation dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full">
            <p className="text-sm font-bold text-gray-800 mb-2">Fshi {showDeleteConfirm.type === 'single' ? 'klientin' : 'klientët'}?</p>
            <p className="text-xs text-gray-500 mb-4">
              {showDeleteConfirm.type === 'single'
                ? `Ai klient do të fshihet përgjithmonë.`
                : `${selected.size} klientë do të fshihen përgjithmonë.`
              }
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="btn btn-outline btn-sm text-xs"
              >
                Anulo
              </button>
              <button
                onClick={handleConfirmDelete}
                className="btn btn-danger btn-sm text-xs"
              >
                Po, fshi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Details Modal */}
      {selectedCustomer && (
        <CustomerDetailsModal
          customer={selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
        />
      )}

      {/* Floating Action Button - Mobile only */}
      <div
        className="fab sm:hidden"
        onClick={openAdd}
        title="Shto klient"
      >
        <UserPlus size={28}/>
      </div>
    </div>
  )
}
