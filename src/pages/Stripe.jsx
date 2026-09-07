import { useState } from 'react'
import { CreditCard, Copy, Plus, Pencil, Trash2, ExternalLink } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { EmptyState, Modal, FormGroup } from '../components/UI'

/* ══════════════════════════════════════════════════════════
   Modal — shto/edito një link Stripe
══════════════════════════════════════════════════════════ */
function StripeLinkModal({ link, onClose }) {
  const { setStripeLinks, showToast } = useApp()
  const [amount, setAmount] = useState(link?.amount ?? '')
  const [url,    setUrl]    = useState(link?.url || '')
  const [err,    setErr]    = useState('')

  const save = () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) { setErr('Shuma duhet të jetë numër pozitiv.'); return }
    if (!url.trim()) { setErr('Linku i Stripe është i domosdoshëm.'); return }

    if (link) {
      setStripeLinks(prev => prev.map(l => l.id === link.id
        ? { ...l, amount: Number(amount), url: url.trim() }
        : l
      ))
      showToast('Linku u përditësua ✓')
    } else {
      setStripeLinks(prev => [...prev, {
        id: `STL-${Date.now()}`,
        amount: Number(amount),
        url: url.trim(),
      }])
      showToast('Linku u shtua ✓')
    }
    onClose()
  }

  return (
    <Modal
      title={link ? 'Ndrysho Linkun' : 'Link i Ri Stripe'}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-outline" onClick={onClose}>Anulo</button>
          <button className="btn btn-primary" onClick={save}>Ruaj</button>
        </>
      }
    >
      <div className="space-y-4">
        <FormGroup label="Shuma (€)">
          <input
            type="number"
            step="0.01"
            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            placeholder="25.00"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            autoFocus
          />
        </FormGroup>
        <FormGroup label="Link Stripe (Payment Link)">
          <input
            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            placeholder="https://buy.stripe.com/..."
            value={url}
            onChange={e => setUrl(e.target.value)}
          />
        </FormGroup>
        {err && <p className="text-xs text-red-600 dark:text-red-400 font-semibold">{err}</p>}
      </div>
    </Modal>
  )
}

/* ══════════════════════════════════════════════════════════
   Karta e linkut
══════════════════════════════════════════════════════════ */
function StripeLinkCard({ link, onEdit, onDelete, fmt }) {
  const { showToast } = useApp()

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link.url)
      showToast(`Linku ${fmt(link.amount)} u kopjua ✓`)
    } catch {
      showToast('S\'mund ta kopjoj — kopjoje dorazi.', 'error')
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/90 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-lg font-black font-mono text-gray-900 dark:text-gray-100">{fmt(link.amount)}</p>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            className="w-[26px] h-[26px] flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            onClick={() => onEdit(link)}
            title="Edito"
          >
            <Pencil size={13} />
          </button>
          <button
            className="w-[26px] h-[26px] flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            onClick={() => onDelete(link)}
            title="Fshi"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400 font-mono truncate bg-gray-50 dark:bg-gray-900/50 rounded-lg px-2.5 py-1.5">
        <a href={link.url} target="_blank" rel="noopener noreferrer" className="truncate hover:underline flex-1" title={link.url}>
          {link.url.replace(/^https?:\/\//, '')}
        </a>
        <ExternalLink size={11} className="flex-shrink-0 text-gray-400 dark:text-gray-500" />
      </div>

      <button
        onClick={copyLink}
        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs font-bold hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
      >
        <Copy size={13} /> Kopjo Linkun
      </button>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════
   Faqja kryesore — Stripe
══════════════════════════════════════════════════════════ */
export default function Stripe() {
  const { stripeLinks, setStripeLinks, setModal, closeModal, fmt } = useApp()

  const sorted = [...stripeLinks].sort((a, b) => a.amount - b.amount)

  const openAdd  = ()  => setModal(<StripeLinkModal onClose={closeModal} />)
  const openEdit = (l) => setModal(<StripeLinkModal link={l} onClose={closeModal} />)

  const handleDelete = (link) => {
    if (!window.confirm(`A je i sigurt që dëshiron ta fshish linkun ${fmt(link.amount)}?`)) return
    setStripeLinks(prev => prev.filter(l => l.id !== link.id))
  }

  return (
    <div>
      {/* Titulli "Stripe" jeton te header-i global (Header.jsx, kur page === 'stripe'). */}
      <div className="flex justify-end mb-5">
        <button className="btn btn-primary" onClick={openAdd}>
          <Plus size={14} /> Link i Ri
        </button>
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="Nuk ka ende linqe Stripe"
          sub="Shto linqet e tua ekzistuese të Stripe Payment Links, sipas shumës"
          action={
            <button className="btn btn-primary mt-2" onClick={openAdd}>
              <Plus size={14} /> Shto linkun e parë
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sorted.map(l => (
            <StripeLinkCard key={l.id} link={l} onEdit={openEdit} onDelete={handleDelete} fmt={fmt} />
          ))}
        </div>
      )}
    </div>
  )
}
