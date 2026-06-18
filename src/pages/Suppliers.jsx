import { useState } from 'react'
import {
  Truck, Phone, Link2, Plus, Pencil, Trash2,
  MessageCircle, Send, ExternalLink, Search, X,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Modal, FormGroup, EmptyState } from '../components/UI'

const cleanPhone = p => (p || '').replace(/[\s+\-()]/g, '')

/* ══════════════════════════════════════════════════════════
   Modal — shto / edito furnitor
══════════════════════════════════════════════════════════ */
function SupplierModal({ supplier, onClose }) {
  const { setVendors, showToast } = useApp()
  const isEdit = !!supplier

  const [form, setForm] = useState({
    name:      supplier?.name      || '',
    phone:     supplier?.phone     || '',
    panelLink: supplier?.panelLink || '',
  })
  const [err, setErr] = useState('')
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const save = () => {
    if (!form.name.trim()) { setErr('Emri i furnitorit është i detyrueshëm.'); return }

    const payload = {
      id:        isEdit ? supplier.id : `VEN-${Date.now()}`,
      name:      form.name.trim(),
      phone:     form.phone.trim(),
      panelLink: form.panelLink.trim(),
    }

    if (isEdit) {
      setVendors(prev => prev.map(v => v.id === supplier.id ? payload : v))
      showToast('Furnitori u përditësua! ✓')
    } else {
      setVendors(prev => [...prev, payload])
      showToast('Furnitori u shtua me sukses! ✓')
    }
    onClose()
  }

  return (
    <Modal
      title={
        <span className="flex items-center gap-2">
          <Truck size={18} className="text-blue-500" />
          {isEdit ? `Edito — ${supplier.name}` : 'Furnitor i ri'}
        </span>
      }
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-outline" onClick={onClose}>Anulo</button>
          <button className="btn btn-primary btn-sm self-start sm:self-auto" onClick={save}>
            {isEdit ? 'Ruaj ndryshimet' : 'Shto furnitorin'}
          </button>
        </>
      }
    >
      {err && (
        <div className="text-xs text-blue-500 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 mb-4">
          {err}
        </div>
      )}

      {/* Emri i furnitorit */}
      <FormGroup label="Furnitori *">
        <input
          className="form-control"
          value={form.name}
          onChange={e => set('name', e.target.value)}
          placeholder="p.sh. Predator"
          autoFocus
        />
      </FormGroup>

      {/* Numri i telefonit */}
      <FormGroup label="Numri i telefonit">
        <div className="relative">
          <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            className="form-control pl-9"
            value={form.phone}
            onChange={e => set('phone', e.target.value)}
            placeholder="+383 44 000 000"
          />
        </div>
      </FormGroup>

      {/* Linku i panelit */}
      <FormGroup label="Linku i panelit">
        <div className="relative">
          <Link2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            className="form-control pl-9"
            value={form.panelLink}
            onChange={e => set('panelLink', e.target.value)}
            placeholder="https://panel.furnitori.com"
          />
        </div>
      </FormGroup>
    </Modal>
  )
}

/* ══════════════════════════════════════════════════════════
   Karta e furnitorit
══════════════════════════════════════════════════════════ */
function SupplierCard({ vendor, onEdit, onDelete }) {
  const phone = cleanPhone(vendor.phone)

  /* initiali për avatar */
  const initials = vendor.name
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const hasLink  = !!vendor.panelLink
  const hasPhone = !!vendor.phone

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 hover:border-blue-200 hover:shadow-md transition-all duration-200 group flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-base flex-shrink-0 select-none">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-800 truncate">{vendor.name}</p>
          <p className="text-[11px] text-gray-400 mt-0.5 uppercase tracking-wide">Furnitor</p>
        </div>
        {/* Edit / Delete */}
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-500 transition-colors"
            onClick={() => onEdit(vendor)}
            title="Edito"
          >
            <Pencil size={14} />
          </button>
          <button
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-500 transition-colors"
            onClick={() => onDelete(vendor)}
            title="Fshi"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="space-y-2 flex-1">
        {hasPhone ? (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Phone size={13} className="text-gray-400 flex-shrink-0" />
            <span>{vendor.phone}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-gray-300 italic">
            <Phone size={13} className="flex-shrink-0" />
            <span>Pa numër telefoni</span>
          </div>
        )}

        {hasLink ? (
          <div className="flex items-center gap-2 text-sm text-blue-500 truncate">
            <Link2 size={13} className="text-gray-400 flex-shrink-0" />
            <a
              href={vendor.panelLink.startsWith('http') ? vendor.panelLink : `https://${vendor.panelLink}`}
              target="_blank"
              rel="noopener noreferrer"
              className="truncate hover:underline"
              onClick={e => e.stopPropagation()}
            >
              {vendor.panelLink.replace(/^https?:\/\//, '')}
            </a>
            <ExternalLink size={11} className="text-gray-400 flex-shrink-0" />
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-gray-300 italic">
            <Link2 size={13} className="flex-shrink-0" />
            <span>Pa link paneli</span>
          </div>
        )}
      </div>

      {/* Veprimet — WhatsApp + Telegram */}
      {hasPhone && (
        <div className="flex gap-2 pt-3 border-t border-gray-50">
          <a
            href={`https://wa.me/${phone}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-green-50 text-green-600 text-xs font-semibold hover:bg-green-100 transition-colors"
            title="WhatsApp"
          >
            <MessageCircle size={13} /> WhatsApp
          </a>
          <a
            href={`https://t.me/+${phone}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-sky-50 text-sky-600 text-xs font-semibold hover:bg-sky-100 transition-colors"
            title="Telegram"
          >
            <Send size={13} /> Telegram
          </a>
          {hasLink && (
            <a
              href={vendor.panelLink.startsWith('http') ? vendor.panelLink : `https://${vendor.panelLink}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-blue-50 text-blue-500 text-xs font-semibold hover:bg-blue-100 transition-colors"
              title="Hap panelin"
            >
              <ExternalLink size={13} />
            </a>
          )}
        </div>
      )}

      {/* Nëse nuk ka telefon por ka link */}
      {!hasPhone && hasLink && (
        <div className="pt-3 border-t border-gray-50">
          <a
            href={vendor.panelLink.startsWith('http') ? vendor.panelLink : `https://${vendor.panelLink}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-blue-50 text-blue-500 text-xs font-semibold hover:bg-blue-100 transition-colors w-full"
          >
            <ExternalLink size={13} /> Hap panelin
          </a>
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════
   Faqja kryesore — Furnitorët
══════════════════════════════════════════════════════════ */
export default function Suppliers() {
  const { vendors, setVendors, setModal, closeModal, showToast } = useApp()
  const [search, setSearch] = useState('')

  const filtered = vendors.filter(v =>
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    (v.phone || '').includes(search) ||
    (v.panelLink || '').toLowerCase().includes(search.toLowerCase())
  )

  const openAdd  = ()  => setModal(<SupplierModal onClose={closeModal} />)
  const openEdit = (v) => setModal(<SupplierModal supplier={v} onClose={closeModal} />)

  const handleDelete = (vendor) => {
    if (!window.confirm(`A je i sigurt që dëshiron ta fshish "${vendor.name}"?`)) return
    setVendors(prev => prev.filter(v => v.id !== vendor.id))
    showToast(`"${vendor.name}" u fshi. ✓`, 'success')
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Furnitorët</h2>
          <p className="text-sm text-gray-400 mt-0.5">{vendors.length} furnitor{vendors.length !== 1 ? 'ë' : ''} gjithsej</p>
        </div>
        <button className="btn btn-primary btn-sm self-start sm:self-auto" onClick={openAdd}>
          <Plus size={16} /> Shto furnitor
        </button>
      </div>

      {/* Kërkimi */}
      <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2
                      focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-50
                      transition-all mb-6 w-full max-w-sm">
        <Search size={14} className="text-gray-400 flex-shrink-0" />
        <input
          className="bg-transparent border-none outline-none text-sm text-gray-600 w-full placeholder-gray-400"
          placeholder="Kërko furnitor..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && (
          <button onClick={() => setSearch('')} className="text-gray-300 hover:text-gray-500">
            <X size={13} />
          </button>
        )}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="Nuk u gjet asnjë furnitor"
          sub={search ? 'Provo kërkim tjetër' : 'Shto furnitorin e parë'}
          action={!search && (
            <button className="btn btn-primary mt-2" onClick={openAdd}>
              <Plus size={14} /> Shto furnitor
            </button>
          )}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(v => (
            <SupplierCard
              key={v.id}
              vendor={v}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}


