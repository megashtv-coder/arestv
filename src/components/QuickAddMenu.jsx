import { useState, useRef, useEffect } from 'react'
import { Plus, FileText, DollarSign, ListTodo, UserPlus, Package, CreditCard, Truck, UserCog } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { SupplierModal } from './SupplierModal'
import { UserModal } from './UserModal'

/* ══════════════════════════════════════════════════════════
   Butoni "+" i header-it me menunë "Shto të re" — çdo veprim ka ikonën
   e vet në një katror me ngjyrë; mbyllet me klikim jashtë ose Esc.
   Veprimet janë të njëjtat si më parë, vetëm pamja u përditësua.
══════════════════════════════════════════════════════════ */
const ITEMS = [
  { id: 'invoice',  label: 'Faturë e Re',    icon: FileText,   chip: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300' },
  { id: 'expense',  label: 'Shpenzim i Ri',  icon: DollarSign, chip: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300' },
  { id: 'task',     label: 'Detyrë e Re',    icon: ListTodo,   chip: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300' },
  { id: 'customer', label: 'Klient i Ri',    icon: UserPlus,   chip: 'bg-sky-50 text-sky-600 dark:bg-sky-900/30 dark:text-sky-300' },
  { id: 'item',     label: 'Produkt i Ri',   icon: Package,    chip: 'bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300' },
  { id: 'payment',  label: 'Pagesë e Re',    icon: CreditCard, chip: 'bg-teal-50 text-teal-600 dark:bg-teal-900/30 dark:text-teal-300' },
  { id: 'supplier', label: 'Furnitor i Ri',  icon: Truck,      chip: 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-300' },
  { id: 'user',     label: 'Përdorues i Ri', icon: UserCog,    chip: 'bg-slate-100 text-slate-600 dark:bg-slate-700/60 dark:text-slate-300', adminOnly: true },
]

export default function QuickAddMenu() {
  const { navigate, setTasksAddOpen, setModal, closeModal, currentUser } = useApp()
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDown = e => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false) }
    const onKey  = e => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const run = id => {
    setOpen(false)
    switch (id) {
      case 'invoice':  navigate('invoices:create');  break
      case 'expense':  navigate('expenses:create');  break
      case 'task':     navigate('tasks'); setTasksAddOpen(true); break
      case 'customer': navigate('customers:create'); break
      case 'item':     navigate('items:create');     break
      case 'payment':  navigate('payments:create');  break
      case 'supplier': setModal(<SupplierModal onClose={closeModal} />); break
      case 'user':     setModal(<UserModal onClose={closeModal} />);     break
      default: break
    }
  }

  const items = ITEMS.filter(i => !i.adminOnly || currentUser?.role === 'admin')

  return (
    <div className="relative flex-shrink-0" ref={wrapRef}>
      <button
        type="button"
        className="flex items-center justify-center gap-1 w-9 h-9 dark:w-auto dark:h-9 dark:px-3 rounded-xl dark:rounded-lg bg-blue-500 dark:bg-accent text-white dark:text-accent-on dark:font-semibold dark:text-xs shadow-sm dark:shadow-lg dark:shadow-accent/40 hover:bg-blue-600 dark:hover:bg-accent/90 active:scale-95 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 dark:focus-visible:ring-accent/40"
        onClick={() => setOpen(v => !v)}
        title="Shto element të ri"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Plus size={18} className={`transition-transform duration-200 motion-reduce:transition-none ${open ? 'rotate-45' : ''}`} />
        <span className="hidden dark:inline">Krijo</span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 w-60 rounded-2xl border border-gray-200/90 dark:border-white/10 bg-white dark:bg-dk-card shadow-xl shadow-gray-900/10 dark:shadow-black/30 p-1.5 z-50"
        >
          <p className="px-2.5 pt-1.5 pb-1 text-[10px] font-extrabold uppercase tracking-widest text-gray-400 dark:text-gray-500">
            Shto të re
          </p>
          {items.map(({ id, label, icon: Icon, chip }) => (
            <button
              key={id}
              type="button"
              role="menuitem"
              onClick={() => run(id)}
              className="w-full flex items-center gap-3 px-2 py-1.5 rounded-xl text-left text-[13px] font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/60 focus:outline-none focus-visible:bg-gray-50 dark:focus-visible:bg-gray-700/60 transition-colors"
            >
              <span className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${chip}`}>
                <Icon size={16} />
              </span>
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
