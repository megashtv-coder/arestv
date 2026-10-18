import { useState, useEffect, useRef } from 'react'
import { ChevronDown, Check } from 'lucide-react'

/* Zgjedhës me menu të personalizuar — shfaqet VETËM në dark mode (në light mbetet <select> i zakonshëm
   që e vendos faqja pranë tij). options: [{ value, label }]; value krahasohet si tekst. */
export default function DarkSelect({ value, onChange, options, icon: Icon, hideIconOnSmall = true, alignRight = false }) {
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
    <div ref={ref} className="hidden dark:block relative flex-shrink-0">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="h-9 px-2.5 rounded-lg bg-dk-low hover:bg-dk-card text-gray-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-colors"
      >
        {Icon && <Icon size={15} className={`${hideIconOnSmall ? 'hidden sm:block ' : ''}text-[#8b8e99] flex-shrink-0`} />}
        <span className="whitespace-nowrap">{cur?.label}</span>
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
