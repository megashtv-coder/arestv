import { useEffect, useRef, useState, memo, useMemo } from 'react'
import { Bell, MessageCircle, Send, Calendar, CheckCircle2, Loader2, AlertTriangle } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { formatDate } from '../utils/dateFormat'

/* ── Vetëm abonimi nga Korriku e tutje ── */
const AUTO_FROM = '2026-07-01'

const cleanPhone = p => (p || '').replace(/[\s+\-()]/g, '')

function addDays(dateStr, days) {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function buildRenewalMsg(inv) {
  const firstName = (inv.customer || '').split(' ')[0]
  return `Pershendetje ${firstName}!\nDeshironim t'ju kujtojme se abonimi juaj per TV skadon me date ${formatDate(inv.subscriptionExpiry)}.\nJu lutem na kontaktoni per rinovim.\nFaleminderit!\nMe respekt, PREDATOR - MEGA SH TV`
}

/* Çelësi i localStorage ku ruajmë { invId: 'YYYY-MM-DD' } */
const LS_KEY = 'arestv_wa_sent'

function getSentMap() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}') } catch { return {} }
}
function markSent(invId, date) {
  const m = getSentMap(); m[invId] = date
  localStorage.setItem(LS_KEY, JSON.stringify(m))
}
function wasSentToday(invId, today) {
  return getSentMap()[invId] === today
}

/* Dërgo mesazh WhatsApp via API endpoint */
async function sendWA(phone, message) {
  const res = await fetch('/api/send-whatsapp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, message }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  return res.json()
}

/* ── Single row card ── */
const SubRow = memo(function SubRow({ inv, phone, urgency, today, sentToday }) {
  const { fmt } = useApp()
  const msg = encodeURIComponent(buildRenewalMsg(inv))

  const dateCls =
    urgency === 'high'   ? 'text-blue-600 font-bold' :
    urgency === 'medium' ? 'text-amber-600 font-semibold' :
                           'text-gray-600'

  const daysLeft = inv.notifyDate
    ? Math.round((new Date(inv.notifyDate) - new Date(today)) / 86_400_000)
    : null

  return (
    <tr className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
      {/* Klienti */}
      <td className="table-td">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-500 flex-shrink-0">
            {inv.customer.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-gray-800 text-sm">{inv.customer}</p>
            <p className="text-[11px] text-gray-400">{inv.id}</p>
          </div>
        </div>
      </td>

      {/* Data skadimit */}
      <td className="table-td">
        <span className="font-semibold text-blue-600 text-sm">{formatDate(inv.subscriptionExpiry)}</span>
      </td>

      {/* Data njoftimit */}
      <td className="table-td">
        <div>
          <span className={`text-sm ${dateCls}`}>{formatDate(inv.notifyDate)}</span>
          {daysLeft !== null && (
            <p className={`text-[11px] mt-0.5 ${
              daysLeft < 0  ? 'text-blue-400' :
              daysLeft === 0 ? 'text-blue-500 font-bold' :
              'text-gray-400'
            }`}>
              {daysLeft < 0  ? `${Math.abs(daysLeft)} ditë e kaluar` :
               daysLeft === 0 ? 'Sot!' :
               `Pas ${daysLeft} ditë`}
            </p>
          )}
        </div>
      </td>

      {/* Statusi i dërgimit */}
      <td className="table-td">
        {sentToday ? (
          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-1 rounded-full">
            <CheckCircle2 size={11} /> Dërguar sot
          </span>
        ) : (
          <span className="text-[11px] text-gray-300">—</span>
        )}
      </td>

      {/* Vlera */}
      <td className="table-td">
        <span className="font-bold text-gray-800">{fmt(inv.amount)}</span>
      </td>

      {/* Kontakto manualisht */}
      <td className="table-td">
        <div className="flex items-center justify-end gap-1.5 flex-wrap">
          {phone ? (
            <>
              <a
                href={`https://wa.me/${phone}?text=${msg}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-green-50 border border-green-200 text-green-700 text-xs font-semibold rounded-lg hover:bg-green-100 transition-colors whitespace-nowrap"
              >
                <MessageCircle size={13} /> WA
              </a>
              <a
                href={`https://t.me/+${phone}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-sky-50 border border-sky-200 text-sky-700 text-xs font-semibold rounded-lg hover:bg-sky-100 transition-colors whitespace-nowrap"
              >
                <Send size={13} /> TG
              </a>
            </>
          ) : (
            <span className="text-xs text-gray-300 italic">Pa numër</span>
          )}
        </div>
      </td>
    </tr>
  )
})

/* ── Section block ── */
const Section = memo(function Section({ title, color, items, today, sentIds, itemsPerPage = 30 }) {
  const { customers, fmt } = useApp()
  const [page, setPage] = useState(1)

  if (!items.length) return null

  const getPhone = name => cleanPhone(customers.find(c => c.name === name)?.phone || '')
  const urgency  = color === 'red' ? 'high' : color === 'amber' ? 'medium' : 'low'

  const totalPages = Math.ceil(items.length / itemsPerPage)
  const startIdx = (page - 1) * itemsPerPage
  const endIdx = startIdx + itemsPerPage
  const paginatedItems = items.slice(startIdx, endIdx)

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <span className={`w-2.5 h-2.5 rounded-full ${
          color === 'red'   ? 'bg-blue-500' :
          color === 'amber' ? 'bg-amber-400' : 'bg-blue-400'
        }`} />
        <h3 className={`text-sm font-bold ${
          color === 'red'   ? 'text-blue-700' :
          color === 'amber' ? 'text-amber-700' : 'text-gray-600'
        }`}>{title}</h3>
        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
          color === 'red'   ? 'bg-blue-50 text-blue-500' :
          color === 'amber' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-500'
        }`}>{items.length}</span>
      </div>

      {/* Mobile Card View - Hidden on sm+ */}
      {paginatedItems.length > 0 && (
        <div className="sm:hidden space-y-2 mb-4">
          {paginatedItems.map(inv => {
            const [openDropdown, setOpenDropdown] = useState(null)
            const phone = getPhone(inv.customer)
            const msg = encodeURIComponent(`Përshëndetje!\nAbonimit juaj skadon më ${inv.subscriptionExpiry}.\nJu lutem, rinovoni për të vazhduar shërbimin.\nFaleminderit!`)
            const daysLeft = inv.notifyDate
              ? Math.round((new Date(inv.notifyDate) - new Date(today)) / 86_400_000)
              : null

            return (
              <div key={inv.id} className="bg-white border border-gray-200 rounded-lg p-3">
                <div className="flex justify-between items-start gap-2">
                  {/* Col 1: Customer + Expiry + Notify */}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-800 text-sm truncate">{inv.customer}</p>
                    <p className="text-xs font-bold text-blue-500 mt-0.5">{formatDate(inv.subscriptionExpiry)}</p>
                    <p className="text-xs font-bold text-blue-600 mt-0.5">{formatDate(inv.notifyDate)}</p>
                  </div>

                  {/* Col 2: Amount + Product */}
                  <div className="text-right">
                    <p className="font-bold text-gray-800 text-sm">{fmt(inv.amount)}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{inv.type || inv.product || '—'}</p>
                  </div>

                  {/* Col 3: Contact - Dropdown */}
                  <div className="relative flex-shrink-0">
                    <button
                      className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 text-gray-600 hover:bg-blue-500 hover:text-white transition-all"
                      onClick={() => setOpenDropdown(openDropdown === inv.id ? null : inv.id)}
                    >
                      ⋮
                    </button>

                    {/* Dropdown Menu */}
                    {openDropdown === inv.id && phone && (
                      <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-xl z-50">
                        <a
                          href={`https://wa.me/${phone}?text=${msg}`}
                          target="_blank" rel="noopener noreferrer"
                          className="w-full text-left px-3 py-2 text-sm text-green-600 hover:bg-green-50 flex items-center gap-2 border-b"
                          onClick={() => setOpenDropdown(null)}
                        >
                          <MessageCircle size={14}/> WhatsApp
                        </a>
                        <a
                          href={`https://t.me/+${phone}`}
                          target="_blank" rel="noopener noreferrer"
                          className="w-full text-left px-3 py-2 text-sm text-sky-600 hover:bg-sky-50 flex items-center gap-2"
                          onClick={() => setOpenDropdown(null)}
                        >
                          <Send size={14}/> Telegram
                        </a>
                      </div>
                    )}

                    {!phone && (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Mobile pagination - hidden on sm+ */}
      {totalPages > 1 && (
        <div className="sm:hidden flex items-center justify-center gap-2 mb-4">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-2 py-1 text-xs rounded border border-gray-200 text-gray-600 disabled:opacity-50 hover:bg-gray-50"
          >
            ←
          </button>
          <span className="text-xs text-gray-500">{page}/{totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-2 py-1 text-xs rounded border border-gray-200 text-gray-600 disabled:opacity-50 hover:bg-gray-50"
          >
            →
          </button>
        </div>
      )}

      <div className="card overflow-hidden hidden sm:block">
        <div className="overflow-auto">
          <table className="w-full">
            <thead className="sticky top-0 z-10">
              <tr className="border-b-2 border-gray-50 bg-white dark:bg-gray-800">
                <th className="table-th">Klienti</th>
                <th className="table-th">Skadon</th>
                <th className="table-th">Njoftim</th>
                <th className="table-th">Statusi</th>
                <th className="table-th">Vlera</th>
                <th className="table-th text-right">Kontakto</th>
              </tr>
            </thead>
            <tbody>
              {paginatedItems.map(inv => (
                <SubRow
                  key={inv.id}
                  inv={inv}
                  phone={getPhone(inv.customer)}
                  urgency={urgency}
                  today={today}
                  sentToday={sentIds.has(inv.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination for section - hidden on mobile */}
      {totalPages > 1 && (
        <div className="hidden sm:flex items-center justify-center gap-2 mt-3">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-2 py-1 text-xs rounded border border-gray-200 text-gray-600 disabled:opacity-50 hover:bg-gray-50"
          >
            ←
          </button>
          <span className="text-xs text-gray-500">{page}/{totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-2 py-1 text-xs rounded border border-gray-200 text-gray-600 disabled:opacity-50 hover:bg-gray-50"
          >
            →
          </button>
        </div>
      )}
    </div>
  )
})

/* ══════════════════════════════════════════════════════════
   Main page
══════════════════════════════════════════════════════════ */
export default function Subscriptions() {
  const { invoices, customers, showToast } = useApp()

  const today  = new Date().toISOString().slice(0, 10)
  const week7  = addDays(today, 7)

  /* Vetëm abonimi me notifyDate nga Korriku e tutje */
  const withNotify = [...invoices.filter(i => i.notifyDate && i.notifyDate >= AUTO_FROM)]
    .sort((a, b) => a.notifyDate.localeCompare(b.notifyDate))

  const urgent   = withNotify.filter(i => i.notifyDate <= today)
  const thisWeek = withNotify.filter(i => i.notifyDate > today && i.notifyDate <= week7)
  const future   = withNotify.filter(i => i.notifyDate > week7)

  /* Gjurmim — cilët janë dërguar sot */
  const [sentIds, setSentIds] = useState(() => {
    const m = getSentMap()
    return new Set(Object.keys(m).filter(id => m[id] === today))
  })

  /* Statusi i auto-dërgimit */
  const [autoStatus, setAutoStatus] = useState(null) // null | 'sending' | 'done' | 'error' | 'no-api'
  const [autoCount,  setAutoCount]  = useState(0)
  const hasFiredRef = useRef(false)

  const getPhone = name => cleanPhone(customers.find(c => c.name === name)?.phone || '')

  /* ── Auto-dërgim kur faqja hapet ── */
  useEffect(() => {
    if (hasFiredRef.current) return
    hasFiredRef.current = true

    /* Gjej abonimi që duhen njoftuar sot dhe nuk janë dërguar ende */
    const toSend = urgent.filter(inv => {
      const phone = getPhone(inv.customer)
      return phone && !wasSentToday(inv.id, today)
    })

    if (toSend.length === 0) return

    setAutoStatus('sending')
    let sent = 0
    let failed = 0
    const newSent = new Set(sentIds)

    const sendNext = async (idx) => {
      if (idx >= toSend.length) {
        setSentIds(newSent)
        if (failed > 0 && sent === 0) {
          setAutoStatus('no-api')
        } else if (failed > 0) {
          setAutoStatus('error')
          showToast(`${sent} dërguar, ${failed} dështuan`, 'error')
        } else {
          setAutoStatus('done')
          setAutoCount(sent)
          showToast(`✅ ${sent} njoftime WhatsApp u dërguan automatikisht!`, 'success')
        }
        return
      }

      const inv   = toSend[idx]
      const phone = getPhone(inv.customer)
      const msg   = buildRenewalMsg(inv)

      try {
        await sendWA(phone, msg)
        markSent(inv.id, today)
        newSent.add(inv.id)
        sent++
      } catch (err) {
        /* Nëse API nuk është konfiguruar, ndalo dhe trego udhëzime */
        if (err.message.includes('nuk është konfiguruar') || err.message.includes('503')) {
          setAutoStatus('no-api')
          return
        }
        failed++
        console.error('WA error for', inv.customer, err.message)
      }

      /* Prit 1.5s mes mesazheve (anti-spam) */
      await new Promise(r => setTimeout(r, 1500))
      sendNext(idx + 1)
    }

    sendNext(0)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const totalPending = urgent.length
  const unsent       = urgent.filter(i => !sentIds.has(i.id) && getPhone(i.customer)).length

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Bell size={20} className="text-blue-500" />
            Njoftimet e Abonimit
          </h2>
          <p className="text-sm text-gray-400 mt-0.5">
            {withNotify.length} abonim ·{' '}
            {totalPending > 0
              ? <span className="text-blue-500 font-semibold">{totalPending} kërkon vëmendje sot</span>
              : <span className="text-emerald-500 font-semibold">Gjithçka është e rregullt</span>
            }
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Statusi i auto-dërgimit */}
          {autoStatus === 'sending' && (
            <span className="flex items-center gap-1.5 text-xs text-blue-500 bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-full font-semibold">
              <Loader2 size={13} className="animate-spin" /> Duke dërguar njoftime WA...
            </span>
          )}
          {autoStatus === 'done' && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-full font-semibold">
              <CheckCircle2 size={13} /> {autoCount} njoftime dërguar ✓
            </span>
          )}
          {autoStatus === 'no-api' && (
            <span className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 border border-amber-100 px-3 py-1.5 rounded-full font-semibold">
              <AlertTriangle size={13} /> WhatsApp API nuk është konfiguruar
            </span>
          )}
          {autoStatus === 'error' && (
            <span className="flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-full font-semibold">
              <AlertTriangle size={13} /> Disa njoftime dështuan
            </span>
          )}
          <div className="text-xs text-gray-400 flex items-center gap-1.5">
            <Calendar size={13} />
            Sot: <span className="font-semibold text-gray-600">{today}</span>
          </div>
        </div>
      </div>

      {/* API setup banner */}
      {autoStatus === 'no-api' && (
        <div className="mb-5 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm font-bold text-amber-800 mb-2">⚙️ Konfiguro WhatsApp API për dërgim automatik</p>
          <ol className="text-xs text-amber-700 space-y-1 list-decimal list-inside">
            <li>Shko te <a href="https://green-api.com" target="_blank" rel="noopener noreferrer" className="underline font-semibold">green-api.com</a> dhe krijo llogari falas</li>
            <li>Krijo një instancë (Instance) dhe lidhe numrin <strong>+355695330404</strong> duke skanuar QR kodin</li>
            <li>Kopjo <strong>idInstance</strong> dhe <strong>apiTokenInstance</strong></li>
            <li>Shko te <a href="https://vercel.com/dashboard" target="_blank" rel="noopener noreferrer" className="underline font-semibold">Vercel Dashboard</a> → Settings → Environment Variables dhe shto:</li>
          </ol>
          <div className="mt-2 bg-amber-100 rounded-lg p-2.5 font-mono text-xs text-amber-900 space-y-1">
            <div>GREENAPI_INSTANCE_ID = <em>idInstance nga Green API</em></div>
            <div>GREENAPI_TOKEN = <em>apiTokenInstance nga Green API</em></div>
          </div>
          <p className="text-xs text-amber-600 mt-2">Pas shtimit të variablave, redeploy projektin nga Vercel dashboard.</p>
        </div>
      )}

      {/* Summary stat cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="stat-card !border-l-4 !border-l-blue-400">
          <p className="text-3xl font-bold text-blue-600">{urgent.length}</p>
          <p className="text-xs text-gray-400 mt-1 font-medium">Duhen kontaktuar sot</p>
          {unsent > 0 && autoStatus !== 'no-api' && (
            <p className="text-[11px] text-amber-500 mt-1">{unsent} ende pa dërguar</p>
          )}
        </div>
        <div className="stat-card !border-l-4 !border-l-amber-400">
          <p className="text-3xl font-bold text-amber-500">{thisWeek.length}</p>
          <p className="text-xs text-gray-400 mt-1 font-medium">Këtë javë (7 ditë)</p>
        </div>
        <div className="stat-card !border-l-4 !border-l-blue-400">
          <p className="text-3xl font-bold text-blue-500">{future.length}</p>
          <p className="text-xs text-gray-400 mt-1 font-medium">Ardhshme</p>
        </div>
      </div>

      {/* Empty state */}
      {withNotify.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
            <Bell size={28} className="text-blue-200" />
          </div>
          <p className="text-base font-semibold text-gray-500 mb-1">Nuk ka njoftime të konfigurura</p>
          <p className="text-sm text-gray-400 max-w-xs">
            Njoftime automatike aktivizohen vetëm për faturat me datë njoftimi nga{' '}
            <strong>1 Korriku 2026</strong> e tutje.
          </p>
        </div>
      ) : (
        <>
          <Section title="Sot & Të kaluara — Kërkon vëmendje!" color="red"   items={urgent}   today={today} sentIds={sentIds} />
          <Section title="Kjo javë (7 ditët e ardhshme)"        color="amber" items={thisWeek} today={today} sentIds={sentIds} />
          <Section title="Ardhshme"                             color="blue"  items={future}   today={today} sentIds={sentIds} />
        </>
      )}
    </div>
  )
}
