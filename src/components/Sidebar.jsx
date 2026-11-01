import { useEffect, useState } from 'react'
import {
  LayoutDashboard, FileText, Users as UsersIcon, Receipt, BarChart2,
  Package, CreditCard, Settings, ChevronRight, X, Bell,
  Truck, TrendingUp, ChevronLeft, UserCog, LogOut, CheckSquare,
  Zap, Server,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useConfirmLogout } from './LogoutConfirm'
import { useFeatures } from '../features/useFeatures'
import { supabase } from '../lib/supabase'

export default function Sidebar() {
  const {
    page, navigate, sidebarOpen, setSidebarOpen,
    invoices, sidebarCollapsed, setSidebarCollapsed, currentUser, logout, darkMode,
  } = useApp()
  const askLogout = useConfirmLogout()

  // Light mode (desktop): menu e ngushtë me ikona vetëm ("rail"). Në dark mode dhe në telefon mbetet siç ishte.
  const [isLg, setIsLg] = useState(() => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const h = e => setIsLg(e.matches)
    mq.addEventListener('change', h)
    return () => mq.removeEventListener('change', h)
  }, [])
  const rail = !darkMode && isLg
  const collapsed = sidebarCollapsed || rail

  const { canAccessSuppliers } = useFeatures()
  const [tasks, setTasks] = useState([])

  const today = new Date().toISOString().slice(0, 10)
  const SUB_FROM = '2026-07-01'
  const subNotifyCount = invoices.filter(i =>
    i.notifyDate &&
    i.notifyDate >= SUB_FROM &&
    i.notifyDate === today &&
    i.status !== 'paid'
  ).length

  // Load tasks from Supabase
  useEffect(() => {
    const loadTasks = async () => {
      try {
        const { data, error } = await supabase
          .from('tasks')
          .select('*')

        if (!error && data) {
          // Map lowercase reminderdate to camelCase for consistency
          const formattedTasks = data.map(t => ({
            ...t,
            reminderDate: t.reminderdate,
          }))
          setTasks(formattedTasks)
        }
      } catch (e) {
        console.error('Error loading tasks for badge:', e)
      }
    }

    loadTasks()
  }, [])

  const tasksDueBadge = tasks.filter(t => !t.completed && (t.reminderDate < today || t.reminderDate === today)).length

  const NAV = [
    { id: 'dashboard',     icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'invoices',      icon: FileText,        label: 'Faturat',    badge: invoices.filter(i => i.status === 'pending' || i.status === 'overdue').length || null },
    { id: 'subscriptions', icon: Bell,            label: 'Abonimet',   badge: subNotifyCount || null, badgeColor: 'bg-orange-500' },
    { id: 'tasks',         icon: CheckSquare,     label: 'Detyrat',    badge: tasksDueBadge || null, badgeColor: 'bg-blue-500' },
    { id: 'customers',     icon: UsersIcon,       label: 'Klientët' },
    { id: 'items',         icon: Package,         label: 'Produktet' },
    // Barazimi, Stripe dhe Emrat për Pagesa jetojnë tani si nën-tabe brenda
    // menusë Pagesat (shih src/components/PaymentsSubTabs.jsx), jo si zëra
    // të veçantë këtu.
    { id: 'payments',      icon: CreditCard,      label: 'Pagesat' },
    { id: 'expenses',      icon: Receipt,         label: 'Shpenzimet' },
    { id: 'hosts',         icon: Server,          label: 'Hostet' },
    // Suppliers only visible if feature enabled
    ...(canAccessSuppliers ? [{ id: 'suppliers', icon: Truck, label: 'Furnitorët' }] : []),
    { id: 'reports',       icon: BarChart2,       label: 'Raportet' },
    { id: 'ai-chat',       icon: Zap,             label: '🤖 AI Asistenti' },
  ]

  const SYSTEM_NAV = [
    { id: 'users',    icon: UserCog,  label: 'Përdoruesit' },
    { id: 'settings', icon: Settings, label: 'Cilësimet' },
  ]

  const w = rail ? 'w-20' : collapsed ? 'w-[64px]' : 'w-60'

  /* ── Artikulli i menusë me "kthesën" e harkuar rreth vetes kur është aktiv —
     kthesa përdor ngjyrën reale të përmbajtjes (bg-gray-50/gray-900, njësoj si
     App.jsx) që artikulli aktiv të duket sikur "derdhet" jashtë sidebar-it. ── */
  const renderNavItem = ({ id, icon: Icon, label, badge, badgeColor }) => {
    const isActive = page === id
    return (
      // -mr-2 anulon padding-un e djathtë të <nav> (px-2), që artikulli/kthesa
      // të arrijë saktësisht te buza e sidebar-it — përndryshe mbetej një
      // shirit i hollë me ngjyrën e sidebar-it të pazëvendësuar në cep.
      <div key={id} className={`relative ${!collapsed ? '-mr-2 dark:mr-0' : ''}`}>
        {isActive && !collapsed && (
          <div className="absolute -top-[18px] right-0 w-[18px] h-[18px] bg-gray-50 dark:hidden pointer-events-none overflow-hidden z-10">
            <div className="w-full h-full bg-blue-50 rounded-br-[18px]" />
          </div>
        )}
        <div
          title={collapsed ? label : undefined}
          className={`flex items-center gap-3 py-2.5 cursor-pointer relative select-none transition-colors duration-150 ${
            collapsed
              ? rail
              ? `justify-center mx-auto w-11 h-11 !p-0 rounded-xl ${isActive ? 'bg-blue-500 text-white shadow-sm shadow-blue-200' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'}`
              : `justify-center px-2 mx-2 rounded-xl ${isActive ? 'bg-blue-500 dark:bg-dk-card dark:text-accent text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-blue-100/70 dark:hover:bg-dk-card'}`
              : `pl-4 pr-4 rounded-l-full dark:rounded-lg dark:pl-3 dark:pr-3 ${isActive
                  ? 'bg-gray-50 dark:bg-dk-card text-blue-600 dark:text-gray-100 font-bold z-20 dark:shadow-[inset_2px_0_0_0_theme(colors.accent.DEFAULT)]'
                  : 'text-gray-500 dark:text-gray-400 font-medium hover:bg-blue-100/70 dark:hover:bg-dk-card hover:text-gray-700 dark:hover:text-gray-200'}`
          }`}
          onClick={() => navigate(id)}
        >
          <Icon size={rail ? 20 : 17} className="flex-shrink-0" />
          {!collapsed && <span className="flex-1 truncate text-sm">{label}</span>}
          {!collapsed && badge ? (
            <span className={`${isActive ? (badgeColor ? badgeColor : 'bg-blue-600') : (badgeColor || 'bg-blue-500')} ${badgeColor === 'bg-blue-500' ? 'dark:bg-accent dark:text-accent-on' : badgeColor ? '' : 'dark:bg-dk-high dark:text-gray-100'} text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center`}>
              {badge}
            </span>
          ) : null}
          {collapsed && badge ? (
            <span className={`absolute top-1 right-1 w-2 h-2 rounded-full ${badgeColor || 'bg-blue-500'}`} />
          ) : null}
        </div>
        {isActive && !collapsed && (
          <div className="absolute -bottom-[18px] right-0 w-[18px] h-[18px] bg-gray-50 dark:hidden pointer-events-none overflow-hidden z-10">
            <div className="w-full h-full bg-blue-50 rounded-tr-[18px]" />
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`
        safe-top-pad fixed top-0 left-0 h-full ${rail ? 'bg-white border-slate-200/80' : 'bg-blue-50 border-blue-100 rounded-br-[28px]'} dark:bg-dk-side border-r dark:border-white/5 flex flex-col z-50
        transition-all duration-300
        dark:rounded-br-none overflow-hidden
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:z-auto
        ${w}
      `}>
        {/* Logo + Collapse Button */}
        <div className={`flex items-center border-b ${rail ? 'border-transparent h-[76px]' : 'border-blue-100 h-12 sm:h-14'} flex-shrink-0 dark:border-transparent ${collapsed ? 'justify-center px-2' : 'gap-2 sm:gap-3 px-3 sm:px-4'}`}>
          <img
            src="/aflow-logo.svg"
            alt="A Flow"
            className={`${rail ? 'w-11 h-11 p-2 rounded-2xl bg-blue-50' : 'w-7 h-7 sm:w-8 sm:h-8'} flex-shrink-0 object-contain`}
          />
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-xs sm:text-sm font-black text-gray-900 dark:text-gray-100 leading-none tracking-tight">A Flow</div>
            </div>
          )}
          {!collapsed && (
            <button className="ml-auto icon-btn lg:hidden p-1" onClick={() => setSidebarOpen(false)}>
              <X size={16} />
            </button>
          )}
          {/* Collapse toggle — visible only on desktop */}
          <button
            className={`${rail ? 'hidden' : 'hidden lg:flex'} items-center justify-center p-1 text-gray-400 hover:text-blue-500 transition-colors flex-shrink-0 dark:text-gray-500`}
            onClick={() => setSidebarCollapsed(v => !v)}
            title={collapsed ? 'Zgjero menunë' : 'Minimizo menunë'}
          >
            {collapsed
              ? <ChevronRight size={16} />
              : <ChevronLeft size={16} />
            }
          </button>
        </div>

        {/* Navigation */}
        <nav className={`${rail ? 'px-3 space-y-2' : 'px-2 space-y-0.5'} flex-1 py-4 overflow-y-auto overflow-x-hidden`}>
          {!collapsed && (
            <p className="text-[10px] font-bold text-gray-300 tracking-widest uppercase px-3 mb-2">Kryesore</p>
          )}
          {NAV.map(renderNavItem)}

          {!collapsed && (
            <p className="text-[10px] font-bold text-gray-300 tracking-widest uppercase px-3 mt-4 mb-2">Sistemi</p>
          )}
          {collapsed && <div className={`my-2 border-t ${rail ? 'border-slate-100 mx-2' : 'border-blue-100'} dark:border-white/5`} />}

          {SYSTEM_NAV.map(renderNavItem)}
        </nav>

        {/* Logout button */}
        <div className={`${rail ? 'px-3 border-slate-100' : 'px-2 border-blue-100'} py-3 border-t mt-auto dark:border-white/5`}>
          <button
            type="button"
            className={`sidebar-item w-full text-blue-500 hover:bg-blue-200/70 dark:hover:bg-blue-900/20 hover:text-blue-600 cursor-pointer transition-all ${collapsed ? 'justify-center px-2' : ''} ${rail ? '!w-11 !h-11 !p-0 mx-auto rounded-xl' : ''}`}
            onClick={askLogout}
            title="Dilni nga sistemi"
          >
            <LogOut size={rail ? 20 : 18} className="flex-shrink-0" />
            {!collapsed && <span className="font-medium">Dilni</span>}
          </button>
        </div>
      </aside>
    </>
  )
}
