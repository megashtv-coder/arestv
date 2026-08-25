import { useState, useRef, useEffect } from 'react'
import { Columns3, ChevronUp, ChevronDown, RotateCcw } from 'lucide-react'
import { useColumnPrefs } from '../hooks/useColumnPrefs'

/* ── Buton + panel për me editu kolonat e një tabele: shfaq/fshih, ndërro radhën.
   Ruhet vetëm për userin aktual (shih useColumnPrefs). ── */
export default function ColumnManagerButton({ tableKey, defaultColumns }) {
  const { allColumns, savePrefs, resetPrefs } = useColumnPrefs(tableKey, defaultColumns)
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onClick = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  const currentOrder  = allColumns.map(c => c.key)
  const currentHidden = allColumns.filter(c => c.hidden).map(c => c.key)
  const visibleCount  = allColumns.length - currentHidden.length

  const toggleHidden = key => {
    const next = currentHidden.includes(key)
      ? currentHidden.filter(k => k !== key)
      : [...currentHidden, key]
    // Mos lejo me i fsheh krejt kolonat — duhet të mbetet të paktën një e dukshme
    if (next.length === allColumns.length) return
    savePrefs(currentOrder, next)
  }

  const move = (key, dir) => {
    const idx = currentOrder.indexOf(key)
    const swapWith = idx + dir
    if (swapWith < 0 || swapWith >= currentOrder.length) return
    const next = [...currentOrder]
    ;[next[idx], next[swapWith]] = [next[swapWith], next[idx]]
    savePrefs(next, currentHidden)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
        title="Kolonat e tabelës"
      >
        <Columns3 size={16}/>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-gray-200 rounded-xl shadow-lg z-30 py-2">
          <div className="flex items-center justify-between px-3 py-1.5">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Kolonat e tabelës</p>
            <button
              onClick={resetPrefs}
              className="flex items-center gap-1 text-[11px] font-semibold text-gray-400 hover:text-blue-500 transition-colors"
              title="Rivendos parazgjedhjet"
            >
              <RotateCcw size={11}/> Rivendos
            </button>
          </div>

          <div className="max-h-72 overflow-y-auto px-1.5">
            {allColumns.map((col, i) => (
              <div key={col.key}
                className="flex items-center gap-2 px-1.5 py-1.5 rounded-lg hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={!col.hidden}
                  onChange={() => toggleHidden(col.key)}
                  disabled={!col.hidden && visibleCount <= 1}
                  className="w-4 h-4 cursor-pointer flex-shrink-0 accent-blue-500"
                />
                <span className={`flex-1 text-sm truncate ${col.hidden ? 'text-gray-400' : 'text-gray-700 font-medium'}`}>
                  {col.label}
                </span>
                <button
                  onClick={() => move(col.key, -1)}
                  disabled={i === 0}
                  className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-25 disabled:hover:bg-transparent transition-colors"
                >
                  <ChevronUp size={13}/>
                </button>
                <button
                  onClick={() => move(col.key, 1)}
                  disabled={i === allColumns.length - 1}
                  className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-25 disabled:hover:bg-transparent transition-colors"
                >
                  <ChevronDown size={13}/>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
