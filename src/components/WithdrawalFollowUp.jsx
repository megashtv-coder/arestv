import { useEffect, useRef } from 'react'
import { useApp } from '../context/AppContext'
import { supabase } from '../lib/supabase'
import { trackingMethods } from '../data/mockData'
import { formatDate } from '../utils/dateFormat'

/* ══════════════════════════════════════════════════════════
   Ndjekja automatike e tërheqjeve (Western Union / Ria / Money Gram)
   Nëse statusi i tërheqjes te "Barazim me Referent" mbetet "Në pritje" 10 ditë pas datës së
   pagesës, krijohet automatikisht një detyrë për adminat, me datë kujtese ditën e 11-të, me:
   kush e dërgoi, numrin e tërheqjes, metodën/vendin dhe tek kush u dërgua.
   • Punon vetëm kur është i kyçur një admin (adminat e krijojnë detyrën).
   • Një pagesë merr vetëm një detyrë (ID e detyrës është e caktuar: TSK-WD-<id e pagesës>).
   • Pagesat para FOLLOWUP_FROM_DATE anashkalohen — që të mos krijohen dhjetëra detyra të vjetra njëherësh.
══════════════════════════════════════════════════════════ */
const WAIT_DAYS = 10          // sa ditë pa ndryshim statusi
const REMINDER_ON_DAY = 11    // dita e detyrës (nga data e pagesës)
const FOLLOWUP_FROM_DATE = '2026-10-23'
const TRACKING_START_DATE = '2026-10-01'

const pad = n => String(n).padStart(2, '0')
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const addDays = (dateStr, n) => {
  const d = new Date(`${dateStr}T00:00:00`)
  d.setDate(d.getDate() + n)
  return ymd(d)
}
const daysSince = dateStr => Math.floor((Date.now() - new Date(`${dateStr}T00:00:00`).getTime()) / 86400000)
const norm = s => (s || '').toString().trim().toLowerCase().replace(/\s+/g, ' ')

export default function WithdrawalFollowUp() {
  const { payments, setPayments, currentUser, paymentNames, fmt } = useApp()
  const attempted = useRef(new Set())
  const latest = useRef({})
  const runRef = useRef(null)
  latest.current = { payments, setPayments, paymentNames, fmt }

  const isAdmin = currentUser?.role === 'admin' || currentUser?.isSuperAdmin === true

  useEffect(() => {
    if (!isAdmin) return
    let cancelled = false

    const run = async () => {
      const { payments: pays, setPayments: setPays, paymentNames: names = [], fmt: format } = latest.current
      const start = FOLLOWUP_FROM_DATE > TRACKING_START_DATE ? FOLLOWUP_FROM_DATE : TRACKING_START_DATE
      const due = (pays || []).filter(p =>
        trackingMethods.includes(p.method) &&
        p.date && p.date >= start &&
        (p.withdrawalStatus || 'pending') === 'pending' &&
        !p.followUpTask &&
        daysSince(p.date) >= WAIT_DAYS &&
        !attempted.current.has(p.id)
      )
      if (!due.length) return

      const created = []
      for (const p of due) {
        if (cancelled) return
        attempted.current.add(p.id)
        const key = norm(p.reference)
        const person = key && names.find(n =>
          norm(`${n.first} ${n.last}`) === key || (n.aliases || []).some(a => norm(a) === key)
        )
        const where = person ? [person.city, person.country].filter(Boolean).join(', ') : ''
        const description = [
          `🔔 Kontrollo tërheqjen — statusi është "Në pritje" ${WAIT_DAYS} ditë pas pagesës.`,
          `Dërguar nga: ${p.customer || '—'}`,
          `Nr. tërheqjes: ${p.trackingNumber || '—'}`,
          `Metoda: ${p.method}${where ? ` · Dërguar në: ${where}` : ''}`,
          `Tek: ${p.reference || '—'}`,
          `Pagesa ${p.id} · ${format ? format(p.amount || 0) : p.amount} · ${formatDate(p.date)}`,
        ].join(' | ')
        const id = `TSK-WD-${p.id}`
        const { error } = await supabase.from('tasks').insert([{
          id,
          customer: p.customer || p.reference || 'Tërheqje',
          description,
          completed: false,
          reminderdate: addDays(p.date, REMINDER_ON_DAY),
          completedat: null,
        }])
        // 23505 = ekziston tashmë (krijuar nga admini tjetër) — konsiderohet e krijuar
        if (!error || error.code === '23505') created.push({ paymentId: p.id, taskId: id })
        else console.error('[WithdrawalFollowUp] Insert error:', error)
      }

      if (created.length && !cancelled) {
        const map = new Map(created.map(c => [c.paymentId, c.taskId]))
        setPays(prev => prev.map(x => (map.has(x.id) ? { ...x, followUpTask: map.get(x.id) } : x)))
      }
    }

    runRef.current = run
    const id = setInterval(run, 30 * 60 * 1000)  // çdo gjysmë ore
    return () => { cancelled = true; runRef.current = null; clearInterval(id) }
  }, [isAdmin])

  // Kur ngarkohen/ndryshojnë pagesat, kontrollo pas pak (pa e ngarkuar sistemin në çdo ndryshim)
  useEffect(() => {
    if (!isAdmin || !payments.length) return
    const t = setTimeout(() => { if (runRef.current) runRef.current() }, 3000)
    return () => clearTimeout(t)
  }, [isAdmin, payments.length])

  return null
}
