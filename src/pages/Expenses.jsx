import { useState, useRef, useMemo, useEffect, lazy, Suspense } from 'react'
import {
  Receipt, Trash2, Plus, Search, X, RefreshCw,
  ChevronLeft, ChevronRight, Filter, Users, Wallet, FileSpreadsheet,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { formatDate } from '../utils/dateFormat'
import { useFeatures } from '../features/useFeatures'
import { EmptyState, Modal, FormGroup, Pagination } from '../components/UI'
import FormPageWrapper from '../components/FormPageWrapper'
import { expenseTypes, depositedToOptions, mockVendors } from '../data/mockData'
import { downloadTemplate } from '../components/ImportExcelModal'
const ImportExcelModal = lazy(() => import('../components/ImportExcelModal'))

// sort/page defaults

const FREQ_OPTIONS = ['Mujore', 'Vjetore', 'Ditore']

const FREQ_COLOR = {
  Mujore:  'bg-blue-50 text-blue-600',
  Vjetore: 'bg-purple-50 text-purple-600',
  Ditore:  'bg-amber-50 text-amber-600',
}

/* ── Slide-select për llogaritë ── */
function SlideSelect({ value, onChange, options, placeholder = 'Zgjidh llogarinë...' }) {
  const ref = useRef(null)
  const scroll = dir => ref.current && (ref.current.scrollLeft += dir * 160)

  return (
    <div>
      <div className="flex items-center gap-1.5">
        <button type="button" onClick={() => scroll(-1)}
          className="flex-shrink-0 w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50 transition-colors">
          <ChevronLeft size={14} />
        </button>
        <div ref={ref} className="flex gap-2 overflow-x-auto scroll-smooth flex-1"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {options.map(opt => (
            <button key={opt} type="button"
              onClick={() => onChange(value === opt ? '' : opt)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all whitespace-nowrap ${
                value === opt
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600'
              }`}>
              {opt}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => scroll(1)}
          className="flex-shrink-0 w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50 transition-colors">
          <ChevronRight size={14} />
        </button>
      </div>
      {value && (
        <p className="text-xs text-blue-500 mt-1.5 font-medium">✓ {value}</p>
      )}
      {!value && placeholder && (
        <p className="text-xs text-gray-300 mt-1.5">{placeholder}</p>
      )}
    </div>
  )
}

/* ── Modal shpenzimi ── */
export function ExpenseModal({ expense, onClose, isFormPage }) {
  const { setExpenses, depositAccounts, showToast, currentOrgId, logActivity } = useApp()
  const { canUsePartnerExpenseFields } = useFeatures()
  const isEdit = !!expense
  const today = new Date().toISOString().slice(0, 10)

  const empty = {
    date: today, type: expenseTypes[0], vendor: '',
    paidFrom: '', reference: '', paidBy: 'Enndy',
    recurring: false, recurringFreq: 'Mujore', amount: '',
  }
  const [form, setForm] = useState(isEdit ? { ...expense } : empty)
  const [err,  setErr]  = useState('')
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const save = () => {
    if (!form.type)   { setErr('Zgjidh llojin e shpenzimit.'); return }
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0)
      { setErr('Shuma duhet të jetë numër pozitiv.'); return }

    const payload = { ...form, amount: Number(form.amount) }

    if (isEdit) {
      setExpenses(prev => prev.map(e => e.id === expense.id ? payload : e))
      logActivity(`Përditësoi shpenzimin ${expense.id} — ${form.type} €${Number(form.amount)}`, 'Shpenzimet')
      showToast('Shpenzimi u përditësua! ✓')
    } else {
      const newId = `EXP-${Date.now()}`
      setExpenses(prev => [{ ...payload, id: newId, orgId: currentOrgId }, ...prev])
      logActivity(`Regjistroi shpenzimin ${newId} — ${form.type} €${Number(form.amount)}`, 'Shpenzimet')
      showToast('Shpenzimi u regjistrua! ✓')
    }
    onClose()
  }

  const formContent = (
    <>
      {err && (
        <div className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4">
          {err}
        </div>
      )}

      {/* Data + Shuma */}
      <div className="grid grid-cols-2 gap-4">
        <FormGroup label="Data e shpenzimit">
          <input className="form-control" type="date"
            value={form.date} onChange={e => set('date', e.target.value)} />
        </FormGroup>
        <FormGroup label="Shuma (€) *">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm select-none">€</span>
            <input className="form-control pl-7" type="number" min="0" step="0.01"
              value={form.amount} onChange={e => set('amount', e.target.value)}
              placeholder="0.00" />
          </div>
        </FormGroup>
      </div>

      {/* Lloji i shpenzimit */}
      <FormGroup label="Për çfarë është bërë shpenzimi *">
        <select className="form-control" value={form.type}
          onChange={e => set('type', e.target.value)}>
          {expenseTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </FormGroup>

      {/* Furnitori */}
      <FormGroup label="Furnitori">
        <select className="form-control" value={form.vendor}
          onChange={e => set('vendor', e.target.value)}>
          <option value="">Zgjidh furnitorin...</option>
          {mockVendors.map(v => <option key={v.id} value={v.name}>{v.name}</option>)}
        </select>
      </FormGroup>

      {/* Nga cila llogari - Only for organizations with partner expense feature enabled */}
      {canUsePartnerExpenseFields && (
        <FormGroup label="Nga cila llogari u pagua">
          <select className="form-control" value={form.paidFrom}
            onChange={e => set('paidFrom', e.target.value)}>
            <option value="">Zgjidh llogarinë...</option>
            {depositAccounts.map(acc => <option key={acc} value={acc}>{acc}</option>)}
          </select>
        </FormGroup>
      )}

      {/* Referenca */}
      <FormGroup label="Referenca / Shënime">
        <input className="form-control" value={form.reference}
          onChange={e => set('reference', e.target.value)}
          placeholder="Çdo shënim shtesë..." />
      </FormGroup>

      {/* Partneri - Only for organizations with partner expense feature enabled */}
      {canUsePartnerExpenseFields && (
        <FormGroup label="Nga cili partner u bë shpenzimi *">
          <div className="flex gap-3">
            {depositedToOptions.map(opt => (
              <button key={opt} type="button" onClick={() => set('paidBy', opt)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${
                  form.paidBy === opt
                    ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                    : 'border-gray-200 bg-white text-gray-500 hover:border-blue-300'
                }`}>
                👤 {opt}
              </button>
            ))}
          </div>
        </FormGroup>
      )}

      {/* Recurring */}
      <div className="border border-gray-100 rounded-xl p-4 bg-gray-50/50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <RefreshCw size={15} className={form.recurring ? 'text-blue-500' : 'text-gray-300'} />
            <span className="text-sm font-semibold text-gray-700">Shpenzim i përsëritur</span>
            {form.recurring && (
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${FREQ_COLOR[form.recurringFreq]}`}>
                {form.recurringFreq}
              </span>
            )}
          </div>
          {/* Toggle */}
          <button type="button" onClick={() => set('recurring', !form.recurring)}
            className={`relative w-11 h-6 rounded-full transition-colors ${form.recurring ? 'bg-blue-600' : 'bg-gray-200'}`}>
            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
              form.recurring ? 'translate-x-[22px]' : 'translate-x-0.5'
            }`} />
          </button>
        </div>

        {form.recurring && (
          <div>
            <p className="text-xs text-gray-400 mb-2">Frekuenca e përsëritjes:</p>
            <div className="flex gap-2">
              {FREQ_OPTIONS.map(f => (
                <button key={f} type="button" onClick={() => set('recurringFreq', f)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${
                    form.recurringFreq === f
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-gray-200 bg-white text-gray-500 hover:border-blue-300'
                  }`}>
                  {f === 'Ditore' ? '📅 Ditore' : f === 'Mujore' ? '📆 Mujore' : '🗓 Vjetore'}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )

  // If rendering as form page (side panel), don't use Modal wrapper
  if (isFormPage) {
    return (
      <div className="space-y-4">
        {formContent}
        <div className="flex gap-2 pt-4 border-t border-gray-200">
          <button className="btn btn-outline flex-1" onClick={onClose}>Anulo</button>
          <button className="btn btn-primary flex-1" onClick={save}>
            {isEdit ? 'Ruaj ndryshimet' : 'Regjistro'}
          </button>
        </div>
      </div>
    )
  }

  // Otherwise, render with Modal wrapper
  return (
    <Modal
      title={
        <span className="flex items-center gap-2">
          <Receipt size={18} className="text-red-400" />
          {isEdit ? 'Edito shpenzimin' : 'Shpenzim i ri'}
        </span>
      }
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-outline" onClick={onClose}>Anulo</button>
          <button className="btn btn-primary" onClick={save}>
            {isEdit ? 'Ruaj ndryshimet' : 'Regjistro'}
          </button>
        </>
      }
    >
      {formContent}
    </Modal>
  )
}

/* ── Konfirmim fshirje ── */
function DeleteConfirm({ exp, onClose }) {
  const { setExpenses, showToast, logActivity } = useApp()
  const del = () => {
    setExpenses(prev => prev.filter(e => e.id !== exp.id))
    logActivity(`Fshiu shpenzimin ${exp.id} — ${exp.type} €${Number(exp.amount)}`, 'Shpenzimet')
    showToast('Shpenzimi u fshi! ✓')
    onClose()
  }
  return (
    <Modal
      title={<span className="flex items-center gap-2 text-red-500"><Trash2 size={16}/>Fshi shpenzimin</span>}
      onClose={onClose}
      footer={<>
        <button className="btn btn-outline" onClick={onClose}>Anulo</button>
        <button className="btn bg-red-500 hover:bg-red-600 text-white" onClick={del}>Fshi</button>
      </>}
    >
      <p className="text-sm text-gray-600">
        A jeni i sigurt? Ky veprim nuk mund të kthehet mbrapsht.
      </p>
    </Modal>
  )
}

/* ══════════════════════════════════════════════════════════ */
export default function ExpensesPage() {
  const { expenses, setExpenses, closeModal, fmt, showToast, page, navigate, logActivity } = useApp()

  const [search,         setSearch]        = useState('')
  const [partnerFilt,    setPartner]       = useState('all')
  const [typeFilt,       setType]          = useState('all')
  const [recurFilt,      setRecurFilt]     = useState('all')
  const [pg,             setPg]            = useState(1)
  const [perPage,        setPerPage]       = useState(50)
  const [sortField,      setSortField]     = useState('date')
  const [sortDir,        setSortDir]       = useState('desc')
  const [importOpen,     setImportOpen]    = useState(false)
  const [openDropdown,   setOpenDropdown]  = useState(null)

  // Detect if we're in form mode (page like "expenses:create" or "expenses:ID:edit")
  const pageMatch = page.split(':')
  const isFormMode = pageMatch[0] === 'expenses' && (pageMatch[1] === 'create' || pageMatch[1]?.includes('EXP-'))
  const editExpenseId = pageMatch[1]?.includes('EXP-') ? pageMatch[1] : null
  const editExpense = editExpenseId ? expenses.find(e => e.id === editExpenseId) : null

  // Close modal if we leave form mode
  useEffect(() => {
    if (!isFormMode) {
      closeModal()
    }
  }, [isFormMode, closeModal])

  function handleImportExpenses(rows) {
    setExpenses(prev => {
      const maxNum = prev.reduce((m, e) => {
        const n = parseInt((e.id || '').replace('EXP-','')) || 0
        return n > m ? n : m
      }, 0)
      const renumbered = rows.map((r, i) => ({
        ...r,
        id: `EXP-${String(maxNum + i + 1).padStart(6, '0')}`,
      }))
      showToast(`U importuan ${renumbered.length} shpenzime`, 'success')
      return [...prev, ...renumbered]
    })
  }

  /* unique types in data */
  const usedTypes = [...new Set(expenses.map(e => e.type).filter(Boolean))]

  const filtered = useMemo(() => expenses.filter(e => {
    const matchSearch  = !search || (e.type||'').toLowerCase().includes(search.toLowerCase()) || (e.vendor||'').toLowerCase().includes(search.toLowerCase())
    const matchPartner = partnerFilt === 'all' || e.paidBy === partnerFilt
    const matchType    = typeFilt === 'all' || e.type === typeFilt
    const matchRecur   = recurFilt === 'all' || (recurFilt === 'recurring' ? e.recurring : !e.recurring)
    return matchSearch && matchPartner && matchType && matchRecur
  }), [expenses, search, partnerFilt, typeFilt, recurFilt])

  const toggleSort = field => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
    setPg(1)
  }

  const sorted = useMemo(() => [...filtered].sort((a, b) => {
    let cmp = 0
    if      (sortField === 'date')   cmp = (a.date||'').localeCompare(b.date||'')
    else if (sortField === 'type')   cmp = (a.type||'').localeCompare(b.type||'')
    else if (sortField === 'vendor') cmp = (a.vendor||'').localeCompare(b.vendor||'')
    else if (sortField === 'paidBy') cmp = (a.paidBy||'').localeCompare(b.paidBy||'')
    else if (sortField === 'amount') cmp = (a.amount || 0) - (b.amount || 0)
    return sortDir === 'asc' ? cmp : -cmp
  }), [filtered, sortField, sortDir])

  const paged = sorted.slice((pg - 1) * perPage, pg * perPage)

  /* stats */
  const total      = filtered.reduce((s, e) => s + e.amount, 0)
  const allTotal   = expenses.reduce((s, e) => s + e.amount, 0)
  const enndiTotal = expenses.filter(e => e.paidBy === 'Enndy').reduce((s, e) => s + e.amount, 0)
  const samkiTotal = expenses.filter(e => e.paidBy === 'Samki').reduce((s, e) => s + e.amount, 0)
  const recurTotal = expenses.filter(e => e.recurring).reduce((s, e) => s + e.amount, 0)

  const openAdd    = ()  => navigate('expenses:create')
  const openEdit   = e   => navigate(`expenses:${e.id}:edit`)
  const openDelete = e   => navigate(`expenses:${e.id}:delete`)

  /* recurring unique items (by type+vendor) for the recurring section */
  // If delete mode, show delete confirmation
  if (pageMatch[2] === 'delete') {
    const expenseToDelete = expenses.find(e => e.id === pageMatch[1])
    if (expenseToDelete) {
      return <DeleteConfirm exp={expenseToDelete} onClose={() => navigate('expenses')} />
    }
  }

  // If in form mode, show only the form
  if (isFormMode && pageMatch[1] !== 'delete') {
    return (
      <div key={`expense-form-${editExpenseId || 'create'}`}>
        <FormPageWrapper
          title={editExpense ? `Ndrysho Shpenzimin` : 'Shpenzim i Ri'}
          subtitle={editExpense ? `${editExpense.type} - ${fmt(editExpense.amount)}` : 'Krijo një shpenzim të ri'}
          onBack={() => navigate('expenses')}
        >
          <ExpenseModal
            key={`modal-${editExpenseId || 'create'}`}
            expense={editExpense || undefined}
            onClose={() => navigate('expenses')}
            isFormPage={true}
          />
        </FormPageWrapper>
      </div>
    )
  }

  const recurringItems = useMemo(() => {
    const seen = new Set()
    return expenses.filter(e => {
      if (!e.recurring) return false
      const key = `${e.type}||${e.vendor}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [expenses])

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Shpenzimet</h2>
          <p className="text-sm text-gray-400 mt-0.5">Totali: {fmt(allTotal)}</p>
        </div>
        <div className="flex items-center gap-1.5">
          {/* Import - Hidden on mobile */}
          <button
            className="hidden sm:flex w-9 h-9 items-center justify-center rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
            onClick={() => setImportOpen(true)}
            title="Importo Excel"
          >
            <FileSpreadsheet size={16}/>
          </button>

          {/* New Expense - Hidden on mobile (see FAB below) */}
          <button
            className="hidden sm:flex w-9 h-9 items-center justify-center rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors font-bold text-lg"
            onClick={openAdd}
            title="Shpenzim i ri"
          >
            +
          </button>
        </div>
      </div>
      {importOpen && (
        <Suspense fallback={null}>
          <ImportExcelModal
            entity="expenses"
            onImport={handleImportExpenses}
            onClose={() => setImportOpen(false)}
          />
        </Suspense>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 px-5 py-4">
          <p className="text-xs text-gray-400 font-medium mb-1">Totali</p>
          <p className="text-xl font-bold text-red-500">- {fmt(allTotal)}</p>
          <p className="text-xs text-gray-400 mt-0.5">{expenses.length} shpenzime</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 px-5 py-4">
          <div className="flex items-center gap-1.5 mb-1">
            <Users size={13} className="text-blue-400" />
            <p className="text-xs text-gray-400 font-medium">Enndy</p>
          </div>
          <p className="text-xl font-bold text-blue-600">- {fmt(enndiTotal)}</p>
          <p className="text-xs text-gray-400 mt-0.5">{Math.round(enndiTotal/allTotal*100)||0}% e totalit</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 px-5 py-4">
          <div className="flex items-center gap-1.5 mb-1">
            <Users size={13} className="text-purple-400" />
            <p className="text-xs text-gray-400 font-medium">Samki</p>
          </div>
          <p className="text-xl font-bold text-purple-600">- {fmt(samkiTotal)}</p>
          <p className="text-xs text-gray-400 mt-0.5">{Math.round(samkiTotal/allTotal*100)||0}% e totalit</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 px-5 py-4">
          <div className="flex items-center gap-1.5 mb-1">
            <RefreshCw size={13} className="text-emerald-400" />
            <p className="text-xs text-gray-400 font-medium">Të Rregullta</p>
          </div>
          <p className="text-xl font-bold text-gray-700">- {fmt(recurTotal)}</p>
          <p className="text-xs text-gray-400 mt-0.5">{recurringItems.length} shpenzime aktive</p>
        </div>
      </div>

      {/* Shpenzime të Rregullta (recurring) */}
      {recurringItems.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <RefreshCw size={14} className="text-blue-500" />
            <h3 className="text-sm font-bold text-gray-700">Shpenzime të Rregullta</h3>
            <span className="bg-blue-50 text-blue-600 text-xs font-bold px-2 py-0.5 rounded-full">{recurringItems.length} aktive</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {recurringItems.map(e => (
              <div key={e.id} className="bg-white border border-gray-100 rounded-xl px-4 py-3 flex items-center gap-3 hover:border-blue-200 transition-colors">
                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <RefreshCw size={15} className="text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{e.type}</p>
                  <p className="text-xs text-gray-400 truncate">{e.vendor || '—'}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-red-500">- {fmt(e.amount)}</p>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${FREQ_COLOR[e.recurringFreq] || 'bg-gray-50 text-gray-400'}`}>
                    {e.recurringFreq}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filtrat */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2
                        focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-50 transition-all flex-1 min-w-[160px]">
          <Search size={14} className="text-gray-400" />
          <input className="bg-transparent border-none outline-none text-sm text-gray-600 w-full placeholder-gray-400"
            placeholder="Kërko shpenzime..."
            value={search} onChange={e => { setSearch(e.target.value); setPg(1) }} />
          {search && (
            <button onClick={() => { setSearch(''); setPg(1) }} className="text-gray-300 hover:text-gray-500">
              <X size={13} />
            </button>
          )}
        </div>

        <select className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 outline-none focus:border-blue-400 cursor-pointer"
          value={partnerFilt} onChange={e => { setPartner(e.target.value); setPg(1) }}>
          <option value="all">Të dy partnerët</option>
          <option value="Enndy">Enndy</option>
          <option value="Samki">Samki</option>
        </select>

        <select className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 outline-none focus:border-blue-400 cursor-pointer max-w-[200px]"
          value={typeFilt} onChange={e => { setType(e.target.value); setPg(1) }}>
          <option value="all">Të gjitha llojet</option>
          {usedTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        <select className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 outline-none focus:border-blue-400 cursor-pointer"
          value={recurFilt} onChange={e => { setRecurFilt(e.target.value); setPg(1) }}>
          <option value="all">Të gjitha</option>
          <option value="recurring">Vetëm të rregullta</option>
          <option value="once">Vetëm njëherësh</option>
        </select>

        <select className="hidden sm:block bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 outline-none focus:border-blue-400 cursor-pointer"
          value={perPage} onChange={e => { setPerPage(Number(e.target.value)); setPg(1) }}>
          <option value={25}>25 / faqe</option>
          <option value={50}>50 / faqe</option>
          <option value={100}>100 / faqe</option>
          <option value={200}>200 / faqe</option>
        </select>

        <span className="text-xs text-gray-400 flex items-center gap-1 ml-auto">
          <Filter size={12} /> {filtered.length}
          {partnerFilt !== 'all' && <span className="font-semibold text-gray-600 ml-1">· {fmt(total)}</span>}
        </span>
      </div>

      {/* Mobile Card View - Hidden on sm+ */}
      {paged.length > 0 && (
        <div className="sm:hidden space-y-2 mb-4">
          {paged.map(e => (
              <div key={e.id} className="bg-white border border-gray-200 rounded-lg p-3">
                <div className="flex justify-between items-start gap-2">
                  {/* Col 1: Type + Date + Vendor */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-bold text-gray-800 text-sm">{e.type}</p>
                      {e.recurring && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${FREQ_COLOR[e.recurringFreq] || 'bg-gray-50 text-gray-400'}`}>
                          {e.recurringFreq}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{formatDate(e.date)}</p>
                    <p className="text-xs text-gray-600 mt-0.5">{e.vendor || '—'}</p>
                  </div>

                  {/* Col 2: Amount + Account + Partner */}
                  <div className="text-right">
                    <p className="font-bold text-red-500 text-sm">- {fmt(e.amount)}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{e.paidFrom || '—'}</p>
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold mt-0.5 ${
                      e.paidBy === 'Enndy' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'
                    }`}>
                      {e.paidBy || '—'}
                    </span>
                  </div>

                  {/* Col 3: Actions - Dropdown */}
                  <div className="relative flex-shrink-0">
                    <button
                      className="w-9 h-9 flex items-center justify-center rounded-lg bg-gray-100 text-gray-600 hover:bg-blue-600 hover:text-white transition-all"
                      onClick={() => setOpenDropdown(openDropdown === e.id ? null : e.id)}
                    >
                      ⋮
                    </button>

                    {/* Dropdown Menu */}
                    {openDropdown === e.id && (
                      <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-xl z-50">
                        <button
                          className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 flex items-center gap-2 border-b"
                          onClick={() => {
                            openEdit(e)
                            setOpenDropdown(null)
                          }}
                        >
                          ✏ Edito
                        </button>
                        <button
                          className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                          onClick={() => {
                            openDelete(e)
                            setOpenDropdown(null)
                          }}
                        >
                          <Trash2 size={14}/> Fshi
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Mobile pagination - hidden on sm+ */}
      {paged.length > 0 && (
        <div className="sm:hidden mb-6">
          <Pagination page={pg} total={filtered.length} perPage={perPage} onChange={setPg} />
        </div>
      )}

      {/* Tabela */}
      {paged.length === 0 ? (
        <EmptyState icon={Receipt} title="Nuk ka shpenzime"
          sub="Regjistro shpenzimin e parë"
          action={<button className="btn btn-primary mt-2" onClick={openAdd}><Plus size={14}/>Shpenzim i ri</button>}/>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden hidden sm:block">
          <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 420px)' }}>
          <table className="w-full text-sm min-w-[480px]">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-gray-100 bg-gray-50">
                {[
                  { key: 'date',   label: 'Data',     cls: '' },
                  { key: 'type',   label: 'Për çfarë',cls: '' },
                ].map(col => (
                  <th key={col.key} className={`table-th cursor-pointer select-none hover:text-blue-600 ${col.cls}`}
                      onClick={() => toggleSort(col.key)}>
                    <span className="flex items-center gap-1">
                      {col.label}
                      <span className="text-[10px]">{sortField === col.key ? (sortDir === 'asc' ? '↑' : '↓') : <span className="text-gray-300">↕</span>}</span>
                    </span>
                  </th>
                ))}
                <th className="table-th hidden md:table-cell cursor-pointer select-none hover:text-blue-600"
                    onClick={() => toggleSort('vendor')}>
                  <span className="flex items-center gap-1">
                    Furnitori
                    <span className="text-[10px]">{sortField === 'vendor' ? (sortDir === 'asc' ? '↑' : '↓') : <span className="text-gray-300">↕</span>}</span>
                  </span>
                </th>
                <th className="table-th hidden lg:table-cell">Llogaria</th>
                <th className="table-th hidden md:table-cell">Referenca</th>
                <th className="table-th cursor-pointer select-none hover:text-blue-600"
                    onClick={() => toggleSort('paidBy')}>
                  <span className="flex items-center gap-1">
                    Partneri
                    <span className="text-[10px]">{sortField === 'paidBy' ? (sortDir === 'asc' ? '↑' : '↓') : <span className="text-gray-300">↕</span>}</span>
                  </span>
                </th>
                <th className="table-th text-right cursor-pointer select-none hover:text-blue-600"
                    onClick={() => toggleSort('amount')}>
                  <span className="flex items-center justify-end gap-1">
                    Shuma
                    <span className="text-[10px]">{sortField === 'amount' ? (sortDir === 'asc' ? '↑' : '↓') : <span className="text-gray-300">↕</span>}</span>
                  </span>
                </th>
                <th className="table-th w-16 bg-gray-50"/>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paged.map(e => (
                <tr key={e.id} className="hover:bg-red-50/20 transition-colors group">
                  <td className="table-td text-gray-400 text-xs">{formatDate(e.date)}</td>
                  <td className="table-td">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-800 text-xs">{e.type}</span>
                      {e.recurring && (
                        <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${FREQ_COLOR[e.recurringFreq] || 'bg-gray-50 text-gray-400'}`}>
                          <RefreshCw size={8}/> {e.recurringFreq}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="table-td text-gray-500 text-xs hidden md:table-cell">
                    {e.vendor || <span className="text-gray-300">—</span>}
                  </td>
                  <td className="table-td text-gray-500 text-xs hidden lg:table-cell max-w-[130px] truncate">
                    {e.paidFrom || <span className="text-gray-300">—</span>}
                  </td>
                  <td className="table-td text-gray-400 text-xs hidden md:table-cell">
                    {e.reference || <span className="text-gray-300">—</span>}
                  </td>
                  <td className="table-td">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                      e.paidBy === 'Enndy' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'
                    }`}>
                      {e.paidBy || '—'}
                    </span>
                  </td>
                  <td className="table-td text-right font-bold text-red-500">
                    - {fmt(e.amount)}
                  </td>
                  <td className="table-td">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="icon-btn text-blue-400 hover:bg-blue-50" onClick={() => openEdit(e)} title="Edito">
                        ✏
                      </button>
                      <button className="icon-btn text-red-300 hover:bg-red-50 hover:text-red-500" onClick={() => openDelete(e)} title="Fshi">
                        <Trash2 size={14}/>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>

          {/* Footer totals - hidden on mobile */}
          {filtered.length > 0 && (
            <div className="hidden sm:flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/40 text-xs">
              <div className="flex gap-4 text-gray-400">
                <span>Enndy: <span className="font-bold text-blue-600">- {fmt(filtered.filter(e=>e.paidBy==='Enndy').reduce((s,e)=>s+e.amount,0))}</span></span>
                <span>Samki: <span className="font-bold text-purple-600">- {fmt(filtered.filter(e=>e.paidBy==='Samki').reduce((s,e)=>s+e.amount,0))}</span></span>
              </div>
              <span className="font-semibold text-gray-500">
                Total: <span className="text-red-500 font-bold">{fmt(total)}</span>
              </span>
            </div>
          )}

          <div className="hidden sm:block">
            <Pagination page={pg} total={filtered.length} perPage={perPage} onChange={setPg} />
          </div>
        </div>
      )}

      {/* Floating Action Button - Mobile only */}
      <div
        className="fab sm:hidden"
        onClick={openAdd}
        title="Shpenzim i ri"
      >
        <Plus size={28}/>
      </div>
    </div>
  )
}
