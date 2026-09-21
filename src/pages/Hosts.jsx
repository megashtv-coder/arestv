import { useState, useMemo } from 'react'
import {
  Search, Plus, Copy, Check, ExternalLink, Pencil, Trash2, X,
  ArrowUpDown, Server,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Modal, FormGroup } from '../components/UI'

const CATEGORY_FILTERS = [
  { id: 'all',      label: 'Të Gjitha' },
  { id: 'general',  label: 'Të përgjithshëm' },
  { id: 'italy',    label: 'Itali' },
  { id: 'england',  label: 'Angli' },
]
const CATEGORY_LABEL = Object.fromEntries(CATEGORY_FILTERS.map(f => [f.id, f.label]))

/* ══════════════════════════════════════════════════════════
   Modal — shto/edito një host
══════════════════════════════════════════════════════════ */
function HostModal({ host, onClose }) {
  const { setHosts, showToast, fmt } = useApp()
  const [amount,      setAmount]      = useState(host?.amount ?? '')
  const [url,         setUrl]         = useState(host?.url || '')
  const [description, setDescription] = useState(host?.description || '')
  const [category,    setCategory]    = useState(host?.category || 'general')
  const [isPopular,   setIsPopular]   = useState(host?.isPopular || false)
  const [err, setErr] = useState('')

  const save = () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) { setErr('Shuma duhet të jetë numër pozitiv.'); return }
    let cleanUrl = url.trim()
    if (!cleanUrl) { setErr('Linku është i domosdoshëm.'); return }
    if (!/^https?:\/\//i.test(cleanUrl)) cleanUrl = `https://${cleanUrl}`

    if (host) {
      setHosts(prev => prev.map(h => h.id === host.id
        ? { ...h, amount: Number(amount), url: cleanUrl, description: description.trim(), category, isPopular }
        : h
      ))
      showToast(`Host-i ${fmt(Number(amount))} u përditësua ✓`)
    } else {
      setHosts(prev => [...prev, {
        id: `HST-${Date.now()}`,
        amount: Number(amount),
        url: cleanUrl,
        description: description.trim(),
        category,
        isPopular,
      }])
      showToast(`Host-i ${fmt(Number(amount))} u shtua ✓`)
    }
    onClose()
  }

  return (
    <Modal
      title={host ? 'Ndrysho Host-in' : 'Host i Ri'}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-outline" onClick={onClose}>Anulo</button>
          <button className="btn btn-primary" onClick={save}>{host ? 'Ruaj Ndryshimet' : 'Shto Host-in'}</button>
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
        <FormGroup label="Link">
          <input
            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            placeholder="https://..."
            value={url}
            onChange={e => setUrl(e.target.value)}
          />
        </FormGroup>
        <FormGroup label="Kategoria">
          <select
            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={category}
            onChange={e => setCategory(e.target.value)}
          >
            {CATEGORY_FILTERS.filter(f => f.id !== 'all').map(f => (
              <option key={f.id} value={f.id}>{f.label}</option>
            ))}
          </select>
        </FormGroup>
        <FormGroup label="Përshkrim (opsional)">
          <input
            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="p.sh. Server kryesor..."
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
        </FormGroup>
        <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-gray-300 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={isPopular}
            onChange={e => setIsPopular(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-500 focus:ring-blue-500"
          />
          Shëno si "Popullore"
        </label>
        {err && <p className="text-xs text-red-600 dark:text-red-400 font-semibold">{err}</p>}
      </div>
    </Modal>
  )
}

/* ══════════════════════════════════════════════════════════
   Karta e host-it
══════════════════════════════════════════════════════════ */
function HostCard({ host, onEdit, onDelete, fmt }) {
  const { showToast } = useApp()
  const [copied, setCopied] = useState(false)

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(host.url)
      setCopied(true)
      showToast(`Linku ${fmt(host.amount)} u kopjua ✓`)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      showToast('S\'mund ta kopjoj — kopjoje dorazi.', 'error')
    }
  }

  const cleanUrl = host.url.replace(/^https?:\/\//, '').replace(/\/$/, '')

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-2xl border transition-all duration-200 p-4 flex flex-col gap-3 ${
      copied
        ? 'border-emerald-300 dark:border-emerald-700 ring-2 ring-emerald-500/10'
        : 'border-gray-200/90 dark:border-gray-700 hover:shadow-md hover:border-blue-200 dark:hover:border-blue-900/50'
    }`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
          <p className="text-lg font-black font-mono text-gray-900 dark:text-gray-100">{fmt(host.amount)}</p>
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 flex-shrink-0">
            {CATEGORY_LABEL[host.category] || CATEGORY_LABEL.general}
          </span>
          {host.isPopular && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex-shrink-0">
              Popullore
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            className="w-[26px] h-[26px] flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            onClick={() => onEdit(host)}
            title="Edito"
          >
            <Pencil size={13} />
          </button>
          <button
            className="w-[26px] h-[26px] flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            onClick={() => onDelete(host)}
            title="Fshi"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {host.description && (
        <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2 truncate">{host.description}</p>
      )}

      <div
        onClick={copyLink}
        role="button"
        tabIndex={0}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') copyLink() }}
        className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors cursor-pointer"
        title="Kliko për të kopjuar"
      >
        <span className="font-mono text-[11px] text-gray-500 dark:text-gray-400 truncate">{cleanUrl}</span>
        <a
          href={host.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className="text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 flex-shrink-0"
          title="Hap linkun"
        >
          <ExternalLink size={13} />
        </a>
      </div>

      <button
        onClick={copyLink}
        className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all ${
          copied
            ? 'bg-emerald-500 text-white'
            : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40'
        }`}
      >
        {copied ? <><Check size={13} /> U kopjua!</> : <><Copy size={13} /> Kopjo Linkun</>}
      </button>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════
   Faqja kryesore — Hostet
══════════════════════════════════════════════════════════ */
export default function Hosts() {
  const { hosts, setHosts, setModal, closeModal, fmt } = useApp()
  const [search, setSearch] = useState('')
  const [sortDir, setSortDir] = useState('asc') // 'asc' | 'desc' — sipas shumës
  const [categoryFilter, setCategoryFilter] = useState('all')

  const filtered = useMemo(() => hosts
    .filter(h => {
      if (categoryFilter !== 'all' && (h.category || 'general') !== categoryFilter) return false

      if (!search.trim()) return true
      const q = search.trim().toLowerCase()
      return (
        String(h.amount).includes(q) ||
        h.url.toLowerCase().includes(q) ||
        (h.description || '').toLowerCase().includes(q)
      )
    })
    .sort((a, b) => sortDir === 'asc' ? a.amount - b.amount : b.amount - a.amount),
    [hosts, search, categoryFilter, sortDir]
  )

  const openAdd  = ()  => setModal(<HostModal onClose={closeModal} />)
  const openEdit = (h) => setModal(<HostModal host={h} onClose={closeModal} />)

  const handleDelete = (host) => {
    if (!window.confirm(`A je i sigurt që dëshiron ta fshish host-in ${fmt(host.amount)}?`)) return
    setHosts(prev => prev.filter(h => h.id !== host.id))
  }

  return (
    <div className="space-y-4">
      {/* Titulli "Hostet" jeton te header-i global (Header.jsx, kur page === 'hosts'). */}

      {/* Kërkimi, filtrat, renditja, + Host i Ri */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-xl">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
          <input
            className="w-full pl-9 pr-9 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 text-xs font-medium outline-none focus:ring-2 focus:ring-blue-50 dark:focus:ring-blue-900/20 focus:border-blue-400 transition-all"
            placeholder="Kërko sipas shumës ose linkut..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <X size={13} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <div className="flex items-center p-1 bg-gray-100 dark:bg-gray-800/80 rounded-xl border border-gray-200/60 dark:border-gray-700/60 text-xs font-medium text-gray-600 dark:text-gray-300 flex-shrink-0">
            {CATEGORY_FILTERS.map(f => (
              <button
                key={f.id}
                onClick={() => setCategoryFilter(f.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  categoryFilter === f.id
                    ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                    : 'hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {f.id === 'all' ? `${f.label} (${hosts.length})` : f.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
            title={sortDir === 'asc' ? 'Duke renditur: më e vogla te më e madhja' : 'Duke renditur: më e madhja te më e vogla'}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs font-semibold transition-all flex-shrink-0"
          >
            <ArrowUpDown size={14} />
            <span className="hidden md:inline">{sortDir === 'asc' ? '€ ↑' : '€ ↓'}</span>
          </button>

          <button className="btn btn-primary flex-shrink-0" onClick={openAdd}>
            <Plus size={14} /> Host i Ri
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-500 mx-auto flex items-center justify-center">
            <Server size={22} />
          </div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">
            {hosts.length === 0 ? 'Nuk ka ende hoste' : `Nuk u gjet asnjë host${search ? ` për "${search}"` : ''}`}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
            {hosts.length === 0
              ? 'Shto hostet e tua, sipas kategorisë (Të përgjithshëm, Itali, Angli).'
              : 'Provo kërkim tjetër ose ndrysho filtrin, ose shto një host të ri.'}
          </p>
          <button className="btn btn-primary mt-1" onClick={openAdd}>
            <Plus size={14} /> {hosts.length === 0 ? 'Shto host-in e parë' : 'Shto Host të Ri'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(h => (
            <HostCard key={h.id} host={h} onEdit={openEdit} onDelete={handleDelete} fmt={fmt} />
          ))}
        </div>
      )}
    </div>
  )
}
