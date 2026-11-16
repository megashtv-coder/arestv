import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Check } from 'lucide-react'

/* Zëvendësim për <select> te format: lista e hapur ka pamjen e re (jo menunë e vjetër të shfletuesit), në light
   dhe dark mode. options: [{ value, label }]; onChange merr vlerën si tekst. Tastierë: Enter/Space/↑ ↓ e hapin,
   ↑ ↓ lëvizin, Enter zgjedh, Esc mbyll, Tab vazhdon te fusha tjetër. */
export default function SelectField({
  value, onChange, options,
  className = 'form-control',
  textClass = 'text-base sm:text-sm',
}) {
  const [open, setOpen]     = useState(false)
  const [active, setActive] = useState(0)
  const btnRef  = useRef(null)
  const dropRef = useRef(null)
  const [pos, setPos] = useState({ top: 0, left: 0, width: 160 })

  const same   = (a, b) => String(a) === String(b)
  const curIdx = Math.max(0, options.findIndex(o => same(o.value, value)))
  const cur    = options[curIdx]

  const openList = () => {
    const r = btnRef.current?.getBoundingClientRect()
    if (r) setPos({ top: r.bottom + 4, left: r.left, width: Math.max(r.width, 120) })
    setActive(curIdx)
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return
    const onDown = e => {
      if (!btnRef.current?.contains(e.target) && !dropRef.current?.contains(e.target)) setOpen(false)
    }
    // Lista është e pozicionuar fiks — mbyllet kur faqja rrëshqet (jo kur rrëshqet vetë lista)
    const onScroll = e => { if (!dropRef.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDown)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onScroll)
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onScroll)
    }
  }, [open])

  const pick = o => { onChange(String(o.value)); setOpen(false); btnRef.current?.focus() }

  const onKeyDown = e => {
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); openList() }
      return
    }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(i => Math.min(i + 1, options.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(i => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(options[active]) }
    else if (e.key === 'Escape') { e.stopPropagation(); setOpen(false) }
    else if (e.key === 'Tab') setOpen(false)
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
        className={`${className} flex items-center justify-between gap-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-gray-400/40 dark:focus-visible:ring-accent/40`}
      >
        <span className={`${textClass} truncate`}>{cur?.label}</span>
        <ChevronDown size={14} className={`text-gray-400 flex-shrink-0 transition-transform duration-150 dark:text-gray-500 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && createPortal(
        <div
          ref={dropRef}
          role="listbox"
          style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width, zIndex: 9999 }}
          className="bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden dark:bg-dk-high dark:border-white/10"
        >
          <div className="max-h-60 overflow-y-auto py-1">
            {options.map((o, i) => (
              <div
                key={o.value}
                role="option"
                aria-selected={same(o.value, value)}
                onMouseEnter={() => setActive(i)}
                onClick={() => pick(o)}
                className={`px-3 py-2.5 cursor-pointer flex items-center justify-between gap-3 transition-colors ${
                  i === active ? 'bg-gray-100 dark:bg-white/10' : ''
                }`}
              >
                <span className={`text-sm ${same(o.value, value) ? 'font-semibold text-gray-900 dark:text-accent-soft' : 'text-gray-700 dark:text-gray-200'}`}>
                  {o.label}
                </span>
                {same(o.value, value) && <Check size={14} className="text-gray-500 dark:text-accent-soft flex-shrink-0" />}
              </div>
            ))}
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
