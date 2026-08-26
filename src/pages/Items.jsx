import { useState, useEffect } from 'react'
import { Package, Plus, Search, Pencil, Trash2, X, ChevronUp, ChevronDown, Lock, Unlock } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Modal, FormGroup, EmptyState, Pagination } from '../components/UI'
import FormPageWrapper from '../components/FormPageWrapper'
import { salesAccounts } from '../data/mockData'

/* ─── helpers ───────────────────────────────────────────── */
const PER_PAGE = 10
const COST_PIN = '2823'

/* ─── PIN Modal ─────────────────────────────────────────── */
function PinModal({ onSuccess, onClose }) {
  const [pin, setPin] = useState('')
  const [err, setErr] = useState(false)

  const attempt = () => {
    if (pin === COST_PIN) { onSuccess(); onClose() }
    else { setErr(true); setPin('') }
  }

  return (
    <Modal
      title={
        <span className="flex items-center gap-2">
          <Lock size={16} className="text-gray-500" />
          Fut PIN-in për të parë çmimet
        </span>
      }
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-outline" onClick={onClose}>Anulo</button>
          <button className="btn btn-primary btn-sm self-start sm:self-auto" onClick={attempt} disabled={pin.length !== 4}>
            Konfirmo
          </button>
        </>
      }
    >
      <p className="text-xs text-gray-400 mb-4">Fut kodin 4-shifror për të zbuluar çmimin e blerjes dhe marzhën.</p>
      <div className="flex justify-center">
        <input
          className="form-control text-center text-2xl font-mono tracking-[0.5em] w-40"
          type="password"
          maxLength={4}
          inputMode="numeric"
          value={pin}
          onChange={e => { setPin(e.target.value.replace(/\D/g, '')); setErr(false) }}
          onKeyDown={e => e.key === 'Enter' && pin.length === 4 && attempt()}
          autoFocus
          placeholder="••••"
        />
      </div>
      {err && (
        <p className="text-xs text-blue-500 text-center mt-3 font-semibold">PIN i gabuar. Provo përsëri.</p>
      )}
    </Modal>
  )
}

function accountLabel(code) {
  const acc = salesAccounts.find(a => a.code === code)
  return acc ? `${acc.code} · ${acc.name}` : code
}

/* ─── Modal shto / edito ─────────────────────────────────── */
function ItemModal({ item, onClose, isFormPage }) {
  const { setItems, vendors, showToast, fmt, logActivity } = useApp()
  const isEdit = !!item

  const empty = { name: '', salePrice: '', purchasePrice: '', account: salesAccounts[0].code, vendor: '' }
  const [form, setForm] = useState(isEdit ? { ...item } : empty)
  const [err,  setErr]  = useState('')

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const save = () => {
    if (!form.name.trim()) { setErr('Emri i produktit/shërbimit është i detyrueshëm.'); return }
    if (form.salePrice === '' || isNaN(Number(form.salePrice))) { setErr('Çmimi i shitjes duhet të jetë numër.'); return }
    if (form.purchasePrice !== '' && isNaN(Number(form.purchasePrice))) { setErr('Çmimi i blerjes duhet të jetë numër.'); return }

    const payload = {
      ...form,
      salePrice:     Number(form.salePrice),
      purchasePrice: form.purchasePrice === '' ? 0 : Number(form.purchasePrice),
    }

    if (isEdit) {
      setItems(prev => prev.map(i => i.id === item.id ? payload : i))
      logActivity(`Përditësoi produktin ${item.id} — ${form.name}`, 'Produktet')
      showToast('Produkti u përditësua me sukses! ✓')
    } else {
      const newId = `ITM-${Date.now()}`
      setItems(prev => [{ ...payload, id: newId }, ...prev])
      logActivity(`Shtoi produktin ${newId} — ${form.name}`, 'Produktet')
      showToast('Produkti u shtua me sukses! ✓')
    }
    onClose()
  }

  return (
    <Modal
      title={
        <span className="flex items-center gap-2">
          <Package size={18} className="text-blue-500" />
          {isEdit ? 'Edito produktin' : 'Produkt / Shërbim i ri'}
        </span>
      }
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-outline" onClick={onClose}>Anulo</button>
          <button className="btn btn-primary btn-sm self-start sm:self-auto" onClick={save}>
            {isEdit ? 'Ruaj ndryshimet' : 'Shto produktin'}
          </button>
        </>
      }
    >
      {err && (
        <div className="text-xs text-blue-500 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 mb-4">
          {err}
        </div>
      )}

      {/* Emri */}
      <FormGroup label="Emri i produktit / shërbimit *">
        <input
          className="form-control"
          value={form.name}
          onChange={e => set('name', e.target.value)}
          placeholder="p.sh. Konsulencë IT — Orë"
          autoFocus
        />
      </FormGroup>

      {/* Çmimet */}
      <div className="grid grid-cols-2 gap-4">
        <FormGroup label="Çmimi i shitjes *">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm select-none">€</span>
            <input
              className="form-control pl-7"
              type="number"
              min="0"
              step="0.01"
              value={form.salePrice}
              onChange={e => set('salePrice', e.target.value)}
              placeholder="0.00"
            />
          </div>
        </FormGroup>

        <FormGroup label="Çmimi i blerjes">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm select-none">€</span>
            <input
              className="form-control pl-7"
              type="number"
              min="0"
              step="0.01"
              value={form.purchasePrice}
              onChange={e => set('purchasePrice', e.target.value)}
              placeholder="0.00"
            />
          </div>
        </FormGroup>
      </div>

      {/* Llogaria kontabel */}
      <FormGroup label="Llogaria kontabel (shitje)">
        <select
          className="form-control"
          value={form.account}
          onChange={e => set('account', e.target.value)}
        >
          {salesAccounts.map(a => (
            <option key={a.code} value={a.code}>
              {a.code} · {a.name}
            </option>
          ))}
        </select>
      </FormGroup>

      {/* Furnitori */}
      <FormGroup label="Furnitori">
        <select
          className="form-control"
          value={form.vendor}
          onChange={e => set('vendor', e.target.value)}
        >
          <option value="">— Pa furnitor —</option>
          {vendors.map(v => (
            <option key={v.id} value={v.name}>{v.name}</option>
          ))}
        </select>
      </FormGroup>

      {/* Marzha live */}
      {form.salePrice !== '' && form.purchasePrice !== '' &&
       Number(form.salePrice) > 0 && Number(form.purchasePrice) > 0 && (
        <div className="mt-1 flex items-center gap-3 text-xs text-gray-400 bg-gray-50 rounded-lg px-4 py-2.5">
          <span>Marzha:</span>
          <span className="font-bold text-emerald-600">
            €{(Number(form.salePrice) - Number(form.purchasePrice)).toFixed(2)}
          </span>
          <span className="text-gray-300">·</span>
          <span className="font-bold text-emerald-600">
            {((1 - Number(form.purchasePrice) / Number(form.salePrice)) * 100).toFixed(1)}%
          </span>
        </div>
      )}
    </Modal>
  )
}

/* ─── Konfirmim fshirje ──────────────────────────────────── */
function DeleteConfirm({ item, onClose }) {
  const { setItems, showToast, logActivity } = useApp()
  const del = () => {
    setItems(prev => prev.filter(i => i.id !== item.id))
    logActivity(`Fshiu produktin ${item.id} — ${item.name}`, 'Produktet')
    showToast('Produkti u fshi! ✓', 'success')
    onClose()
  }
  return (
    <Modal
      title={<span className="flex items-center gap-2 text-blue-500"><Trash2 size={16}/>Fshi produktin</span>}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-outline" onClick={onClose}>Anulo</button>
          <button className="btn bg-blue-500 hover:bg-blue-600 text-white" onClick={del}>Fshi</button>
        </>
      }
    >
      <p className="text-sm text-gray-600">
        A jeni i sigurt që dëshironi të fshini <span className="font-bold text-gray-800">"{item.name}"</span>?
        <br />
        <span className="text-gray-400 text-xs">Ky veprim nuk mund të kthehet mbrapsht.</span>
      </p>
    </Modal>
  )
}

/* ─── Faqja kryesore ─────────────────────────────────────── */
export default function Items() {
  const { items, closeModal, fmt, page, navigate } = useApp()

  const [search,      setSearch]      = useState('')
  const [pg,          setPg]          = useState(1)
  const [sortKey,     setSortKey]     = useState('name')
  const [sortDir,     setSortDir]     = useState('asc')
  const [pinUnlocked, setPinUnlocked] = useState(false)
  const [showPin,     setShowPin]     = useState(false)

  // Detect if we're in form mode (page like "items:create" or "items:ID:edit")
  const pageMatch = page.split(':')
  const isFormMode = pageMatch[0] === 'items' && (pageMatch[1] === 'create' || pageMatch[1]?.includes('ITM-'))
  const editItemId = pageMatch[1]?.includes('ITM-') ? pageMatch[1] : null
  const editItem = editItemId ? items.find(i => i.id === editItemId) : null

  // Close modal if we leave form mode
  useEffect(() => {
    if (!isFormMode) {
      closeModal()
    }
  }, [isFormMode, closeModal])

  const handleLockToggle = () => {
    if (pinUnlocked) setPinUnlocked(false)
    else setShowPin(true)
  }

  /* kërkim */
  const filtered = items.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    (i.vendor && i.vendor.toLowerCase().includes(search.toLowerCase()))
  )

  /* renditje */
  const sorted = [...filtered].sort((a, b) => {
    let va = a[sortKey], vb = b[sortKey]
    if (typeof va === 'string') va = va.toLowerCase()
    if (typeof vb === 'string') vb = vb.toLowerCase()
    if (va < vb) return sortDir === 'asc' ? -1 : 1
    if (va > vb) return sortDir === 'asc' ?  1 : -1
    return 0
  })

  /* faqëzim */
  const paged = sorted.slice((pg - 1) * PER_PAGE, pg * PER_PAGE)

  const toggleSort = key => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
    setPg(1)
  }

  const SortIcon = ({ k }) =>
    sortKey === k
      ? sortDir === 'asc' ? <ChevronUp size={13} className="text-blue-500"/> : <ChevronDown size={13} className="text-blue-500"/>
      : <ChevronUp size={13} className="text-gray-300"/>

  const openAdd    = ()    => navigate('items:create')
  const openEdit   = item  => navigate(`items:${item.id}:edit`)
  const openDelete = item  => navigate(`items:${item.id}:delete`)

  const masked = <span className="text-gray-300 font-mono text-xs tracking-widest select-none cursor-pointer" onClick={() => setShowPin(true)}>••••</span>

  // If in form mode, show only the form
  if (isFormMode && pageMatch[2] !== 'delete') {
    return (
      <div key={`item-form-${editItemId || 'create'}`}>
        <FormPageWrapper
          title={editItem ? `Ndrysho Produktin` : 'Produkt i Ri'}
          subtitle={editItem ? `${fmt(editItem.salePrice)} - ${editItem.account}` : 'Krijo një produkt ose shërbim të ri'}
          onBack={() => navigate('items')}
        >
          <ItemModal
            key={`modal-${editItemId || 'create'}`}
            item={editItem || undefined}
            onClose={() => navigate('items')}
            isFormPage={true}
          />
        </FormPageWrapper>
      </div>
    )
  }

  /* stat cards */
  const totalItems   = items.length
  const withVendor   = items.filter(i => i.vendor).length
  const avgSale      = totalItems ? items.reduce((s, i) => s + i.salePrice, 0) / totalItems : 0
  const avgMargin    = items.filter(i => i.purchasePrice > 0).reduce((s, i) => {
    return s + ((i.salePrice - i.purchasePrice) / i.salePrice) * 100
  }, 0) / (items.filter(i => i.purchasePrice > 0).length || 1)

  return (
    <div>
      {/* Titulli dhe +Shto produkt tani jetojnë te header-i global (Header.jsx,
         kur page === 'items'). */}

      {/* PIN modal */}
      {showPin && (
        <PinModal
          onSuccess={() => setPinUnlocked(true)}
          onClose={() => setShowPin(false)}
        />
      )}

      {/* Delete confirmation */}
      {pageMatch[2] === 'delete' && editItem && (
        <DeleteConfirm item={editItem} onClose={() => navigate('items')} />
      )}

      {/* Stat mini-cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
        <div className="bg-white rounded-2xl border border-gray-200/90 shadow-sm px-4 py-4">
          <span className="text-3xl font-black font-mono tracking-tight text-gray-900 block">{totalItems}</span>
          <p className="text-xs text-gray-500 mt-1 font-bold">Artikuj gjithsej</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200/90 shadow-sm px-4 py-4">
          <span className="text-3xl font-black font-mono tracking-tight text-blue-600 block">{fmt(avgSale.toFixed(2))}</span>
          <p className="text-xs text-gray-500 mt-1 font-bold">Çmimi mesatar shitje</p>
        </div>
        <div
          className="bg-white rounded-2xl border border-gray-200/90 shadow-sm px-4 py-4 cursor-pointer hover:border-gray-300 transition-colors flex flex-col justify-between"
          onClick={() => !pinUnlocked && setShowPin(true)}
        >
          <div className="flex items-center justify-between">
            {pinUnlocked
              ? <span className="text-2xl font-black font-mono tracking-tight text-emerald-600">{avgMargin.toFixed(1)}%</span>
              : <span className="text-2xl font-black font-mono tracking-widest text-gray-300 select-none">••••</span>
            }
            {pinUnlocked
              ? <Unlock size={16} className="text-emerald-400"/>
              : <Lock size={16} className="text-gray-400"/>
            }
          </div>
          <p className="text-xs text-gray-500 mt-1 font-bold flex items-center gap-1">
            Marzha mesatare
            {pinUnlocked
              ? <Unlock size={10} className="text-emerald-400"/>
              : <Lock size={10} className="text-gray-400"/>
            }
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200/90 shadow-sm px-4 py-4">
          <span className="text-3xl font-black font-mono tracking-tight text-gray-900 block">{withVendor}</span>
          <p className="text-xs text-gray-500 mt-1 font-bold">Me furnitor</p>
        </div>
      </div>

      {/* Kërkim */}
      <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-gray-200/90 shadow-sm mb-5">
        <div className="relative w-full sm:w-80">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="w-full pl-8 pr-8 py-1.5 text-xs rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
            placeholder="Kërko produkt ose furnitor..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPg(1) }}
          />
          {search && (
            <button onClick={() => { setSearch(''); setPg(1) }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={13} />
            </button>
          )}
        </div>
        <span className="text-xs font-semibold text-gray-400 hidden sm:inline flex-shrink-0">{filtered.length} rezultate</span>
      </div>

      {/* Tabela */}
      {paged.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Nuk u gjetën produkte"
          sub={search ? 'Provo kërkim tjetër' : 'Shto produktin ose shërbimin e parë'}
          action={!search && (
            <button className="btn btn-primary mt-2" onClick={openAdd}>
              <Plus size={14} /> Shto produkt
            </button>
          )}
        />
      ) : (
        <>
        {/* Mobile Card View - Hidden on sm+ */}
        <div className="sm:hidden space-y-2 mb-4">
          {paged.map(item => {
            const margin = item.purchasePrice > 0
              ? ((item.salePrice - item.purchasePrice) / item.salePrice * 100).toFixed(1)
              : null
            return (
              <div key={item.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-3">
                <div className="flex justify-between items-start gap-2">
                  {/* Col 1: Emri + llogaria + furnitori */}
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => openEdit(item)}>
                    <p className="font-bold text-gray-900 text-sm truncate hover:text-blue-500 transition-colors">{item.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{accountLabel(item.account)}</p>
                    {item.vendor && <p className="text-xs text-gray-400 font-semibold">{item.vendor}</p>}
                  </div>

                  {/* Col 2: Çmimi + marzha */}
                  <div className="text-right">
                    <p className="font-mono font-bold text-gray-900 text-sm">{fmt(item.salePrice)}</p>
                    {pinUnlocked ? (
                      margin !== null && (
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold mt-0.5 ${
                          Number(margin) >= 30 ? 'bg-emerald-50 text-emerald-600'
                          : Number(margin) >= 10 ? 'bg-amber-50 text-amber-600'
                          : 'bg-blue-50 text-blue-500'
                        }`}>{margin}%</span>
                      )
                    ) : (
                      <span className="text-xs text-gray-300 cursor-pointer" onClick={() => setShowPin(true)}>{masked}</span>
                    )}
                  </div>

                  {/* Col 3: Veprimet */}
                  <div className="relative flex-shrink-0 flex gap-1">
                    <button
                      className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                      title="Edito"
                      onClick={() => openEdit(item)}
                    >
                      <Pencil size={16}/>
                    </button>
                    <button
                      className="w-9 h-9 flex items-center justify-center rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                      title="Fshi"
                      onClick={() => openDelete(item)}
                    >
                      <Trash2 size={16}/>
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Mobile pagination - hidden on sm+ */}
        <div className="sm:hidden mb-6">
          <Pagination page={pg} total={filtered.length} perPage={PER_PAGE} onChange={setPg} />
        </div>

        <div className="bg-white rounded-2xl border border-gray-200/90 shadow-sm overflow-hidden hidden sm:block">
          <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 300px)' }}>
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="table-th">
                  <button
                    className="flex items-center gap-1 hover:text-gray-700 transition-colors"
                    onClick={() => toggleSort('name')}
                  >
                    Emri <SortIcon k="name" />
                  </button>
                </th>
                <th className="table-th text-right">
                  <button
                    className="flex items-center gap-1 hover:text-gray-700 transition-colors ml-auto"
                    onClick={() => toggleSort('salePrice')}
                  >
                    Çm. Shitjes <SortIcon k="salePrice" />
                  </button>
                </th>
                <th className="table-th text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    {pinUnlocked && (
                      <button
                        className="flex items-center gap-1 hover:text-gray-700 transition-colors"
                        onClick={() => toggleSort('purchasePrice')}
                      >
                        Çm. Blerjes <SortIcon k="purchasePrice" />
                      </button>
                    )}
                    {!pinUnlocked && <span>Çm. Blerjes</span>}
                    <button
                      className={`ml-1 p-0.5 rounded transition-colors ${pinUnlocked ? 'text-emerald-500 hover:text-emerald-600' : 'text-gray-400 hover:text-gray-600'}`}
                      onClick={handleLockToggle}
                      title={pinUnlocked ? 'Mbyll' : 'Hap me PIN'}
                    >
                      {pinUnlocked ? <Unlock size={11}/> : <Lock size={11}/>}
                    </button>
                  </div>
                </th>
                <th className="table-th text-right hidden md:table-cell">
                  <div className="flex items-center justify-end gap-1">
                    Marzha
                    {pinUnlocked
                      ? <Unlock size={10} className="text-emerald-400 ml-0.5"/>
                      : <Lock size={10} className="text-gray-400 ml-0.5"/>
                    }
                  </div>
                </th>
                <th className="table-th hidden lg:table-cell">
                  Llogaria Kontabel
                </th>
                <th className="table-th hidden md:table-cell">
                  Furnitori
                </th>
                <th className="table-th w-20" />
              </tr>
            </thead>
            <tbody>
              {paged.map(item => {
                const margin = item.purchasePrice > 0
                  ? ((item.salePrice - item.purchasePrice) / item.salePrice * 100).toFixed(1)
                  : null
                return (
                  <tr
                    key={item.id}
                    className="hover:bg-gray-50 transition-colors group"
                  >
                    {/* Emri */}
                    <td className="table-td">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center flex-shrink-0">
                          <Package size={14} />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 text-sm">{item.name}</p>
                          <p className="text-xs text-gray-400 lg:hidden">{accountLabel(item.account)}</p>
                        </div>
                      </div>
                    </td>

                    {/* Çmimi shitjes */}
                    <td className="table-td text-right">
                      <span className="font-mono font-bold text-gray-900">{fmt(item.salePrice)}</span>
                    </td>

                    {/* Çmimi blerjes */}
                    <td className="table-td text-right">
                      {pinUnlocked
                        ? item.purchasePrice > 0
                          ? <span className="font-mono text-gray-600">{fmt(item.purchasePrice)}</span>
                          : <span className="text-gray-300">—</span>
                        : <span onClick={() => setShowPin(true)}>{masked}</span>
                      }
                    </td>

                    {/* Marzha */}
                    <td className="table-td text-right hidden md:table-cell">
                      {pinUnlocked
                        ? margin !== null
                          ? <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                              Number(margin) >= 30 ? 'bg-emerald-50 text-emerald-600'
                              : Number(margin) >= 10 ? 'bg-amber-50 text-amber-600'
                              : 'bg-blue-50 text-blue-500'
                            }`}>{margin}%</span>
                          : <span className="text-gray-300 text-xs">—</span>
                        : <span onClick={() => setShowPin(true)}>{masked}</span>
                      }
                    </td>

                    {/* Llogaria */}
                    <td className="table-td hidden lg:table-cell">
                      <span className="text-xs text-gray-500">{accountLabel(item.account)}</span>
                    </td>

                    {/* Furnitori */}
                    <td className="table-td hidden md:table-cell">
                      {item.vendor
                        ? <span className="text-xs text-gray-700 font-semibold">{item.vendor}</span>
                        : <span className="text-gray-300 text-xs">—</span>
                      }
                    </td>

                    {/* Veprimet */}
                    <td className="table-td">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          className="p-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                          title="Edito"
                          onClick={() => openEdit(item)}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                          title="Fshi"
                          onClick={() => openDelete(item)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          </div>
          <Pagination page={pg} total={filtered.length} perPage={PER_PAGE} onChange={setPg} />
        </div>
        </>
      )}

      {/* Floating Action Button - Mobile only */}
      <div
        className="fab sm:hidden"
        onClick={openAdd}
        title="Shto produkt"
      >
        <Plus size={28}/>
      </div>
    </div>
  )
}
