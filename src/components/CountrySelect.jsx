import { useState, useMemo, useRef, useEffect } from 'react'
import { Search, X, ChevronDown, Globe } from 'lucide-react'
import { countries } from '../data/mockData'

/* ══════════════════════════════════════════════════════════
   Searchable combobox "Shteti" — përdoret te forma e klientit
   (Customers.jsx) dhe te paneli i detajeve (CustomerDetailsModal.jsx).
   Lista e shteteve është fikse (data/mockData.js), pa shtim emri të ri.
══════════════════════════════════════════════════════════ */
export default function CountrySelect({ value, onChange }) {
  const [query,  setQuery]  = useState(value || '')
  const [open,   setOpen]   = useState(false)
  const [active, setActive] = useState(-1)
  const wrapRef  = useRef(null)
  const inputRef = useRef(null)

  const filtered = useMemo(() => {
    const q = (query || '').trim().toLowerCase()
    if (!q) return countries
    return countries.filter(c => c.toLowerCase().includes(q))
  }, [query])

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
    setOpen(true)
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
      <div className="relative flex items-center">
        <Search size={14} className="absolute left-3 text-gray-400 pointer-events-none" />
        <input
          ref={inputRef}
          className="form-control pl-8 pr-8"
          placeholder="Kërko shtetin..."
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); setActive(-1) }}
          onFocus={() => { setOpen(true); inputRef.current?.select() }}
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
                <Globe size={12} className="text-gray-300 flex-shrink-0"/>
                {name}
              </div>
            ))
          ) : (
            <div className="px-3 py-3 text-xs text-gray-400 text-center">Nuk u gjet asnjë shtet</div>
          )}
        </div>
      )}
    </div>
  )
}
