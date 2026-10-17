import { useState, useEffect, useRef } from 'react'
import { Settings, LogOut } from 'lucide-react'
import { useApp } from '../context/AppContext'

/* Avatari i profilit (këndi i djathtë i header-it) me menu: emri/roli, Cilësimet, Dil nga llogaria. */
export default function ProfileMenu() {
  const { currentUser, navigate, logout } = useApp()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const name = currentUser?.name || ''
  const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?'
  const color = currentUser?.color || '#2563eb'
  const roleLabel = currentUser?.isSuperAdmin ? 'Super Admin' : (currentUser?.role || '')
  const sub = currentUser?.email || (currentUser?.username ? '@' + currentUser.username : '')

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        title={name}
        onClick={() => setOpen(o => !o)}
        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold hover:ring-2 hover:ring-blue-500/40 dark:hover:ring-accent/50 transition-all focus:outline-none"
        style={{ background: color }}
      >
        {initials}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-64 origin-top-right rounded-xl bg-white border border-gray-200 shadow-2xl py-2 z-50 dark:bg-dk-low dark:border-white/10"
        >
          {/* Kreu: emri dhe roli */}
          <div className="px-4 py-3 border-b border-gray-100 dark:border-white/[0.07]">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-base flex-shrink-0"
                style={{ background: color }}
              >
                {initials}
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">{name}</span>
                  {roleLabel && (
                    <span className="px-1.5 py-0.5 text-[10px] font-medium rounded capitalize whitespace-nowrap bg-blue-50 text-blue-600 border border-blue-100 dark:bg-accent/10 dark:text-accent-soft dark:border-accent/20">
                      {roleLabel}
                    </span>
                  )}
                </div>
                {sub && <span className="text-xs text-gray-400 dark:text-[#8b8e99] truncate mt-0.5">{sub}</span>}
              </div>
            </div>
          </div>

          <div className="py-1">
            <button
              type="button"
              role="menuitem"
              onClick={() => { setOpen(false); navigate('settings') }}
              className="w-full flex items-center gap-3 px-4 py-2 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-300 dark:hover:text-white dark:hover:bg-dk-card transition-colors"
            >
              <Settings size={16} className="text-gray-400 dark:text-gray-500" />
              Cilësimet
            </button>
          </div>

          <div className="border-t border-gray-100 dark:border-white/[0.07] my-1" />

          <div className="py-1">
            <button
              type="button"
              role="menuitem"
              onClick={() => { setOpen(false); logout() }}
              className="w-full flex items-center gap-3 px-4 py-2 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-[#ffb4ab] dark:hover:text-[#ffdad6] dark:hover:bg-[#93000a]/25 transition-colors"
            >
              <LogOut size={16} />
              Dil nga llogaria
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
