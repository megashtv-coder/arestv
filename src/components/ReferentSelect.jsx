import { useState, useMemo, useRef, useEffect } from 'react'
import { Search, X, ChevronDown, UserCheck, Plus } from 'lucide-react'
import { useApp } from '../context/AppContext'

/* ══════════════════════════════════════════════════════════
   Searchable combobox "Referenca (kush pranoi)" — për pagesat.
   Lista këtu (paymentReferents) është e mirëmbajtur e vet, jo e
   derivuar nga klientët — dhe lejon shtim të një emri të ri
   direkt duke shkruar (i ruhet automatikisht për herë tjetër).
══════════════════════════════════════════════════════════ */
export default function ReferentSelect({ value, onChange }) {
  const { paymentReferents, setPaymentReferents } = useApp()
  const [query,  setQuery]  = useState(value || '')
  const [open,   setOpen]   = useState(false)
  const [active, setActive] = useState(-1)
  const wrapRef  = useRef(null)
  const inputRef = useRef(null)

  const names = useMemo(() => Array.from(new Set(paymentReferents || [])).sort(), [paymentReferents])

  const filtered = useMemo(() => {
    const q = (query || '').trim().toLowerCase()
    if (!q) return names
    return names.filter(n => n.toLowerCase().includes(q))
  }, [names, query])

  useEffect(() => {
    const handler = e => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => { setQuery(value || '') }, [value])

  const select = name => {
    setQuery(name)
    onChange(name)
    setOpen(false)
    setActive(-1)
  }

  const addNew = raw => {
    const trimmed = (raw || '').trim()
    if (!trimmed) return
    if (!names.some(n => n.toLowerCase() === trimmed.toLowerCase())) {
      setPaymentReferents(prev => [...(prev || []), trimmed])
    }
    select(trimmed)
  }

  const clear = () => {
    setQuery('')
    onChange('')
    setOpen(false)
    inputRef.current?.focus()
  }

  const handleKey = e => {
    if (!open) { if (e.key === 'ArrowDown' || e.key === 'Enter') setOpen(true); return }
    const total = filtered.length + (query.trim() && !filtered.includes(query.trim()) ? 1 : 0)
    if (e.key === 'ArrowDown')  { e.preventDefault(); setActive(a => Math.min(a + 1, total - 1)) }
    if (e.key === 'ArrowUp')    { e.preventDefault(); setActive(a => Math.max(a - 1, -1)) }
    if (e.key === 'Enter') {
      e.preventDefault()
      if (active >= 0 && active < filtered.length) select(filtered[active])
      else if (query.trim()) addNew(query.trim())
    }
    if (e.key === 'Escape') { setOpen(false); setActive(-1) }
  }

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative flex items-center">
        <Search size={14} className="absolute left-3 text-gray-400 pointer-events-none" />
        <input
          ref={inputRef}
          className="form-control pl-8 pr-8"
          placeholder="Kërko ose shto referent..."
          value={query}
          onChange={e => { setQuery(e.target.value); onChange(e.target.value); setOpen(true); setActive(-1) }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKey}
          autoComplete="off"
        />
        {query
          ? <button type="button" onClick={clear} className="absolute right-3 text-gray-300 hover:text-gray-500"><X size={13}/></button>
          : <ChevronDown size={13} className="absolute right-3 text-gray-300 pointer-events-none"/>
        }
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-52 overflow-y-auto">
          {filtered.length > 0 ? (
            filtered.map((name, i) => (
              <div
                key={name}
                className={`px-3 py-2 text-sm cursor-pointer flex items-center gap-2 transition-colors ${
                  i === active ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50 text-gray-700'
                }`}
                onMouseDown={() => select(name)}
                onMouseEnter={() => setActive(i)}
              >
                <UserCheck size={12} className="text-gray-300 flex-shrink-0"/>
                {name}
              </div>
            ))
          ) : null}

          {query.trim() && !filtered.includes(query.trim()) ? (
            <div
              className={`px-3 py-2 text-sm cursor-pointer flex items-center gap-2 transition-colors hover:bg-blue-50 text-blue-500 hover:text-blue-600 font-medium ${
                filtered.length > 0 ? 'border-t border-gray-100' : ''
              }`}
              onMouseDown={() => addNew(query.trim())}
              onMouseEnter={() => setActive(filtered.length)}
            >
              <Plus size={12} className="flex-shrink-0"/>
              Shto "{query.trim()}" si referent të ri
            </div>
          ) : null}

          {filtered.length === 0 && !query.trim() ? (
            <div className="px-3 py-3 text-xs text-gray-400 text-center">Ende s'ka referentë — fillo duke shkruar</div>
          ) : null}
        </div>
      )}
    </div>
  )
}
