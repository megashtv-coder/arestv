import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { MoreVertical } from 'lucide-react'

/* Menuja e veprimeve të rreshtit (⋮). Rendohet me portal jashtë tabelës/kartës
   që të mos priten nga overflow.
   items: [{ label, icon: Icon, onClick, danger }] */
export default function RowMenu({ items, title = 'Veprimet', width = 'w-40' }) {
  const [pos, setPos] = useState(null)
  const btnRef  = useRef(null)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!pos) return
    const onDown = (e) => {
      if (menuRef.current?.contains(e.target) || btnRef.current?.contains(e.target)) return
      setPos(null)
    }
    const close = () => setPos(null)
    document.addEventListener('mousedown', onDown)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [pos])

  const toggle = (e) => {
    e.stopPropagation()
    if (pos) { setPos(null); return }
    const r = e.currentTarget.getBoundingClientRect()
    const openUp = window.innerHeight - r.bottom < 40 + items.length * 40
    setPos({
      left: Math.max(8, r.right - 160),
      top: openUp ? null : r.bottom + 6,
      bottom: openUp ? window.innerHeight - r.top + 6 : null,
    })
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className="icon-btn text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:text-gray-500 dark:hover:text-gray-300"
        title={title}
        onClick={toggle}
      >
        <MoreVertical size={16} />
      </button>
      {pos && createPortal(
        <div
          ref={menuRef}
          className={`fixed ${width} bg-white border border-gray-200 rounded-xl shadow-xl z-[9999] overflow-hidden dark:bg-dk-high dark:border-white/10`}
          style={{ left: pos.left, ...(pos.top != null ? { top: pos.top } : { bottom: pos.bottom }) }}
        >
          {items.map(({ label, icon: Icon, onClick, danger, className }, i) => (
            <button
              key={label}
              type="button"
              className={`w-full text-left px-3.5 py-2 text-[13px] font-medium flex items-center gap-2 ${className || ''} ${i < items.length - 1 ? 'border-b border-gray-100 dark:border-transparent' : ''} ${
                danger
                  ? 'text-red-600 hover:bg-red-50 dark:text-[#ffb4ab] dark:hover:bg-[#93000a]/30'
                  : 'text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-dk-card'
              }`}
              onClick={e => { e.stopPropagation(); setPos(null); onClick() }}
            >
              {Icon && <Icon size={14} />} {label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  )
}
