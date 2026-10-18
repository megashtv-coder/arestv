import { useState, useEffect, useRef, Children } from 'react'
import { ChevronDown, Check } from 'lucide-react'

/* Zgjedhës me menu të personalizuar — shfaqet VETËM në dark mode (në light mbetet <select> i zakonshëm
   që e vendos faqja pranë tij). options: [{ value, label }]; value krahasohet si tekst. */
export default function DarkSelect({
  value, onChange, options, icon: Icon,
  hideIconOnSmall = true, alignRight = false,
  compact = false, wide = false, hideOnMobile = false,
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

  return (
    <div ref={ref} className={`hidden dark:block ${hideOnMobile ? 'dark:max-sm:hidden ' : ''}relative flex-shrink-0 ${wide ? 'flex-1 min-w-0' : ''}`}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`${compact ? 'h-8' : 'h-9'} ${wide ? 'w-full justify-between ' : ''}px-2.5 rounded-lg bg-dk-low hover:bg-dk-card text-gray-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-colors`}
      >
        {Icon && <Icon size={15} className={`${hideIconOnSmall ? 'hidden sm:block ' : ''}text-[#8b8e99] flex-shrink-0`} />}
        <span className="whitespace-nowrap truncate">{cur?.label}</span>
        <ChevronDown size={15} className="text-[#8b8e99] flex-shrink-0" />
      </button>
      {open && (
        <div className={`absolute ${alignRight ? 'right-0' : 'left-0'} top-full mt-1.5 min-w-[9rem] max-h-72 overflow-y-auto rounded-xl bg-dk-high border border-white/10 shadow-xl py-1.5 z-50`}>
          <div className="px-1.5 space-y-0.5">
            {options.map(o => (
              <button
                key={o.value}
                type="button"
                onClick={() => { onChange(String(o.value)); setOpen(false) }}
                className={`w-full px-2.5 py-1.5 text-left rounded-lg text-xs font-semibold flex items-center justify-between gap-3 transition-colors ${
                  same(o.value, value) ? 'bg-accent/15 text-accent-soft' : 'text-gray-300 hover:text-white hover:bg-dk-card'
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

/* Zëvendësim për <select> të filtrave: light mode = <select> i zakonshëm, dark mode = menu e re.
   Përdoret njësoj si <select> (value, onChange(e) me e.target.value, <option> si fëmijë). */
export function DualSelect({ children, className = '', value, onChange, ...rest }) {
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
    <>
      <select {...rest} value={value} onChange={onChange} className={`${className} dark:hidden`}>{children}</select>
      <DarkSelect
        value={value}
        onChange={v => onChange && onChange({ target: { value: v } })}
        options={options}
        compact
        wide={wide}
        hideOnMobile={hideOnMobile}
      />
    </>
  )
}
