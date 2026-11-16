import { useMemo } from 'react'
import { History } from 'lucide-react'
import { formatDate } from '../utils/dateFormat'

const STATUS_LABEL = {
  pending: 'Në pritje', overdue: 'Vonuar', partial: 'Pjesërisht', draft: 'Draft', void: 'Void', paid: 'Paguar',
}
const STATUS_CLS = {
  pending: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  overdue: 'bg-red-50 text-red-700 dark:bg-[#93000a]/50 dark:text-[#ffdad6]',
  partial: 'bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
  draft:   'bg-gray-100 text-gray-600 dark:bg-dk-high dark:text-gray-300',
  void:    'bg-gray-100 text-gray-500 dark:bg-dk-high dark:text-gray-400',
}
const MAX_ROWS = 8

/* Transaksionet e fundit të klientit të zgjedhur në faturën e re: artikulli, shuma dhe mënyra e pagesës
   (ose statusi, nëse fatura s'është paguar ende). Faturat lidhen me klientin sipas EMRIT. */
export default function CustomerHistoryPanel({ customer, invoices, payments, excludeId, fmt }) {
  const rows = useMemo(() => {
    if (!customer) return []
    const methodsByInvoice = new Map()
    payments.forEach(p => {
      if (p.customer !== customer || !p.invoiceId) return
      const list = methodsByInvoice.get(p.invoiceId) || []
      if (p.method && !list.includes(p.method)) list.push(p.method)
      methodsByInvoice.set(p.invoiceId, list)
    })
    return invoices
      .filter(i => i.customer === customer && i.id !== excludeId)
      .sort((a, b) => (b.date || '').localeCompare(a.date || '') || String(b.id).localeCompare(String(a.id)))
      .slice(0, MAX_ROWS)
      .map(i => ({
        id: i.id,
        date: i.date,
        amount: i.amount,
        status: i.status,
        desc: (i.items || []).map(it => it.desc).filter(Boolean).join(' + ') || 'Shërbim',
        methods: methodsByInvoice.get(i.id) || [],
      }))
  }, [customer, invoices, payments, excludeId])

  const shell = 'sticky top-6 rounded-2xl border border-gray-200/90 bg-white shadow-sm dark:bg-dk-low dark:border-white/[0.07] dark:shadow-none'

  if (!customer) {
    return (
      <div className="sticky top-6 rounded-2xl border border-dashed border-gray-300 dark:border-white/10 p-5 text-center">
        <History size={20} className="mx-auto mb-2 text-gray-300 dark:text-gray-600" />
        <p className="text-xs text-gray-400 dark:text-gray-500">Zgjidh një klient për të parë transaksionet e tij të fundit.</p>
      </div>
    )
  }

  return (
    <div className={shell}>
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 dark:border-white/[0.06]">
        <History size={15} className="text-gray-400 dark:text-gray-500 shrink-0" />
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-[#8b8e99]">Transaksionet e fundit</p>
          <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{customer}</p>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="px-4 py-6 text-xs text-center text-gray-400 dark:text-gray-500">Ky klient nuk ka transaksione ende.</p>
      ) : (
        <ul className="divide-y divide-gray-100 dark:divide-white/[0.06]">
          {rows.map(r => (
            <li key={r.id} className="px-4 py-2.5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{r.desc}</span>
                <span className="text-sm font-bold text-gray-900 dark:text-gray-100 tabular-nums shrink-0">{fmt ? fmt(r.amount || 0) : `€${r.amount}`}</span>
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-[11px] text-gray-400 dark:text-gray-500">
                {r.status === 'paid' && r.methods.length > 0 ? (
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">{r.methods.join(' + ')}</span>
                ) : (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${STATUS_CLS[r.status] || 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'}`}>
                    {STATUS_LABEL[r.status] || r.status}
                  </span>
                )}
                <span>·</span>
                <span>{formatDate(r.date)}</span>
                <span className="ml-auto font-mono">{r.id}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
