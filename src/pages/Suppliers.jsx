import { useState } from 'react'
import {
  Truck, Phone, Link2, Plus, Pencil, Trash2,
  MessageCircle, Send, ExternalLink, Search, X,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { EmptyState } from '../components/UI'
import { SupplierModal } from '../components/SupplierModal'

const cleanPhone = p => (p || '').replace(/[\s+\-()]/g, '')

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
  const fullLink = hasLink ? (vendor.panelLink.startsWith('http') ? vendor.panelLink : `https://${vendor.panelLink}`) : null

  return (
    <div className="bg-white dark:bg-dk-card rounded-2xl border border-gray-200/90 dark:border-white/[0.07] dark:hover:border-white/[0.14] shadow-sm hover:shadow-md transition-all duration-200 flex flex-col gap-3 p-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-[38px] h-[38px] rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 dark:from-accent dark:to-[#2563eb] flex items-center justify-center text-white font-black text-[13px] flex-shrink-0 select-none shadow-sm">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-900 dark:text-white truncate leading-tight">{vendor.name}</p>
            <span className="text-[9px] font-extrabold text-gray-400 dark:text-[#8b8e99] uppercase tracking-wider">Furnitor</span>
          </div>
        </div>
        {/* Edit / Delete — always visible */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            className="w-[26px] h-[26px] flex items-center justify-center rounded-lg bg-gray-100 dark:bg-transparent text-gray-500 dark:text-[#8b8e99] hover:bg-gray-200 dark:hover:bg-dk-high dark:hover:text-white transition-colors"
            onClick={() => onEdit(vendor)}
            title="Edito"
          >
            <Pencil size={13} />
          </button>
          <button
            className="w-[26px] h-[26px] flex items-center justify-center rounded-lg bg-gray-100 dark:bg-transparent text-gray-500 dark:text-[#8b8e99] hover:bg-blue-50 dark:hover:bg-dk-high hover:text-blue-600 dark:hover:text-accent-soft transition-colors"
            onClick={() => onDelete(vendor)}
            title="Fshi"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="space-y-1.5 dark:border-t dark:border-white/[0.06] dark:pt-3">
        {hasPhone ? (
          <div className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300 font-mono">
            <Phone size={13} className="text-gray-400 dark:text-gray-500 flex-shrink-0" />
            <span>{vendor.phone}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 italic">
            <Phone size={13} className="flex-shrink-0" />
            <span>Pa numër telefoni</span>
          </div>
        )}

        {hasLink ? (
          <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-accent-soft truncate">
            <Link2 size={13} className="text-gray-400 dark:text-gray-500 flex-shrink-0" />
            <a
              href={fullLink}
              target="_blank"
              rel="noopener noreferrer"
              className="truncate hover:underline font-mono text-[11px]"
              onClick={e => e.stopPropagation()}
            >
              {vendor.panelLink.replace(/^https?:\/\//, '')}
            </a>
            <ExternalLink size={11} className="text-gray-400 dark:text-gray-500 flex-shrink-0" />
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 italic">
            <Link2 size={13} className="flex-shrink-0" />
            <span>Pa link paneli</span>
          </div>
        )}
      </div>

      {/* Veprimet — WhatsApp + Telegram */}
      {hasPhone && (
        <div className="flex gap-2 pt-3 border-t border-gray-100 dark:border-white/[0.06]">
          <a
            href={`https://wa.me/${phone}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-[11px] font-bold hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors"
            title="WhatsApp"
          >
            <MessageCircle size={13} /> WhatsApp
          </a>
          <a
            href={`https://t.me/+${phone}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 text-[11px] font-bold hover:bg-sky-100 dark:hover:bg-sky-900/50 transition-colors"
            title="Telegram"
          >
            <Send size={13} /> Telegram
          </a>
          {hasLink && (
            <a
              href={fullLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-gray-100 dark:bg-dk-high text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dk-line transition-colors flex-shrink-0"
              title="Hap panelin"
            >
              <ExternalLink size={13} />
            </a>
          )}
        </div>
      )}

      {/* Nëse nuk ka telefon por ka link */}
      {!hasPhone && hasLink && (
        <div className="pt-3 border-t border-gray-100 dark:border-white/[0.06]">
          <a
            href={fullLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-gray-100 dark:bg-dk-high text-gray-600 dark:text-gray-300 text-[11px] font-bold hover:bg-gray-200 dark:hover:bg-dk-line transition-colors w-full"
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
      {/* Titulli dhe +Shto furnitor tani jetojnë te header-i global (Header.jsx,
         kur page === 'suppliers'). */}

      {/* Kërkimi */}
      <div className="bg-white dark:bg-dk-low p-3 rounded-2xl border border-gray-200/90 dark:border-white/[0.07] shadow-sm mb-5">
        <div className="relative w-full sm:w-80">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
          <input
            className="w-full pl-8 pr-8 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-transparent bg-gray-50 dark:bg-dk-card text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 dark:focus:border-accent/60 dark:focus:ring-accent/20"
            placeholder="Kërko furnitor..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <X size={13} />
            </button>
          )}
        </div>
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
