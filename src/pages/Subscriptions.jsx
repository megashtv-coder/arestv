import { Bell, MessageCircle, Send, Calendar, RefreshCw } from 'lucide-react'
import { useApp } from '../context/AppContext'

const cleanPhone = p => (p || '').replace(/[\s+\-()]/g, '')

function addDays(dateStr, days) {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function buildRenewalMsg(inv) {
  const firstName = (inv.customer || '').split(' ')[0]
  return `Pershendetje ${firstName}!\nDeshironim t'ju kujtojme se abonimi juaj per TV skadon me date ${inv.subscriptionExpiry || '—'}.\nJu lutem na kontaktoni per rinovim.\nFaleminderit!\nMe respekt, PREDATOR - MEGA SH TV`
}

/* ── Single row card ── */
function SubRow({ inv, phone, urgency, today }) {
  const { fmt } = useApp()
  const msg = encodeURIComponent(buildRenewalMsg(inv))

  const dateCls =
    urgency === 'high'   ? 'text-red-600 font-bold' :
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
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600 flex-shrink-0">
            {inv.customer.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-gray-800 text-sm">{inv.customer}</p>
            <p className="text-[11px] text-gray-400">{inv.id}</p>
          </div>
        </div>
      </td>

      {/* Data abonimit */}
      <td className="table-td text-gray-500 text-sm hidden md:table-cell">{inv.date}</td>

      {/* Data skadimit */}
      <td className="table-td">
        <span className="font-semibold text-blue-700 text-sm">{inv.subscriptionExpiry || '—'}</span>
      </td>

      {/* Data njoftimit */}
      <td className="table-td">
        <div>
          <span className={`text-sm ${dateCls}`}>{inv.notifyDate}</span>
          {daysLeft !== null && (
            <p className={`text-[11px] mt-0.5 ${
              daysLeft < 0  ? 'text-red-400' :
              daysLeft === 0 ? 'text-red-500 font-bold' :
              'text-gray-400'
            }`}>
              {daysLeft < 0  ? `${Math.abs(daysLeft)} ditë e kaluar` :
               daysLeft === 0 ? 'Sot!' :
               `Pas ${daysLeft} ditë`}
            </p>
          )}
        </div>
      </td>

      {/* Vlera */}
      <td className="table-td">
        <span className="font-bold text-gray-800">{fmt(inv.amount)}</span>
      </td>

      {/* Kontakto */}
      <td className="table-td">
        <div className="flex items-center justify-end gap-1.5 flex-wrap">
          {phone ? (
            <>
              <a
                href={`https://wa.me/${phone}?text=${msg}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-green-50 border border-green-200 text-green-700 text-xs font-semibold rounded-lg hover:bg-green-100 transition-colors whitespace-nowrap"
              >
                <MessageCircle size={13} /> WhatsApp
              </a>
              <a
                href={`https://t.me/+${phone}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-sky-50 border border-sky-200 text-sky-700 text-xs font-semibold rounded-lg hover:bg-sky-100 transition-colors whitespace-nowrap"
              >
                <Send size={13} /> Telegram
              </a>
            </>
          ) : (
            <span className="text-xs text-gray-300 italic">Pa numër</span>
          )}
        </div>
      </td>
    </tr>
  )
}

/* ── Section block ── */
function Section({ title, color, items, today }) {
  const { customers } = useApp()
  if (!items.length) return null

  const getPhone = name => cleanPhone(customers.find(c => c.name === name)?.phone || '')

  const urgency = color === 'red' ? 'high' : color === 'amber' ? 'medium' : 'low'

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <span className={`w-2.5 h-2.5 rounded-full ${
          color === 'red'   ? 'bg-red-500' :
          color === 'amber' ? 'bg-amber-400' :
                              'bg-blue-400'
        }`} />
        <h3 className={`text-sm font-bold ${
          color === 'red'   ? 'text-red-700' :
          color === 'amber' ? 'text-amber-700' :
                              'text-gray-600'
        }`}>{title}</h3>
        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
          color === 'red'   ? 'bg-red-50 text-red-500' :
          color === 'amber' ? 'bg-amber-50 text-amber-600' :
                              'bg-blue-50 text-blue-500'
        }`}>{items.length}</span>
      </div>
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-50">
                <th className="table-th">Klienti</th>
                <th className="table-th hidden md:table-cell">Data abonimit</th>
                <th className="table-th">Skadon</th>
                <th className="table-th">Njoftim</th>
                <th className="table-th">Vlera</th>
                <th className="table-th text-right">Kontakto</th>
              </tr>
            </thead>
            <tbody>
              {items.map(inv => (
                <SubRow
                  key={inv.id}
                  inv={inv}
                  phone={getPhone(inv.customer)}
                  urgency={urgency}
                  today={today}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════
   Main page
══════════════════════════════════════════════════════════ */
export default function Subscriptions() {
  const { invoices } = useApp()

  const today   = new Date().toISOString().slice(0, 10)
  const week7   = addDays(today, 7)

  /* Only invoices with notifyDate set, sorted by notifyDate asc */
  const withNotify = [...invoices.filter(i => i.notifyDate)]
    .sort((a, b) => a.notifyDate.localeCompare(b.notifyDate))

  /* Group */
  const urgent  = withNotify.filter(i => i.notifyDate <= today)          // past + today
  const thisWeek= withNotify.filter(i => i.notifyDate > today && i.notifyDate <= week7)
  const future  = withNotify.filter(i => i.notifyDate > week7)

  const totalPending = urgent.length

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
            {withNotify.length} abonim me njoftim ·{' '}
            {totalPending > 0
              ? <span className="text-red-500 font-semibold">{totalPending} kërkon vëmendje sot</span>
              : <span className="text-emerald-500 font-semibold">Gjithçka është e rregullt</span>
            }
          </p>
        </div>
        <div className="text-xs text-gray-400 flex items-center gap-1.5">
          <Calendar size={13} />
          Sot: <span className="font-semibold text-gray-600">{today}</span>
        </div>
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="stat-card !border-l-4 !border-l-red-400">
          <p className="text-3xl font-bold text-red-600">{urgent.length}</p>
          <p className="text-xs text-gray-400 mt-1 font-medium">Duhen kontaktuar sot</p>
          {urgent.length > 0 && (
            <p className="text-[11px] text-red-400 mt-1">⚠ Kërkon vëmendje!</p>
          )}
        </div>
        <div className="stat-card !border-l-4 !border-l-amber-400">
          <p className="text-3xl font-bold text-amber-500">{thisWeek.length}</p>
          <p className="text-xs text-gray-400 mt-1 font-medium">Këtë javë (7 ditë)</p>
        </div>
        <div className="stat-card !border-l-4 !border-l-blue-400">
          <p className="text-3xl font-bold text-blue-600">{future.length}</p>
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
            Kur krijon ose ndryshon një faturë, vendos fushën{' '}
            <strong>"Njoftim rinovimi"</strong> për t'u shfaqur këtu.
          </p>
        </div>
      ) : (
        <>
          <Section title="Sot & Të kaluara — Kërkon vëmendje!" color="red"   items={urgent}   today={today} />
          <Section title="Kjo javë (7 ditët e ardhshme)"        color="amber" items={thisWeek} today={today} />
          <Section title="Ardhshme"                             color="blue"  items={future}   today={today} />
        </>
      )}
    </div>
  )
}


