import { useState, useEffect, useRef, Children } from 'react'
import { ChevronDown, Check } from 'lucide-react'

/* Zgjedhës me menu të personalizuar për filtrat — në light dhe dark mode (nuk përdoret më menuja e vjetër e
   shfletuesit). options: [{ value, label }]; value krahasohet si tekst. */
export default function DarkSelect({
  value, onChange, options, icon: Icon,
  hideIconOnSmall = true, alignRight = false,
  compact = false, wide = false, hideOnMobile = false, disabled = false,
  label,   // emri i filtrit: tregohet në vend të "Të gjitha" kur s'ka zgjedhje, ose si "Emri: Zgjedhja"
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDown = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    const onKey  = e => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const same = (a, b) => String(a) === String(b)
  const cur = options.find(o => same(o.value, value)) || options[0]
  const isDefault = !!options.length && same(options[0].value, value)
  const active = !!label && !isDefault   // filtër i aktivizuar — theksohet
  const shown = !label ? cur?.label : (isDefault ? label : `${label}: ${cur?.label}`)

  return (
    <div ref={ref} className={`${hideOnMobile ? 'max-sm:hidden ' : ''}relative flex-shrink-0 ${wide ? 'flex-1 min-w-0' : ''}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(o => !o)}
        className={`${compact ? 'h-8' : 'h-9'} ${wide ? 'w-full justify-between ' : ''}px-2.5 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700 hover:text-gray-900 dark:border-transparent dark:bg-dk-low dark:hover:bg-dk-card dark:text-gray-300 dark:hover:text-white ${active ? '!border-accent/50 !bg-accent/10 !text-accent dark:!border-accent/40 dark:!bg-accent/15 dark:!text-accent-soft' : ''} text-xs font-semibold dark:font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed outline-none focus-visible:ring-2 focus-visible:ring-gray-400/40 dark:focus-visible:ring-accent/40`}
      >
        {Icon && <Icon size={15} className={`${hideIconOnSmall ? 'hidden sm:block ' : ''}text-gray-400 dark:text-[#8b8e99] flex-shrink-0`} />}
        <span className="whitespace-nowrap truncate">{shown}</span>
        <ChevronDown size={15} className={`text-gray-400 dark:text-[#8b8e99] flex-shrink-0 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className={`absolute ${alignRight ? 'right-0' : 'left-0'} top-full mt-1.5 min-w-[9rem] max-h-72 overflow-y-auto rounded-xl bg-white border border-gray-200 shadow-xl dark:bg-dk-high dark:border-white/10 py-1.5 z-50`}>
          <div className="px-1.5 space-y-0.5">
            {options.map(o => (
              <button
                key={o.value}
                type="button"
                onClick={() => { onChange(String(o.value)); setOpen(false) }}
                className={`w-full px-2.5 py-1.5 text-left rounded-lg text-xs font-semibold flex items-center justify-between gap-3 transition-colors ${
                  same(o.value, value)
                    ? 'bg-accent/10 text-accent dark:bg-accent/15 dark:text-accent-soft'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-dk-card'
                }`}
              >
                <span className="whitespace-nowrap">{o.label}</span>
                {same(o.value, value) && <Check size={14} />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* Zëvendësim për <select> të filtrave: menu e re në light dhe dark mode.
   Përdoret njësoj si <select> (value, onChange(e) me e.target.value, <option> si fëmijë). */
export function DualSelect({ children, className = '', value, onChange, disabled, label }) {
  const options = []
  Children.forEach(children, ch => {
    if (!ch || ch.type !== 'option') return
    const c = ch.props.children
    const label = Array.isArray(c) ? c.join('') : String(c ?? '')
    options.push({ value: ch.props.value ?? label, label })
  })
  const wide = /\b(flex-1|w-full)\b/.test(className)
  const hideOnMobile = /\bhidden\b/.test(className) && /\bsm:block\b/.test(className)
  return (
    <DarkSelect
      value={value}
      onChange={v => onChange && onChange({ target: { value: v } })}
      options={options}
      compact
      wide={wide}
      hideOnMobile={hideOnMobile}
      disabled={disabled}
      label={label}
    />
  )
}
