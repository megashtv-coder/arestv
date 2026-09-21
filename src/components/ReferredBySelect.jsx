import { useState, useMemo, useRef, useEffect } from 'react'
import { Search, X, ChevronDown, UserCheck } from 'lucide-react'
import { useApp } from '../context/AppContext'

/* ══════════════════════════════════════════════════════════
   Searchable combobox "Referuar nga" — përdoret te forma e
   klientit (Customers.jsx) dhe te "Klient i ri" brenda faturës
   (InvoiceModal.jsx), që të dyja të kenë të njëjtën listë
   referentësh ekzistues për zgjedhje, jo vetëm fushë e lirë.
══════════════════════════════════════════════════════════ */
export default function ReferredBySelect({ value, onChange, excludeId }) {
  const { customers, representatives } = useApp()
  const [query,  setQuery]  = useState(value || '')
  const [open,   setOpen]   = useState(false)
  const [active, setActive] = useState(-1)
  const wrapRef  = useRef(null)
  const inputRef = useRef(null)

  // Mban listën e emrave nga të dyja burimet: klientë + përfaqësues (unique)
  const names = useMemo(() => {
    const uniqueNames = new Set([
      // Emrat e klientëve
      ...customers
        .filter(c => c.id !== excludeId)
        .map(c => (c.name || `${c.firstName || ''} ${c.lastName || ''}`).trim())
        .filter(Boolean),
      // Përfaqësuesit e ruajtur
      ...(representatives || [])
    ])
    return Array.from(uniqueNames).sort()
  }, [customers, representatives, excludeId])

  // Filtrimi live
  const filtered = useMemo(() => {
    const q = (query || '').trim().toLowerCase()
    if (!q) return names
    return names.filter(n => n.toLowerCase().includes(q))
  }, [names, query])

  // Mbyll dropdown-in nëse klikohet jashtë
  useEffect(() => {
    const handler = e => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Sinkronizon query me value nga jashtë (p.sh. reset form)
  useEffect(() => { setQuery(value || '') }, [value])

  const select = name => {
    setQuery(name)
    onChange(name)
    setOpen(false)
    setActive(-1)
  }

  const clear = () => {
    setQuery('')
    onChange('')
    setOpen(false)
    inputRef.current?.focus()
  }

  const handleKey = e => {
    if (!open) { if (e.key === 'ArrowDown' || e.key === 'Enter') setOpen(true); return }
    if (e.key === 'ArrowDown')  { e.preventDefault(); setActive(a => Math.min(a + 1, filtered.length - 1)) }
    if (e.key === 'ArrowUp')    { e.preventDefault(); setActive(a => Math.max(a - 1, -1)) }
    if (e.key === 'Enter')      { e.preventDefault(); if (active >= 0 && filtered[active]) select(filtered[active]) }
    if (e.key === 'Escape')     { setOpen(false); setActive(-1) }
  }

  return (
    <div ref={wrapRef} className="relative">
      {/* Input */}
      <div className="relative flex items-center">
        <Search size={14} className="absolute left-3 text-gray-400 pointer-events-none" />
        <input
          ref={inputRef}
          className="form-control pl-8 pr-8"
          placeholder="Kërko person referues..."
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

      {/* Dropdown list */}
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-52 overflow-y-auto">
          {/* Opsioni "asnjë" */}
          <div
            className="px-3 py-2 text-xs text-gray-400 hover:bg-gray-50 cursor-pointer border-b border-gray-100"
            onMouseDown={() => select('')}
          >
            — Asnjë —
          </div>

          {/* Filtered results */}
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

          {/* Add new referrer option */}
          {query.trim() && (filtered.length === 0 || !filtered.includes(query.trim())) ? (
            <div
              className={`px-3 py-2 text-sm cursor-pointer flex items-center gap-2 transition-colors hover:bg-blue-50 text-blue-500 hover:text-blue-600 font-medium ${
                filtered.length > 0 ? 'border-t border-gray-100' : ''
              }`}
              onMouseDown={() => select(query.trim())}
              onMouseEnter={() => setActive(filtered.length)}
            >
              <UserCheck size={12} className="flex-shrink-0"/>
              ✓ Shto "{query.trim()}" si referues të ri
            </div>
          ) : null}

          {/* No results */}
          {filtered.length === 0 && !query.trim() ? (
            <div className="px-3 py-3 text-xs text-gray-400 text-center">Nuk u gjet asnjë klient</div>
          ) : null}
        </div>
      )}
    </div>
  )
}
