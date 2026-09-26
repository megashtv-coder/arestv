import { useState, useMemo } from 'react'
import { Search, Plus, Copy, Check, Pencil, Trash2, X, LayoutGrid, List as ListIcon } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Modal, FormGroup } from '../components/UI'
import { trackingMethods } from '../data/mockData'

/* ══════════════════════════════════════════════════════════
   Rregulli (numërim për çdo muaj, vetëm Western Union / Ria / Money Gram):
   • përdorim vetëm i një metode → max 5 herë
   • kombinim i 2+ metodave       → max 6 herë në total
   E kuqe = arriti limitin · Portokalli = mbetet 1 · E gjelbër = në rregull
══════════════════════════════════════════════════════════ */
const SINGLE_LIMIT = 5
const COMBO_LIMIT  = 6
const METHOD_SHORT = { 'Western Union': 'WU', 'Ria': 'Ria', 'Money Gram': 'MG' }
const METHOD_DOT   = { 'Western Union': 'bg-amber-500', 'Ria': 'bg-violet-500', 'Money Gram': 'bg-blue-500' }
const MONTHS = ['Janar', 'Shkurt', 'Mars', 'Prill', 'Maj', 'Qershor', 'Korrik', 'Gusht', 'Shtator', 'Tetor', 'Nëntor', 'Dhjetor']
const inputCls = 'w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500'

const fullName = n => `${n.first} ${n.last}`.trim()
const keyOf = raw => (raw || '').trim().toLowerCase()

function statusOf(counts) {
  const used  = trackingMethods.filter(m => counts[m] > 0).length
  const total = trackingMethods.reduce((s, m) => s + counts[m], 0)
  const limit = used >= 2 ? COMBO_LIMIT : SINGLE_LIMIT
  const left  = limit - total
  return { used, total, limit, left, st: left <= 0 ? 'bad' : left === 1 ? 'warn' : 'ok' }
}
const PILL = {
  ok:   ['Në rregull',  'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'],
  warn: ['Afër limitit', 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'],
  bad:  ['Bllokuar',    'bg-red-600 text-white'],
}
const msgOf = s => s.st === 'bad' ? 'Në limit — mos e përdor' : s.st === 'warn' ? 'Mbetet 1 përdorim' : `Mbeten ${s.left} përdorime`

/* ── Modal — shto/edito emër ── */
function NameModal({ item, onClose }) {
  const { setPaymentNames, showToast } = useApp()
  const [first,   setFirst]   = useState(item?.first || '')
  const [last,    setLast]    = useState(item?.last || '')
  const [city,    setCity]    = useState(item?.city || '')
  const [country, setCountry] = useState(item?.country || '')
  const [aliases, setAliases] = useState((item?.aliases || []).join(', '))
  const [err, setErr] = useState('')

  const save = () => {
    if (!first.trim() || !last.trim()) { setErr('Emri dhe mbiemri janë të domosdoshëm.'); return }
    const data = {
      first: first.trim(), last: last.trim(), city: city.trim(), country: country.trim(),
      aliases: aliases.split(',').map(a => a.trim()).filter(Boolean),
    }
    if (item) setPaymentNames(prev => prev.map(n => n.id === item.id ? { ...n, ...data } : n))
    else      setPaymentNames(prev => [...prev, { id: `PN-${Date.now()}`, ...data }])
    showToast(item ? 'Emri u përditësua ✓' : 'Emri u shtua ✓')
    onClose()
  }

  return (
    <Modal
      title={item ? 'Ndrysho Emrin' : 'Emër i Ri'}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-outline" onClick={onClose}>Anulo</button>
          <button className="btn btn-primary" onClick={save}>{item ? 'Ruaj Ndryshimet' : 'Shto Emrin'}</button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <FormGroup label="Emri"><input className={inputCls} value={first} onChange={e => setFirst(e.target.value)} autoFocus /></FormGroup>
          <FormGroup label="Mbiemri"><input className={inputCls} value={last} onChange={e => setLast(e.target.value)} /></FormGroup>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormGroup label="Qyteti"><input className={inputCls} value={city} onChange={e => setCity(e.target.value)} /></FormGroup>
          <FormGroup label="Shteti"><input className={inputCls} value={country} onChange={e => setCountry(e.target.value)} /></FormGroup>
        </div>
        <FormGroup label="Emra të tjerë të referentit (opsionale, me presje)">
          <input className={inputCls} placeholder="p.sh. Vala, Valmire" value={aliases} onChange={e => setAliases(e.target.value)} />
        </FormGroup>
        <p className="text-[11px] text-gray-400 dark:text-gray-500">
          Pagesat me referent "{first || 'Emri'} {last || 'Mbiemri'}" ose me ndonjë nga emrat e tjerë numërohen për këtë person.
        </p>
        {err && <p className="text-xs text-red-600 dark:text-red-400 font-semibold">{err}</p>}
      </div>
    </Modal>
  )
}

/* ── Faqja ── */
export default function PaymentNames() {
  const { paymentNames, setPaymentNames, payments, setModal, closeModal, showToast } = useApp()
  const now = new Date()
  const [month,  setMonth]  = useState(String(now.getMonth() + 1).padStart(2, '0'))
  const [year,   setYear]   = useState(String(now.getFullYear()))
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [method, setMethod] = useState('all')
  const [view,   setView]   = useState(() => { try { return localStorage.getItem('arestv_names_view') || 'grid' } catch { return 'grid' } })
  const [copiedId, setCopiedId] = useState(null)

  const setViewP = v => { setView(v); try { localStorage.setItem('xflow_names_view', v) } catch { /* ignore */ } }
  const years = useMemo(() => [...new Set(['2025', '2026', '2027', String(now.getFullYear())])].sort(), []) // eslint-disable-line react-hooks/exhaustive-deps

  // Numërimi: pagesat e muajit të zgjedhur me metodë WU/Ria/MG, të lidhura me emrin përmes referentit
  const rows = useMemo(() => {
    const ym = `${year}-${month}`
    const byKey = new Map()
    const byId  = new Map()
    paymentNames.forEach(n => {
      const c = {}
      trackingMethods.forEach(m => { c[m] = 0 })
      byId.set(n.id, c)
      ;[fullName(n), ...(n.aliases || [])].map(keyOf).forEach(k => byKey.set(k, c))
    })
    payments.forEach(p => {
      if (!trackingMethods.includes(p.method)) return
      if ((p.date || '').slice(0, 7) !== ym) return
      const c = byKey.get(keyOf(p.reference))
      if (c) c[p.method]++
    })
    return paymentNames.map(n => { const c = byId.get(n.id); return { n, c, s: statusOf(c) } })
  }, [paymentNames, payments, month, year])

  const counts = { all: rows.length, ok: 0, warn: 0, bad: 0 }
  rows.forEach(r => counts[r.s.st]++)

  const list = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows
      .filter(({ n, c, s }) =>
        (filter === 'all' || s.st === filter) &&
        (method === 'all' || c[method] > 0) &&
        (!q || `${fullName(n)} ${n.city} ${n.country} ${(n.aliases || []).join(' ')}`.toLowerCase().includes(q)))
      .sort((a, b) => a.s.total - b.s.total || fullName(a.n).localeCompare(fullName(b.n)))
  }, [rows, search, filter, method])

  const copyName = async (n) => {
    try {
      await navigator.clipboard.writeText(fullName(n))
      setCopiedId(n.id); showToast(`U kopjua: ${fullName(n)} ✓`)
      setTimeout(() => setCopiedId(null), 1800)
    } catch { showToast("S'mund ta kopjoj — kopjoje dorazi.", 'error') }
  }
  const openAdd  = ()  => setModal(<NameModal onClose={closeModal} />)
  const openEdit = (n) => setModal(<NameModal item={n} onClose={closeModal} />)
  const remove = (n) => {
    if (!window.confirm(`Të fshihet "${fullName(n)}" nga lista?`)) return
    setPaymentNames(prev => prev.filter(x => x.id !== n.id))
  }

  const CopyBtn = ({ n, s }) => (
    <button
      onClick={() => copyName(n)} disabled={s.st === 'bad'}
      className="px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed disabled:line-through inline-flex items-center gap-1"
      title={s.st === 'bad' ? 'Emri është në limit' : 'Kopjo emrin'}
    >
      {copiedId === n.id ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />} Kopjo
    </button>
  )
  const IconBtns = ({ n }) => (
    <>
      <button onClick={() => openEdit(n)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700" title="Edito"><Pencil size={13} /></button>
      <button onClick={() => remove(n)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30" title="Fshi"><Trash2 size={13} /></button>
    </>
  )

  return (
    <div className="space-y-4">
      {/* Rregulli */}
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="px-3 py-1.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300">1 metodë: max <b>{SINGLE_LIMIT}</b> / muaj</span>
        <span className="px-3 py-1.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300">Kombinim (2+ metoda): max <b>{COMBO_LIMIT}</b> / muaj</span>
        <span className="px-3 py-1.5 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-semibold">E kuqe = arriti limitin</span>
      </div>

      {/* Statistikat / filtri sipas statusit */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        {[['all', 'Krejt emrat', ''], ['ok', 'Në rregull', 'text-emerald-600'], ['warn', 'Afër limitit', 'text-amber-600'], ['bad', 'Të bllokuar', 'text-red-600']].map(([k, label, cls]) => (
          <button key={k} onClick={() => setFilter(k)}
            className={`text-left rounded-2xl border bg-white dark:bg-gray-800 px-4 py-3 transition-colors ${filter === k ? 'border-blue-400 ring-2 ring-blue-100 dark:ring-blue-900/30' : 'border-gray-200 dark:border-gray-700'}`}>
            <span className={`block text-2xl font-black tabular-nums ${cls}`}>{counts[k]}</span>
            <span className="text-[11px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</span>
          </button>
        ))}
      </div>

      {/* Kontrollet */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="w-full pl-9 pr-9 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 text-xs font-medium outline-none focus:border-blue-400"
            placeholder="Kërko emrin, qytetin ose shtetin..." value={search} onChange={e => setSearch(e.target.value)} />
          {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"><X size={13} /></button>}
        </div>
        <select className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-semibold text-gray-700 dark:text-gray-200" value={month} onChange={e => setMonth(e.target.value)}>
          {MONTHS.map((m, i) => <option key={m} value={String(i + 1).padStart(2, '0')}>{m}</option>)}
        </select>
        <select className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-semibold text-gray-700 dark:text-gray-200" value={year} onChange={e => setYear(e.target.value)}>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-semibold text-gray-700 dark:text-gray-200" value={method} onChange={e => setMethod(e.target.value)}>
          <option value="all">Të gjitha metodat</option>
          {trackingMethods.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <div className="inline-flex rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-900">
          <button onClick={() => setViewP('grid')} className={`px-2.5 py-2 ${view === 'grid' ? 'bg-blue-600 text-white' : 'text-gray-500'}`} title="Kartela"><LayoutGrid size={14} /></button>
          <button onClick={() => setViewP('list')} className={`px-2.5 py-2 ${view === 'list' ? 'bg-blue-600 text-white' : 'text-gray-500'}`} title="Tabelë"><ListIcon size={14} /></button>
        </div>
        <span className="flex-1" />
        <button onClick={openAdd} className="btn btn-primary flex items-center gap-1.5 text-xs"><Plus size={14} /> Emër i ri</button>
      </div>

      {list.length === 0 ? (
        <p className="text-center text-sm text-gray-400 dark:text-gray-500 py-12">
          {paymentNames.length === 0 ? 'Nuk ka ende emra. Shtoji me "Emër i ri".' : 'Asnjë emër nuk përputhet.'}
        </p>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {list.map(({ n, c, s }) => (
            <div key={n.id} className={`rounded-2xl border p-4 flex flex-col gap-2.5 bg-white dark:bg-gray-800 ${s.st === 'bad' ? 'border-red-500 bg-red-50/60 dark:bg-red-900/10' : s.st === 'warn' ? 'border-amber-400' : 'border-gray-200 dark:border-gray-700'}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-extrabold text-[15px] text-gray-900 dark:text-white truncate">{fullName(n)}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{[n.city, n.country].filter(Boolean).join(', ')}</p>
                </div>
                <span className={`text-[10px] font-extrabold uppercase tracking-wide px-2 py-1 rounded-full whitespace-nowrap ${PILL[s.st][1]}`}>{PILL[s.st][0]}</span>
              </div>
              {(n.aliases || []).length > 0 && <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">Referent: {n.aliases.join(', ')}</p>}
              <div className="flex gap-1">
                {Array.from({ length: s.limit }, (_, i) => (
                  <span key={i} className={`h-2 flex-1 rounded ${i < s.total ? (s.st === 'bad' ? 'bg-red-500' : s.st === 'warn' && i === s.total - 1 ? 'bg-amber-400' : 'bg-emerald-500') : 'bg-gray-100 dark:bg-gray-700'}`} />
                ))}
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {trackingMethods.map(m => (
                  <div key={m} className="rounded-lg bg-gray-50 dark:bg-gray-900/40 px-2 py-1.5 text-[11px] text-gray-500 dark:text-gray-400">
                    <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${METHOD_DOT[m]}`} />{m}
                    <b className="block text-base text-gray-900 dark:text-white tabular-nums">{c[m]}</b>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className={`text-xs font-semibold ${s.st === 'bad' ? 'text-red-600' : s.st === 'warn' ? 'text-amber-600' : 'text-emerald-600'}`}>{s.total}/{s.limit} · {msgOf(s)}</span>
                <span className="flex items-center gap-0.5"><CopyBtn n={n} s={s} /><IconBtns n={n} /></span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/40">
                {['Emri', 'Mbiemri', 'Qyteti', 'Shteti', ...trackingMethods.map(m => METHOD_SHORT[m]), 'Total', 'Statusi', ''].map(h => <th key={h} className="px-3 py-2.5">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {list.map(({ n, c, s }) => (
                <tr key={n.id} className={`border-t border-gray-100 dark:border-gray-700 ${s.st === 'bad' ? 'bg-red-50 dark:bg-red-900/10' : ''}`}>
                  <td className="px-3 py-2 font-bold">{n.first}</td>
                  <td className="px-3 py-2 font-bold">{n.last}</td>
                  <td className="px-3 py-2">{n.city}</td>
                  <td className="px-3 py-2">{n.country}</td>
                  {trackingMethods.map(m => <td key={m} className="px-3 py-2 text-center tabular-nums">{c[m]}</td>)}
                  <td className="px-3 py-2 text-center font-bold tabular-nums">{s.total}/{s.limit}</td>
                  <td className="px-3 py-2"><span className={`text-[10px] font-extrabold uppercase px-2 py-1 rounded-full ${PILL[s.st][1]}`}>{PILL[s.st][0]}</span></td>
                  <td className="px-3 py-2 whitespace-nowrap"><CopyBtn n={n} s={s} /><IconBtns n={n} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
