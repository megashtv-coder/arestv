import { useState, useMemo } from 'react'
import {
  Search, Plus, Copy, Check, ExternalLink, Pencil, Trash2, X,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Modal, FormGroup } from '../components/UI'

const CATEGORIES = [
  { id: 'general', label: 'Të Përgjithshme' },
  { id: 'italy',   label: 'Itali' },
  { id: 'england', label: 'Angli' },
]

/* ══════════════════════════════════════════════════════════
   Modal — shto/edito një host
══════════════════════════════════════════════════════════ */
function HostModal({ host, defaultCategory, onClose }) {
  const { setHosts, showToast } = useApp()
  const [url,         setUrl]         = useState(host?.url || '')
  const [category,    setCategory]    = useState(host?.category || defaultCategory || 'general')
  const [description, setDescription] = useState(host?.description || '')
  const [isPopular,   setIsPopular]   = useState(host?.isPopular || false)
  const [err, setErr] = useState('')

  const save = () => {
    let cleanUrl = url.trim()
    if (!cleanUrl) { setErr('Linku është i domosdoshëm.'); return }
    if (!/^https?:\/\//i.test(cleanUrl)) cleanUrl = `https://${cleanUrl}`

    if (host) {
      setHosts(prev => prev.map(h => h.id === host.id
        ? { ...h, url: cleanUrl, category, description: description.trim(), isPopular }
        : h
      ))
      showToast('Host-i u përditësua ✓')
    } else {
      setHosts(prev => [...prev, {
        id: `HST-${Date.now()}`,
        url: cleanUrl,
        category,
        description: description.trim(),
        isPopular,
      }])
      showToast('Host-i u shtua ✓')
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
        <FormGroup label="Link">
          <input
            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            placeholder="https://..."
            value={url}
            onChange={e => setUrl(e.target.value)}
            autoFocus
          />
        </FormGroup>
        <FormGroup label="Kategoria">
          <select
            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={category}
            onChange={e => setCategory(e.target.value)}
          >
            {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
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
   Rreshti i host-it (brenda kolonës)
══════════════════════════════════════════════════════════ */
function HostRow({ host, onEdit, onDelete }) {
  const { showToast } = useApp()
  const [copied, setCopied] = useState(false)

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(host.url)
      setCopied(true)
      showToast('Linku u kopjua ✓')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      showToast('S\'mund ta kopjoj — kopjoje dorazi.', 'error')
    }
  }

  const cleanUrl = host.url.replace(/^https?:\/\//, '').replace(/\/$/, '')

  return (
    <div className={`group flex items-center gap-1 rounded-xl border px-3 py-2 transition-colors ${
      copied
        ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-900/10'
        : 'border-gray-100 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-900/50 hover:bg-gray-50 dark:hover:bg-gray-900/40'
    }`}>
      <button onClick={copyLink} className="min-w-0 flex-1 text-left" title="Kliko për të kopjuar">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-mono text-xs text-gray-700 dark:text-gray-300 truncate">{cleanUrl}</span>
          {host.isPopular && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex-shrink-0">
              Popullore
            </span>
          )}
        </div>
        {host.description && (
          <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate">{host.description}</p>
        )}
      </button>

      <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
        {copied
          ? <Check size={14} className="text-emerald-500 mx-1" />
          : <Copy size={14} className="text-gray-300 dark:text-gray-600 mx-1" />
        }
        <a
          href={host.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className="p-1 rounded-lg text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30"
          title="Hap linkun"
        >
          <ExternalLink size={13} />
        </a>
        <button
          onClick={() => onEdit(host)}
          className="p-1 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
          title="Edito"
        >
          <Pencil size={13} />
        </button>
        <button
          onClick={() => onDelete(host)}
          className="p-1 rounded-lg text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30"
          title="Fshi"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════
   Faqja kryesore — Hostet (tabelë me kolona sipas rajonit)
══════════════════════════════════════════════════════════ */
export default function Hosts() {
  const { hosts, setHosts, setModal, closeModal } = useApp()
  const [search, setSearch] = useState('')

  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase()
    const matches = h => !q || h.url.toLowerCase().includes(q) || (h.description || '').toLowerCase().includes(q)
    return Object.fromEntries(
      CATEGORIES.map(c => [c.id, hosts.filter(h => (h.category || 'general') === c.id && matches(h))])
    )
  }, [hosts, search])

  const openAdd  = (category) => setModal(<HostModal defaultCategory={category} onClose={closeModal} />)
  const openEdit = (h)        => setModal(<HostModal host={h} onClose={closeModal} />)

  const handleDelete = (host) => {
    if (!window.confirm(`A je i sigurt që dëshiron ta fshish "${host.url}"?`)) return
    setHosts(prev => prev.filter(h => h.id !== host.id))
  }

  return (
    <div className="space-y-4">
      {/* Titulli "Hostet" jeton te header-i global (Header.jsx, kur page === 'hosts'). */}

      {/* Kërkimi */}
      <div className="relative max-w-xl">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
        <input
          className="w-full pl-9 pr-9 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 text-xs font-medium outline-none focus:ring-2 focus:ring-blue-50 dark:focus:ring-blue-900/20 focus:border-blue-400 transition-all"
          placeholder="Kërko sipas linkut..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X size={13} />
          </button>
        )}
      </div>

      {/* Tabela — një kolonë për rajon */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {CATEGORIES.map(cat => (
          <div key={cat.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
              <h3 className="text-xs font-black uppercase tracking-wide text-gray-700 dark:text-gray-200">
                {cat.label} <span className="text-gray-400 dark:text-gray-500 font-bold">({grouped[cat.id].length})</span>
              </h3>
              <button
                onClick={() => openAdd(cat.id)}
                className="w-6 h-6 flex items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                title={`Shto host te ${cat.label}`}
              >
                <Plus size={14} />
              </button>
            </div>

            <div className="p-3 flex flex-col gap-2 flex-1">
              {grouped[cat.id].length === 0 ? (
                <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-6">
                  {hosts.length === 0 ? 'Nuk ka ende hoste.' : `Asnjë rezultat${search ? ` për "${search}"` : ''}.`}
                </p>
              ) : (
                grouped[cat.id].map(h => (
                  <HostRow key={h.id} host={h} onEdit={openEdit} onDelete={handleDelete} />
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
