import { useState, useMemo } from 'react'
import {
  Search, Plus, Copy, Check, ExternalLink, Pencil, Trash2, X,
  ArrowUpDown, Link2, LayoutGrid, List, Landmark,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Modal, FormGroup } from '../components/UI'
import PaymentsSubTabs from '../components/PaymentsSubTabs'

// Handle-i default i PayPal.me që parapopullohet te linku i ri (bosh = pa parapopullim)
const PAYPAL_HANDLE = ''
const PAYPAL_BASE = `https://paypal.me/${PAYPAL_HANDLE ? `${PAYPAL_HANDLE}/` : ''}`
const STRIPE_BASE = 'https://buy.stripe.com/'

const PROVIDERS = {
  stripe: { label: 'Stripe', dot: 'bg-[#635BFF]', tag: 'bg-indigo-50 dark:bg-indigo-950/60 text-[#635BFF] dark:text-indigo-300' },
  paypal: { label: 'PayPal', dot: 'bg-[#0070BA]', tag: 'bg-sky-50 dark:bg-sky-950/60 text-[#0070BA] dark:text-sky-300' },
  bank:   { label: 'Transfer Bankar', dot: 'bg-emerald-500', tag: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300' },
}

const AMOUNT_FILTERS = [
  { id: 'all',     label: 'Të Gjitha' },
  { id: 'under50', label: '< €50' },
  { id: '50to100', label: '€50 - €100' },
  { id: 'over100', label: '> €100' },
]

// Linqet e ruajtura para se të shtohej PayPal s'kanë fushën `provider` — janë Stripe.
const providerOf = l => l.provider || 'stripe'
// Llogaritë bankare ruhen në të njëjtën listë, me provider 'bank' (pa shumë/link).
const isBank = l => providerOf(l) === 'bank'
const kindOf = id => (id === 'bank' ? 'bank' : 'link')

const cleanUrlOf = url => (url || '').replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '')

// IBAN i grupuar nga 4 karaktere për lexim më të lehtë: XK05 1234 ...
const formatIban = iban => (iban || '').replace(/\s+/g, '').replace(/(.{4})/g, '$1 ').trim()

// Teksti që kopjohet për një llogari bankare (rreshtat bosh anashkalohen)
const bankCopyText = a => [
  `Emri Mbiemri: ${a.holder}`,
  `IBAN: ${formatIban(a.iban)}`,
  a.swift ? `SWIFT: ${a.swift}` : null,
  a.address ? `Adresa: ${a.address}` : null,
].filter(Boolean).join('\n')

const inputCls = 'w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

/* ══════════════════════════════════════════════════════════
   Modal — shto/edito një link pagese (Stripe/PayPal) ose një llogari bankare
══════════════════════════════════════════════════════════ */
function PaymentLinkModal({ link, defaultProvider, onClose }) {
  const { setStripeLinks, showToast, fmt } = useApp()
  const initialProvider = link ? providerOf(link) : defaultProvider
  const [provider,    setProvider]    = useState(initialProvider)
  const [amount,      setAmount]      = useState(link?.amount ?? '')
  const [url,         setUrl]         = useState(link?.url || (initialProvider === 'paypal' ? PAYPAL_BASE : STRIPE_BASE))
  const [description, setDescription] = useState(link?.description || '')
  const [holder,      setHolder]      = useState(link?.holder || '')
  const [iban,        setIban]        = useState(link?.iban || '')
  const [swift,       setSwift]       = useState(link?.swift || '')
  const [address,     setAddress]     = useState(link?.address || '')
  const [err, setErr] = useState('')
  const bank = provider === 'bank'

  const changeProvider = next => {
    setProvider(next)
    setErr('')
    if (link || next === 'bank') return
    // Nëse linku s'është ndryshuar dorazi (është ende parapopullimi), ndërroje sipas ofruesit
    if (url === STRIPE_BASE || url === PAYPAL_BASE || /^https:\/\/paypal\.me\/[^/]*\/?\d*(\.\d+)?EUR$/i.test(url)) {
      setUrl(next === 'stripe' ? STRIPE_BASE : PAYPAL_BASE)
    }
  }

  const changeAmount = val => {
    setAmount(val)
    // PayPal.me pranon shumën në fund të URL-së: paypal.me/handle/50EUR
    const m = url.match(/^(https:\/\/paypal\.me\/[^/]+\/)(\d+(\.\d+)?EUR)?$/i)
    if (provider === 'paypal' && m) setUrl(`${m[1]}${val ? `${val}EUR` : ''}`)
  }

  const save = () => {
    if (bank) {
      if (!holder.trim()) { setErr('Emri Mbiemri i mbajtësit është i domosdoshëm.'); return }
      const cleanIban = iban.replace(/\s+/g, '').toUpperCase()
      if (!cleanIban) { setErr('IBAN është i domosdoshëm.'); return }
      const data = {
        provider: 'bank',
        holder: holder.trim(),
        iban: cleanIban,
        swift: swift.replace(/\s+/g, '').toUpperCase(),
        address: address.trim(),
      }
      if (link) {
        setStripeLinks(prev => prev.map(l => l.id === link.id ? { ...l, ...data } : l))
        showToast('Llogaria bankare u përditësua ✓')
      } else {
        setStripeLinks(prev => [...prev, { id: `STL-${Date.now()}`, ...data }])
        showToast('Llogaria bankare u shtua ✓')
      }
      onClose()
      return
    }

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) { setErr('Shuma duhet të jetë numër pozitiv.'); return }
    let cleanUrl = url.trim()
    if (!cleanUrl || cleanUrl === STRIPE_BASE || cleanUrl === PAYPAL_BASE) { setErr('Linku i pagesës është i domosdoshëm.'); return }
    if (!/^https?:\/\//i.test(cleanUrl)) cleanUrl = `https://${cleanUrl}`

    if (link) {
      setStripeLinks(prev => prev.map(l => l.id === link.id
        ? { ...l, provider, amount: Number(amount), url: cleanUrl, description: description.trim() }
        : l
      ))
      showToast(`Linku ${fmt(Number(amount))} u përditësua ✓`)
    } else {
      setStripeLinks(prev => [...prev, {
        id: `STL-${Date.now()}`,
        provider,
        amount: Number(amount),
        url: cleanUrl,
        description: description.trim(),
      }])
      showToast(`Linku ${fmt(Number(amount))} u shtua ✓`)
    }
    onClose()
  }

  return (
    <Modal
      title={link
        ? (bank ? 'Ndrysho Llogarinë Bankare' : 'Ndrysho Linkun e Pagesës')
        : (bank ? 'Llogari e Re Bankare' : 'Link i Ri Pagese')}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-outline" onClick={onClose}>Anulo</button>
          <button className="btn btn-primary" onClick={save}>
            {link ? 'Ruaj Ndryshimet' : (bank ? 'Shto Llogarinë' : 'Shto Linkun')}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <FormGroup label="Ofruesi i pagesës">
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(PROVIDERS).map(([id, p]) => {
              // Gjatë editimit s'ndërrohet mes link-ut dhe llogarisë bankare (fushat janë të ndryshme)
              const locked = !!link && kindOf(id) !== kindOf(initialProvider)
              return (
                <button
                  key={id}
                  type="button"
                  disabled={locked}
                  onClick={() => changeProvider(id)}
                  className={`py-2 px-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                    provider === id
                      ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                      : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${p.dot}`} />
                  {p.label}
                </button>
              )
            })}
          </div>
        </FormGroup>

        {bank ? (
          <>
            <FormGroup label="Emri Mbiemri i mbajtësit të llogarisë">
              <input
                className={inputCls}
                placeholder="p.sh. Filan Fisteku"
                value={holder}
                onChange={e => setHolder(e.target.value)}
                autoFocus
              />
            </FormGroup>
            <FormGroup label="IBAN">
              <input
                className={`${inputCls} font-mono uppercase`}
                placeholder="XK05 0000 0000 0000 0000"
                value={iban}
                onChange={e => setIban(e.target.value)}
              />
            </FormGroup>
            <FormGroup label="SWIFT / BIC">
              <input
                className={`${inputCls} font-mono uppercase`}
                placeholder="ABCDXKPR"
                value={swift}
                onChange={e => setSwift(e.target.value)}
              />
            </FormGroup>
            <FormGroup label="Adresa">
              <textarea
                rows={2}
                className={inputCls}
                placeholder="Rruga, qyteti, shteti"
                value={address}
                onChange={e => setAddress(e.target.value)}
              />
            </FormGroup>
          </>
        ) : (
          <>
            <FormGroup label="Shuma (€)">
              <input
                type="number"
                step="0.01"
                className={`${inputCls} font-mono`}
                placeholder="25.00"
                value={amount}
                onChange={e => changeAmount(e.target.value)}
                autoFocus
              />
            </FormGroup>
            <FormGroup label={provider === 'stripe' ? 'Link Stripe (Payment Link)' : 'Link PayPal'}>
              <input
                className={`${inputCls} font-mono`}
                placeholder={provider === 'stripe' ? 'https://buy.stripe.com/...' : 'https://paypal.me/...'}
                value={url}
                onChange={e => setUrl(e.target.value)}
              />
            </FormGroup>
            <FormGroup label="Përshkrim (opsional)">
              <input
                className={inputCls}
                placeholder="p.sh. Abonim vjetor..."
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </FormGroup>
          </>
        )}
        {err && <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold">{err}</p>}
      </div>
    </Modal>
  )
}

/* ══════════════════════════════════════════════════════════
   Kartat — rrjetë kompakte dhe rresht i listës
══════════════════════════════════════════════════════════ */
function useCopy(link, fmt) {
  const { showToast } = useApp()
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      const text = `Për të proceduar me pagesën, ju lutemi klikoni në linkun e mëposhtëm:\n${link.url}\n\nSapo të përfundoni transaksionin, ju lutemi të na njoftoni.\n\nFaleminderit!`
      await navigator.clipboard.writeText(text)
      setCopied(true)
      showToast(`Linku ${PROVIDERS[providerOf(link)].label} ${fmt(link.amount)} u kopjua ✓`)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      showToast('S\'mund ta kopjoj — kopjoje dorazi.', 'error')
    }
  }
  return [copied, copy]
}

// Kopjimi i të dhënave të një llogarie bankare
function useCopyBank(account) {
  const { showToast } = useApp()
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(bankCopyText(account))
      setCopied(true)
      showToast('Të dhënat e llogarisë u kopjuan ✓')
      setTimeout(() => setCopied(false), 1800)
    } catch {
      showToast('S\'mund ta kopjoj — kopjoje dorazi.', 'error')
    }
  }
  return [copied, copy]
}

const onKeyActivate = fn => ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); fn() } }

function LinkCard({ link, onEdit, onDelete, fmt }) {
  const [copied, copy] = useCopy(link, fmt)
  const p = PROVIDERS[providerOf(link)]

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={copy}
      onKeyDown={onKeyActivate(copy)}
      title="Kliko për të kopjuar menjëherë"
      className={`group bg-white dark:bg-gray-800 rounded-xl border p-2.5 flex flex-col justify-between transition-all cursor-pointer hover:shadow-sm ${
        copied
          ? 'border-emerald-400 dark:border-emerald-600 ring-2 ring-emerald-500/20'
          : 'border-gray-200/90 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
      }`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md flex items-center gap-1 ${p.tag}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${p.dot}`} />
          {p.label}
        </span>
        <div className="flex items-center gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
          <button
            onClick={ev => { ev.stopPropagation(); onEdit(link) }}
            className="p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
            title="Ndrysho"
          >
            <Pencil size={11} />
          </button>
          <button
            onClick={ev => { ev.stopPropagation(); onDelete(link) }}
            className="p-1 rounded text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30"
            title="Fshi"
          >
            <Trash2 size={11} />
          </button>
        </div>
      </div>

      <div className="my-0.5 min-w-0">
        <div className="text-base sm:text-lg font-black font-mono tracking-tight text-gray-900 dark:text-gray-100 leading-tight">
          {fmt(link.amount)}
        </div>
        <div className="text-[10px] font-mono text-gray-400 dark:text-gray-500 truncate mt-0.5">{cleanUrlOf(link.url)}</div>
        {link.description && (
          <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate mt-0.5">{link.description}</div>
        )}
      </div>

      <div className="mt-2 pt-1.5 border-t border-gray-100 dark:border-gray-700/80 flex items-center gap-1">
        <button
          onClick={ev => { ev.stopPropagation(); copy() }}
          className={`flex-1 py-1.5 px-2 rounded-lg font-bold text-[11px] flex items-center justify-center gap-1 transition-all ${
            copied
              ? 'bg-emerald-500 text-white'
              : 'bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400'
          }`}
        >
          {copied ? <><Check size={12} /> U kopjua!</> : <><Copy size={12} /> Kopjo</>}
        </button>
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={ev => ev.stopPropagation()}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors shrink-0"
          title="Hap faqen"
        >
          <ExternalLink size={12} />
        </a>
      </div>
    </div>
  )
}

function LinkRow({ link, onEdit, onDelete, fmt }) {
  const [copied, copy] = useCopy(link, fmt)
  const p = PROVIDERS[providerOf(link)]

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={copy}
      onKeyDown={onKeyActivate(copy)}
      className={`bg-white dark:bg-gray-800 rounded-xl border p-2 flex items-center justify-between gap-2.5 transition-all cursor-pointer hover:shadow-sm ${
        copied
          ? 'border-emerald-400 dark:border-emerald-600 ring-1 ring-emerald-500/20'
          : 'border-gray-200/90 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded shrink-0 ${p.tag}`}>{p.label}</span>
        <div className="min-w-0 flex items-baseline gap-2">
          <span className="text-sm font-black font-mono text-gray-900 dark:text-gray-100">{fmt(link.amount)}</span>
          <span className="hidden sm:inline text-[10px] font-mono text-gray-400 truncate max-w-[140px]">{cleanUrlOf(link.url)}</span>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={ev => { ev.stopPropagation(); copy() }}
          className={`py-1 px-2.5 rounded-lg font-bold text-[11px] flex items-center gap-1 transition-all ${
            copied ? 'bg-emerald-500 text-white' : 'bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
          }`}
        >
          {copied ? <><Check size={12} /> U kopjua!</> : <><Copy size={12} /> Kopjo</>}
        </button>
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={ev => ev.stopPropagation()}
          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          title="Hap faqen"
        >
          <ExternalLink size={12} />
        </a>
        <button onClick={ev => { ev.stopPropagation(); onEdit(link) }} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" title="Ndrysho">
          <Pencil size={12} />
        </button>
        <button onClick={ev => { ev.stopPropagation(); onDelete(link) }} className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400" title="Fshi">
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  )
}

/* ── Llogari bankare: kartë (pamja rrjetë) dhe rresht (pamja listë) ── */
function BankCard({ account, onEdit, onDelete }) {
  const [copied, copy] = useCopyBank(account)
  const p = PROVIDERS.bank

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={copy}
      onKeyDown={onKeyActivate(copy)}
      title="Kliko për të kopjuar të dhënat"
      className={`group col-span-2 bg-white dark:bg-gray-800 rounded-xl border p-2.5 flex flex-col justify-between transition-all cursor-pointer hover:shadow-sm ${
        copied
          ? 'border-emerald-400 dark:border-emerald-600 ring-2 ring-emerald-500/20'
          : 'border-gray-200/90 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
      }`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md flex items-center gap-1 ${p.tag}`}>
          <Landmark size={10} />
          {p.label}
        </span>
        <div className="flex items-center gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
          <button
            onClick={ev => { ev.stopPropagation(); onEdit(account) }}
            className="p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
            title="Ndrysho"
          >
            <Pencil size={11} />
          </button>
          <button
            onClick={ev => { ev.stopPropagation(); onDelete(account) }}
            className="p-1 rounded text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30"
            title="Fshi"
          >
            <Trash2 size={11} />
          </button>
        </div>
      </div>

      <div className="my-0.5 min-w-0 space-y-0.5">
        <div className="text-sm font-black text-gray-900 dark:text-gray-100 leading-tight truncate">{account.holder}</div>
        <div className="text-[11px] font-mono text-gray-700 dark:text-gray-300 break-all">{formatIban(account.iban)}</div>
        {account.swift && (
          <div className="text-[10px] font-mono text-gray-500 dark:text-gray-400">SWIFT: {account.swift}</div>
        )}
        {account.address && (
          <div className="text-[10px] text-gray-500 dark:text-gray-400 line-clamp-2">{account.address}</div>
        )}
      </div>

      <div className="mt-2 pt-1.5 border-t border-gray-100 dark:border-gray-700/80">
        <button
          onClick={ev => { ev.stopPropagation(); copy() }}
          className={`w-full py-1.5 px-2 rounded-lg font-bold text-[11px] flex items-center justify-center gap-1 transition-all ${
            copied
              ? 'bg-emerald-500 text-white'
              : 'bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400'
          }`}
        >
          {copied ? <><Check size={12} /> U kopjua!</> : <><Copy size={12} /> Kopjo të dhënat</>}
        </button>
      </div>
    </div>
  )
}

function BankRow({ account, onEdit, onDelete }) {
  const [copied, copy] = useCopyBank(account)
  const p = PROVIDERS.bank

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={copy}
      onKeyDown={onKeyActivate(copy)}
      className={`bg-white dark:bg-gray-800 rounded-xl border p-2 flex items-center justify-between gap-2.5 transition-all cursor-pointer hover:shadow-sm ${
        copied
          ? 'border-emerald-400 dark:border-emerald-600 ring-1 ring-emerald-500/20'
          : 'border-gray-200/90 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded shrink-0 flex items-center gap-1 ${p.tag}`}>
          <Landmark size={10} />
          Bankë
        </span>
        <div className="min-w-0">
          <div className="text-sm font-black text-gray-900 dark:text-gray-100 truncate">{account.holder}</div>
          <div className="text-[10px] font-mono text-gray-400 truncate">{formatIban(account.iban)}</div>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={ev => { ev.stopPropagation(); copy() }}
          className={`py-1 px-2.5 rounded-lg font-bold text-[11px] flex items-center gap-1 transition-all ${
            copied ? 'bg-emerald-500 text-white' : 'bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
          }`}
        >
          {copied ? <><Check size={12} /> U kopjua!</> : <><Copy size={12} /> Kopjo</>}
        </button>
        <button onClick={ev => { ev.stopPropagation(); onEdit(account) }} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" title="Ndrysho">
          <Pencil size={12} />
        </button>
        <button onClick={ev => { ev.stopPropagation(); onDelete(account) }} className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400" title="Fshi">
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════
   Faqja kryesore — Link Pagese (Stripe / PayPal / Transfer Bankar)
══════════════════════════════════════════════════════════ */
const VIEW_KEY = 'arestv_stripe_view'

export default function Stripe() {
  const { stripeLinks, setStripeLinks, setModal, closeModal, fmt } = useApp()
  const [search, setSearch] = useState('')
  const [sortDir, setSortDir] = useState('asc') // 'asc' | 'desc' — sipas shumës
  const [amountFilter, setAmountFilter] = useState('all')
  const [providerFilter, setProviderFilter] = useState('all')
  const [viewMode, setViewMode] = useState(() => {
    try { return localStorage.getItem(VIEW_KEY) === 'list' ? 'list' : 'grid' } catch { return 'grid' }
  })

  const changeView = mode => {
    setViewMode(mode)
    try { localStorage.setItem(VIEW_KEY, mode) } catch {}
  }

  const counts = useMemo(() => ({
    all: stripeLinks.length,
    stripe: stripeLinks.filter(l => providerOf(l) === 'stripe').length,
    paypal: stripeLinks.filter(l => providerOf(l) === 'paypal').length,
    bank: stripeLinks.filter(isBank).length,
  }), [stripeLinks])

  const filtered = useMemo(() => stripeLinks
    .filter(l => {
      if (providerFilter !== 'all' && providerOf(l) !== providerFilter) return false

      const q = search.trim().toLowerCase()

      if (isBank(l)) {
        // Filtrat e shumës vlejnë vetëm për linqet — llogaritë bankare s'kanë shumë
        if (amountFilter !== 'all') return false
        if (!q) return true
        return (
          (l.holder || '').toLowerCase().includes(q) ||
          (l.iban || '').toLowerCase().includes(q.replace(/\s+/g, '')) ||
          (l.swift || '').toLowerCase().includes(q) ||
          (l.address || '').toLowerCase().includes(q) ||
          'transfer bankar bank'.includes(q)
        )
      }

      if (amountFilter === 'under50' && l.amount >= 50) return false
      if (amountFilter === '50to100' && (l.amount < 50 || l.amount > 100)) return false
      if (amountFilter === 'over100' && l.amount <= 100) return false

      if (!q) return true
      return (
        String(l.amount).includes(q) ||
        l.amount.toFixed(2).includes(q) ||
        (l.url || '').toLowerCase().includes(q) ||
        (l.description || '').toLowerCase().includes(q) ||
        providerOf(l).includes(q)
      )
    })
    .sort((a, b) => {
      // Llogaritë bankare vijnë pas linqeve (sipas emrit); linqet rendisen sipas shumës
      if (isBank(a) && isBank(b)) return (a.holder || '').localeCompare(b.holder || '')
      if (isBank(a)) return 1
      if (isBank(b)) return -1
      return sortDir === 'asc' ? a.amount - b.amount : b.amount - a.amount
    }),
    [stripeLinks, search, amountFilter, providerFilter, sortDir]
  )

  const openAdd  = ()  => setModal(<PaymentLinkModal defaultProvider={providerFilter !== 'all' ? providerFilter : 'stripe'} onClose={closeModal} />)
  const openEdit = (l) => setModal(<PaymentLinkModal link={l} onClose={closeModal} />)

  const handleDelete = (link) => {
    const what = isBank(link) ? `llogarinë bankare të "${link.holder}"` : `linkun ${fmt(link.amount)}`
    if (!window.confirm(`A je i sigurt që dëshiron ta fshish ${what}?`)) return
    setStripeLinks(prev => prev.filter(l => l.id !== link.id))
  }

  const PROVIDER_TABS = [
    { id: 'all', label: 'Të Gjitha', dot: null },
    { id: 'stripe', label: 'Stripe', dot: PROVIDERS.stripe.dot },
    { id: 'paypal', label: 'PayPal', dot: PROVIDERS.paypal.dot },
    { id: 'bank', label: 'Transfer Bankar', dot: PROVIDERS.bank.dot },
  ]

  const bankOnly = providerFilter === 'bank'

  return (
    <div className="space-y-3.5">
      {/* Titulli "Link Pagese" jeton te header-i global (Header.jsx, kur page === 'stripe'). */}

      <PaymentsSubTabs />

      <div className="bg-white dark:bg-gray-800 p-2.5 sm:p-3 rounded-2xl border border-gray-200/90 dark:border-gray-700 shadow-sm space-y-2.5">
        {/* Rreshti 1: ofruesit + pamja + renditja + shto */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center p-1 bg-gray-100 dark:bg-gray-800/80 rounded-xl border border-gray-200/60 dark:border-gray-700/60 overflow-x-auto max-w-full">
            {PROVIDER_TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setProviderFilter(t.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  providerFilter === t.id
                    ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {t.dot && <span className={`w-2 h-2 rounded-full ${t.dot}`} />}
                {t.label}
                <span className="text-[10px] font-bold px-1.5 rounded-full bg-gray-200/70 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                  {counts[t.id]}
                </span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <div className="flex items-center p-0.5 bg-gray-100 dark:bg-gray-800 rounded-xl border border-gray-200/60 dark:border-gray-700/60">
              <button
                onClick={() => changeView('grid')}
                className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm' : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                title="Pamje rrjetë"
              >
                <LayoutGrid size={15} />
              </button>
              <button
                onClick={() => changeView('list')}
                className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm' : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                title="Pamje listë"
              >
                <List size={15} />
              </button>
            </div>

            {!bankOnly && (
              <button
                onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
                title={sortDir === 'asc' ? 'Duke renditur: më e vogla te më e madhja' : 'Duke renditur: më e madhja te më e vogla'}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs font-semibold transition-all"
              >
                <ArrowUpDown size={13} className="text-gray-400" />
                {sortDir === 'asc' ? '€ ↑' : '€ ↓'}
              </button>
            )}

            <button className="btn btn-primary" onClick={openAdd}>
              <Plus size={14} /> {bankOnly ? 'Llogari e Re' : 'Link i Ri'}
            </button>
          </div>
        </div>

        {/* Rreshti 2: kërkimi + filtrat e shumës */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-2 border-t border-gray-100 dark:border-gray-700/80">
          <div className="relative flex-1 max-w-md">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
            <input
              className="w-full pl-9 pr-8 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white placeholder-gray-400 text-xs font-medium outline-none focus:ring-2 focus:ring-blue-50 dark:focus:ring-blue-900/20 focus:border-blue-400 transition-all"
              placeholder={bankOnly ? 'Kërko sipas emrit, IBAN-it ose adresës...' : 'Kërko sipas shumës (€10, 50...), linkut ose emrit...'}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <X size={13} />
              </button>
            )}
          </div>

          {!bankOnly && (
            <div className="flex items-center gap-1 overflow-x-auto text-[11px] font-semibold shrink-0">
              {AMOUNT_FILTERS.map(f => (
                <button
                  key={f.id}
                  onClick={() => setAmountFilter(f.id)}
                  className={`px-2.5 py-1 rounded-lg whitespace-nowrap transition-all ${
                    amountFilter === f.id
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold border border-blue-200/80 dark:border-blue-900/60'
                      : 'border border-transparent text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-10 text-center space-y-3">
          <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-500 mx-auto flex items-center justify-center">
            {bankOnly ? <Landmark size={20} /> : <Link2 size={20} />}
          </div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">
            {stripeLinks.length === 0
              ? 'Nuk ka ende linqe pagese'
              : bankOnly && counts.bank === 0
                ? 'Nuk ka ende llogari bankare'
                : `Nuk u gjet asnjë rezultat${search ? ` për "${search}"` : ''}`}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
            {stripeLinks.length === 0
              ? 'Shto linqet e tua ekzistuese të Stripe dhe PayPal, sipas shumës, ose llogaritë bankare.'
              : bankOnly && counts.bank === 0
                ? 'Shto llogarinë bankare me emrin e mbajtësit, IBAN, SWIFT dhe adresën.'
                : 'Provo kërkim tjetër ose ndrysho filtrat, ose shto një të ri.'}
          </p>
          <button className="btn btn-primary mt-1" onClick={openAdd}>
            <Plus size={14} /> {stripeLinks.length === 0 ? 'Shto të parin' : bankOnly ? 'Shto Llogari' : 'Shto Link të Ri'}
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-2.5">
          {filtered.map(l => isBank(l)
            ? <BankCard key={l.id} account={l} onEdit={openEdit} onDelete={handleDelete} />
            : <LinkCard key={l.id} link={l} onEdit={openEdit} onDelete={handleDelete} fmt={fmt} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
          {filtered.map(l => isBank(l)
            ? <BankRow key={l.id} account={l} onEdit={openEdit} onDelete={handleDelete} />
            : <LinkRow key={l.id} link={l} onEdit={openEdit} onDelete={handleDelete} fmt={fmt} />)}
        </div>
      )}
    </div>
  )
}
