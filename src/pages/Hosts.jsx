import { useState, useMemo } from 'react'
import {
  Search, Plus, Copy, Check, ExternalLink, Pencil, Trash2, X, FolderPlus, Server,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Modal, FormGroup } from '../components/UI'
import { defaultHostCategories } from '../data/mockData'

const DEFAULT_IDS = new Set(defaultHostCategories.map(c => c.id))
const FLAG_SUGGESTIONS = ['🌐', '🇮🇹', '🇬🇧', '🇩🇪', '🇫🇷', '🇨🇭', '🇦🇹', '🇺🇸', '🇪🇸', '🇳🇱', '🇧🇪', '🇸🇪']
const inputCls = 'w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500'

// "http://host:8080/" → { domain: 'host', port: '8080' }
function splitUrl(url = '') {
  const clean = url.replace(/^https?:\/\//i, '').replace(/\/+$/, '')
  const m = clean.match(/^([^:/]+)(?::(\d+))?(.*)$/)
  return m ? { domain: m[1] + (m[3] || ''), port: m[2] || '' } : { domain: clean, port: '' }
}

/* ── Modal — kategori e re ── */
function CategoryModal({ onClose }) {
  const { hostCategories, setHostCategories, showToast } = useApp()
  const [name, setName] = useState('')
  const [flag, setFlag] = useState('🌐')
  const [err,  setErr]  = useState('')

  const save = () => {
    const n = name.trim()
    if (!n) { setErr('Emri i kategorisë është i domosdoshëm.'); return }
    if (hostCategories.some(c => c.name.toLowerCase() === n.toLowerCase())) { setErr('Ekziston tashmë një kategori me këtë emër.'); return }
    setHostCategories(prev => [...prev, { id: `cat-${Date.now()}`, name: n.toUpperCase(), flag: flag.trim() || '🌐' }])
    showToast('Kategoria u shtua ✓')
    onClose()
  }

  return (
    <Modal
      title="Kategori e Re"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-outline" onClick={onClose}>Anulo</button>
          <button className="btn btn-primary" onClick={save}>Shto Kategorinë</button>
        </>
      }
    >
      <div className="space-y-4">
        <FormGroup label="Emri">
          <input className={inputCls} placeholder="p.sh. Gjermani" value={name} onChange={e => setName(e.target.value)} autoFocus />
        </FormGroup>
        <FormGroup label="Flamuri">
          <div className="flex flex-wrap gap-1.5 mb-2">
            {FLAG_SUGGESTIONS.map(f => (
              <button
                key={f} type="button" onClick={() => setFlag(f)}
                className={`w-9 h-9 rounded-lg text-lg border transition-colors ${flag === f ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/30' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
              >{f}</button>
            ))}
          </div>
          <input className={inputCls} value={flag} onChange={e => setFlag(e.target.value)} maxLength={8} />
        </FormGroup>
        {err && <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold">{err}</p>}
      </div>
    </Modal>
  )
}

/* ── Modal — shto/edito host ── */
function HostModal({ host, defaultCategory, onClose }) {
  const { setHosts, hostCategories, showToast } = useApp()
  const [url,         setUrl]         = useState(host?.url || '')
  const [category,    setCategory]    = useState(host?.category || defaultCategory || 'general')
  const [description, setDescription] = useState(host?.description || '')
  const [isPopular,   setIsPopular]   = useState(host?.isPopular || false)
  const [err, setErr] = useState('')

  const save = () => {
    let cleanUrl = url.trim()
    if (!cleanUrl) { setErr('Linku është i domosdoshëm.'); return }
    if (!/^https?:\/\//i.test(cleanUrl)) cleanUrl = `http://${cleanUrl}`

    if (host) {
      setHosts(prev => prev.map(h => h.id === host.id
        ? { ...h, url: cleanUrl, category, description: description.trim(), isPopular }
        : h))
      showToast('Host-i u përditësua ✓')
    } else {
      setHosts(prev => [...prev, { id: `HST-${Date.now()}`, url: cleanUrl, category, description: description.trim(), isPopular }])
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
          <input className={`${inputCls} font-mono`} placeholder="http://domain.com:8080" value={url} onChange={e => setUrl(e.target.value)} autoFocus />
        </FormGroup>
        <FormGroup label="Kategoria">
          <select className={inputCls} value={category} onChange={e => setCategory(e.target.value)}>
            {hostCategories.map(c => <option key={c.id} value={c.id}>{c.flag} {c.name}</option>)}
          </select>
        </FormGroup>
        <FormGroup label="Përshkrim (opsional)">
          <input className={inputCls} placeholder="p.sh. Server kryesor..." value={description} onChange={e => setDescription(e.target.value)} />
        </FormGroup>
        <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-gray-300 cursor-pointer select-none">
          <input type="checkbox" checked={isPopular} onChange={e => setIsPopular(e.target.checked)} className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-500 focus:ring-blue-500" />
          Shëno si "Popullore"
        </label>
        {err && <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold">{err}</p>}
      </div>
    </Modal>
  )
}

/* ── Rreshti i host-it ── */
function HostRow({ host, onEdit, onDelete }) {
  const { showToast } = useApp()
  const [copied, setCopied] = useState(false)
  const { domain, port } = splitUrl(host.url)

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(host.url)
      setCopied(true)
      showToast('Linku u kopjua ✓')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      showToast("S'mund ta kopjoj — kopjoje dorazi.", 'error')
    }
  }

  return (
    <div className={`group flex items-center gap-1 rounded-xl border px-3 py-2 transition-colors ${
      copied
        ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-900/10'
        : 'border-gray-100 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-900/50 hover:bg-gray-50 dark:hover:bg-gray-900/40'
    }`}>
      <button onClick={copyLink} className="min-w-0 flex-1 text-left" title="Kliko për të kopjuar">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-mono text-xs text-gray-700 dark:text-gray-300 truncate">{domain}</span>
          {port && <span className="text-[9px] font-bold font-mono px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 flex-shrink-0">:{port}</span>}
          {host.isPopular && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex-shrink-0">Popullore</span>}
        </div>
        {host.description && <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate">{host.description}</p>}
      </button>

      <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
        {copied ? <Check size={14} className="text-emerald-500 mx-1" /> : <Copy size={14} className="text-gray-300 dark:text-gray-600 mx-1" />}
        <a href={host.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
          className="p-1 rounded-lg text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30" title="Hap linkun">
          <ExternalLink size={13} />
        </a>
        <button onClick={() => onEdit(host)} className="p-1 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700" title="Edito">
          <Pencil size={13} />
        </button>
        <button onClick={() => onDelete(host)} className="p-1 rounded-lg text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30" title="Fshi">
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}

/* ── Faqja kryesore — Hostet ── */
export default function Hosts() {
  const { hosts, setHosts, hostCategories, setHostCategories, setModal, closeModal, showToast } = useApp()
  const [search, setSearch] = useState('')
  const [tab,    setTab]    = useState('all')

  // Hostet me kategori të panjohur (p.sh. e fshirë) shfaqen te "general"
  const catIds = useMemo(() => new Set(hostCategories.map(c => c.id)), [hostCategories])
  const catOf  = h => (catIds.has(h.category) ? h.category : 'general')

  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase()
    const matches = h => !q || h.url.toLowerCase().includes(q) || (h.description || '').toLowerCase().includes(q)
    return Object.fromEntries(hostCategories.map(c => [c.id, hosts.filter(h => catOf(h) === c.id && matches(h))]))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hosts, hostCategories, search])

  const totalCount = hosts.length
  const visibleCats = tab === 'all' ? hostCategories : hostCategories.filter(c => c.id === tab)

  const openAdd  = (category) => setModal(<HostModal defaultCategory={category} onClose={closeModal} />)
  const openEdit = (h)        => setModal(<HostModal host={h} onClose={closeModal} />)
  const openCat  = ()         => setModal(<CategoryModal onClose={closeModal} />)

  const handleDelete = (host) => {
    if (!window.confirm(`A je i sigurt që dëshiron ta fshish "${host.url}"?`)) return
    setHosts(prev => prev.filter(h => h.id !== host.id))
  }

  const copyAll = async (cat) => {
    const list = grouped[cat.id].map(h => h.url).join('\n')
    if (!list) return
    try {
      await navigator.clipboard.writeText(list)
      showToast(`${grouped[cat.id].length} linqe u kopjuan ✓`)
    } catch {
      showToast("S'mund t'i kopjoj — kopjoji dorazi.", 'error')
    }
  }

  const deleteCategory = (cat) => {
    const n = hosts.filter(h => h.category === cat.id).length
    const msg = n
      ? `Kategoria "${cat.name}" ka ${n} hoste. Do të kalojnë te "Të Përgjithshme". Vazhdo?`
      : `Të fshihet kategoria "${cat.name}"?`
    if (!window.confirm(msg)) return
    if (n) setHosts(prev => prev.map(h => h.category === cat.id ? { ...h, category: 'general' } : h))
    setHostCategories(prev => prev.filter(c => c.id !== cat.id))
    if (tab === cat.id) setTab('all')
  }

  return (
    <div className="space-y-4">
      {/* Titulli "Hostet" jeton te header-i global (Header.jsx, kur page === 'hosts'). */}

      {/* Kërkimi + statistika + kategori e re */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px] max-w-xl">
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
        <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-xs font-bold text-gray-600 dark:text-gray-300">
          <Server size={13} /> {totalCount} hoste · {hostCategories.length} kategori
        </span>
        <button onClick={openCat} className="btn btn-outline flex items-center gap-1.5 text-xs">
          <FolderPlus size={14} /> Kategori e Re
        </button>
        <button onClick={() => openAdd(tab === 'all' ? 'general' : tab)} className="btn btn-primary flex items-center gap-1.5 text-xs">
          <Plus size={14} /> Shto Host
        </button>
      </div>

      {/* Tab-et e kategorive */}
      <div className="flex flex-wrap gap-1.5">
        {[{ id: 'all', name: 'TË GJITHA', flag: '' }, ...hostCategories].map(c => {
          const count = c.id === 'all' ? totalCount : hosts.filter(h => catOf(h) === c.id).length
          const active = tab === c.id
          return (
            <button
              key={c.id}
              onClick={() => setTab(c.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                active ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {c.flag && <span className="mr-1">{c.flag}</span>}{c.name} <span className={active ? 'text-blue-100' : 'text-gray-400'}>({count})</span>
            </button>
          )
        })}
      </div>

      {/* Kolonat */}
      <div className={`grid grid-cols-1 gap-4 ${visibleCats.length === 1 ? 'md:grid-cols-1 max-w-xl' : visibleCats.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-2 xl:grid-cols-3'}`}>
        {visibleCats.map(cat => (
          <div key={cat.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
              <h3 className="text-xs font-black uppercase tracking-wide text-gray-700 dark:text-gray-200 flex items-center gap-1.5">
                <span className="text-base leading-none">{cat.flag}</span>
                {cat.name} <span className="text-gray-400 dark:text-gray-500 font-bold">({grouped[cat.id].length})</span>
              </h3>
              <div className="flex items-center gap-1">
                <button onClick={() => copyAll(cat)} disabled={!grouped[cat.id].length}
                  className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30" title="Kopjo të gjitha">
                  <Copy size={13} />
                </button>
                {!DEFAULT_IDS.has(cat.id) && (
                  <button onClick={() => deleteCategory(cat)}
                    className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30" title="Fshi kategorinë">
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>

            <div className="p-3 flex flex-col gap-2 flex-1">
              {grouped[cat.id].length === 0 ? (
                <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">
                  {search ? `Asnjë rezultat për "${search}".` : 'Nuk ka ende hoste.'}
                </p>
              ) : (
                grouped[cat.id].map(h => <HostRow key={h.id} host={h} onEdit={openEdit} onDelete={handleDelete} />)
              )}
              <button
                onClick={() => openAdd(cat.id)}
                className="flex items-center justify-center gap-1 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 py-2 text-xs font-semibold text-gray-400 dark:text-gray-500 hover:border-blue-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                <Plus size={13} /> Shto host
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
