import { useState, useMemo, useEffect } from 'react'
import { Search, Scale, ExternalLink } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { formatDate } from '../utils/dateFormat'
import { EmptyState } from '../components/UI'
import { trackingMethods as WITHDRAWAL_METHODS } from '../data/mockData'

// Faqet zyrtare të gjurmimit — asnjëra s'ka API publik dhe as mbështet
// parapopullim të numrit përmes URL-së, kështu që hapim faqen e thjeshtë;
// numri kopjohet nga fusha ngjitur dhe ngjitet dorazi atje.
const TRACK_URLS = {
  'Western Union': 'https://www.westernunion.com/ca/en/web/track-transfer',
  'Ria':            'https://www.riamoneytransfer.com/en-us/track-a-transfer/',
  'Money Gram':     'https://www.moneygram.com/us/en/help-center/track-a-transfer',
}

// Gjurmimi fillon nga tetori 2026 — pagesat e mëparshme s'ishin duke u
// përcjellë me këtë logjikë, kështu që s'na duhen këtu.
const TRACKING_START_DATE = '2026-10-01'

const STATUS_OPTIONS = [
  { id: 'pending',   label: 'Në pritje' },
  { id: 'withdrawn', label: 'U tërhoq' },
  { id: 'missing',   label: "S'u tërhoq" },
]

// AresTV s'ka ende listë aliasesh si XFlow — grupim i drejtpërdrejtë sipas
// tekstit të fushës "reference" (title-case për konsistencë vizuale).
function normalizeAgentName(raw) {
  const trimmed = (raw || '').trim()
  if (!trimmed) return trimmed
  return trimmed.replace(/\S+/g, w => w[0].toUpperCase() + w.slice(1).toLowerCase())
}

function initials(name) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

/* ── Fusha e numrit të tërheqjes (MTCN etj.) — state lokale, ruhet
   vetëm kur del fokusi (jo në çdo shkronjë), që të mos bëjë sync
   në Supabase 10 herë ndërsa shkruhet numri ── */
function TrackingInput({ payment, onCommit }) {
  const [val, setVal] = useState(payment.trackingNumber || '')
  useEffect(() => { setVal(payment.trackingNumber || '') }, [payment.trackingNumber])

  return (
    <input
      type="text"
      value={val}
      onChange={e => setVal(e.target.value)}
      onBlur={() => { if (val !== (payment.trackingNumber || '')) onCommit(payment.id, val.trim()) }}
      onClick={e => e.target.select()}
      placeholder="MTCN..."
      className="w-24 px-2 py-1 text-[11px] font-mono rounded-lg border border-gray-200 bg-white text-gray-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
    />
  )
}

/* ── unique months from the relevant payments ── */
function getMonths(payments) {
  const set = new Set(payments.map(p => (p.date || '').slice(0, 7)).filter(Boolean))
  return Array.from(set).sort().reverse()
}

export default function Settlement() {
  const { payments, setPayments, fmt, logActivity, showToast } = useApp()
  const [search, setSearch] = useState('')
  const [monthFilt, setMonthFilt] = useState('all')

  const relevant = useMemo(
    () => payments.filter(p => WITHDRAWAL_METHODS.includes(p.method) && (p.date || '') >= TRACKING_START_DATE),
    [payments]
  )

  const months = useMemo(() => getMonths(relevant), [relevant])

  const filtered = useMemo(() => {
    let result = relevant
    if (monthFilt !== 'all') result = result.filter(p => (p.date || '').startsWith(monthFilt))
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter(p =>
        (p.customer || '').toLowerCase().includes(q) ||
        (p.reference || '').toLowerCase().includes(q)
      )
    }
    return [...result].sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  }, [relevant, monthFilt, search])

  const setStatus = (id, status) => {
    setPayments(prev => prev.map(p => {
      if (p.id !== id) return p
      // Nëse largohet nga "U tërhoq", statusi i barazimit s'ka më kuptim.
      return { ...p, withdrawalStatus: status, settled: status === 'withdrawn' ? p.settled : false }
    }))
  }

  const setTrackingNumber = (id, trackingNumber) => {
    setPayments(prev => prev.map(p => p.id === id ? { ...p, trackingNumber } : p))
  }

  const settlePayment = (p) => {
    setPayments(prev => prev.map(x => x.id === p.id ? { ...x, settled: true } : x))
    logActivity(`Barazoi pagesën ${p.id} — ${p.customer} ${fmt(p.amount)}`, 'Barazimi')
  }

  const settleAgent = (agentName) => {
    let count = 0
    let sum = 0
    setPayments(prev => prev.map(p => {
      if (!WITHDRAWAL_METHODS.includes(p.method)) return p
      if (normalizeAgentName(p.reference) !== agentName) return p
      if (p.withdrawalStatus !== 'withdrawn' || p.settled) return p
      count++
      sum += p.amount || 0
      return { ...p, settled: true }
    }))
    if (count > 0) {
      logActivity(`Barazoi ${count} pagesa me ${agentName} — ${fmt(sum)}`, 'Barazimi')
      showToast(`${agentName}: u barazuan ${count} pagesa (${fmt(sum)}) ✓`)
    }
  }

  // Grupimi sipas personit (fusha "reference" — kush pranoi)
  const byAgent = useMemo(() => {
    const map = {}
    relevant.forEach(p => {
      const ref = normalizeAgentName(p.reference)
      if (!ref) return
      if (!map[ref]) map[ref] = { name: ref, due: 0, waiting: 0 }
      const status = p.withdrawalStatus || 'pending'
      if (status === 'withdrawn' && !p.settled) map[ref].due += p.amount || 0
      else if (status === 'pending' || status === 'missing') map[ref].waiting += p.amount || 0
    })
    return Object.values(map).sort((a, b) => b.due - a.due || a.name.localeCompare(b.name))
  }, [relevant])

  const totals = useMemo(() => {
    let due = 0, pending = 0, settledSum = 0, settledCount = 0
    relevant.forEach(p => {
      const status = p.withdrawalStatus || 'pending'
      if (status === 'withdrawn' && !p.settled) due += p.amount || 0
      else if (status === 'pending' || status === 'missing') pending += p.amount || 0
      if (p.settled) { settledSum += p.amount || 0; settledCount++ }
    })
    return { due, pending, settledSum, settledCount }
  }, [relevant])

  return (
    <div className="space-y-4">
      {/* Titulli "Barazimi" jeton te header-i global (Header.jsx, kur page === 'settlement'). */}

      {/* Statistika */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-gray-200/90 shadow-sm p-4 border-l-4 border-l-blue-400">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Për t'u marrë prej personave</p>
          <p className="text-xl font-black font-mono text-blue-600 mt-0.5">{fmt(totals.due)}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">U tërhoq, ende pa u barazuar</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200/90 shadow-sm p-4 border-l-4 border-l-amber-400">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Ende pa u tërhequr</p>
          <p className="text-xl font-black font-mono text-amber-600 mt-0.5">{fmt(totals.pending)}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">S'ka konfirmim akoma</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200/90 shadow-sm p-4 border-l-4 border-l-emerald-400">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Barazuar</p>
          <p className="text-xl font-black font-mono text-emerald-600 mt-0.5">{fmt(totals.settledSum)}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">{totals.settledCount} {totals.settledCount === 1 ? 'pagesë' : 'pagesa'}</p>
        </div>
      </div>

      {/* Barazimi me personat */}
      <div className="bg-white rounded-2xl border border-gray-200/90 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-800">Barazimi me personat</h2>
          <span className="text-[11px] text-gray-400">Kliko "Barazo Gjithçka" kur dikush ta sjellë paranë</span>
        </div>
        {byAgent.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-8">
            Asnjë pagesë WU/Ria/MoneyGram s'ka fushën "Referenca (kush pranoi)" të plotësuar ende.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
            {byAgent.map(a => (
              <div key={a.name} className="border border-gray-200 rounded-2xl p-3.5 bg-gray-50 flex flex-col gap-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-[11px] font-extrabold flex-shrink-0">
                    {initials(a.name)}
                  </div>
                  <span className="font-bold text-sm text-gray-800 truncate">{a.name}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Për t'u marrë</span>
                  <span className="font-mono font-bold text-blue-600">{fmt(a.due)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Ende pa u tërhequr</span>
                  <span className="font-mono font-bold text-amber-600">{fmt(a.waiting)}</span>
                </div>
                <button
                  onClick={() => settleAgent(a.name)}
                  disabled={a.due === 0}
                  className="w-full mt-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors bg-blue-500 hover:bg-blue-600 text-white disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  Barazo Gjithçka
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filtrat */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-gray-200/90 shadow-sm">
        <div className="relative flex-1 min-w-[160px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
            placeholder="Kërko klient ose person..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="text-xs px-2.5 py-1.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-700 font-semibold outline-none focus:border-blue-400 cursor-pointer"
          value={monthFilt}
          onChange={e => setMonthFilt(e.target.value)}
        >
          <option value="all">Të gjitha muajt</option>
          {months.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      {/* Tabela e pagesave */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Scale}
          title="Nuk ka pagesa"
          sub={relevant.length === 0 ? 'Asnjë pagesë Western Union, Ria apo Money Gram ende' : 'Provo kërkim tjetër'}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200/90 shadow-sm overflow-hidden">
          <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 420px)' }}>
            <table className="w-full text-sm min-w-[860px]">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="table-th">Data</th>
                  <th className="table-th">Klienti</th>
                  <th className="table-th text-right">Shuma</th>
                  <th className="table-th">Metoda</th>
                  <th className="table-th">Nr. Tërheqjes</th>
                  <th className="table-th">Personi</th>
                  <th className="table-th">Statusi i tërheqjes</th>
                  <th className="table-th">Barazuar</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const status = p.withdrawalStatus || 'pending'
                  const ref = normalizeAgentName(p.reference)
                  return (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="table-td font-mono text-xs">{formatDate(p.date)}</td>
                      <td className="table-td font-bold text-gray-900 text-xs max-w-[140px] truncate">{p.customer}</td>
                      <td className="table-td text-right font-mono font-bold text-gray-900">{fmt(p.amount)}</td>
                      <td className="table-td text-xs">{p.method}</td>
                      <td className="table-td">
                        <div className="flex items-center gap-1">
                          <TrackingInput payment={p} onCommit={setTrackingNumber} />
                          <a
                            href={TRACK_URLS[p.method]}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 flex-shrink-0"
                            title={`Hap faqen e gjurmimit — ${p.method} (kopjo numrin dhe ngjite atje)`}
                          >
                            <ExternalLink size={13} />
                          </a>
                        </div>
                      </td>
                      <td className="table-td text-xs text-gray-500">{ref || <span className="text-gray-300">—</span>}</td>
                      <td className="table-td">
                        <div className="inline-flex border border-gray-200 rounded-full p-0.5 gap-0.5 bg-gray-50">
                          {STATUS_OPTIONS.map(s => (
                            <button
                              key={s.id}
                              onClick={() => setStatus(p.id, s.id)}
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap transition-colors ${
                                status === s.id
                                  ? s.id === 'withdrawn'
                                    ? 'bg-blue-50 text-blue-600'
                                    : s.id === 'missing'
                                      ? 'bg-gray-200 text-gray-600'
                                      : 'bg-amber-50 text-amber-700'
                                  : 'text-gray-400 hover:text-gray-600'
                              }`}
                            >
                              {s.label}
                            </button>
                          ))}
                        </div>
                      </td>
                      <td className="table-td">
                        {p.settled ? (
                          <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-emerald-50 text-emerald-600">
                            ✓ Barazuar
                          </span>
                        ) : status === 'withdrawn' ? (
                          <button
                            onClick={() => settlePayment(p)}
                            className="text-[10px] font-bold px-2 py-1 rounded-full border border-dashed border-gray-300 text-gray-400 hover:text-blue-600 hover:border-blue-400 transition-colors"
                          >
                            Barazo
                          </button>
                        ) : (
                          <span className="text-[10px] text-gray-300">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
