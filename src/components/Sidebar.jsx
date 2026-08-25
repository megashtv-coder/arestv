import { useEffect, useState } from 'react'
import {
  LayoutDashboard, FileText, Users as UsersIcon, Receipt, BarChart2,
  Package, CreditCard, Settings, ChevronRight, X, Bell,
  Truck, TrendingUp, ChevronLeft, UserCog, LogOut, MessageSquare, CheckSquare,
  Zap,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useFeatures } from '../features/useFeatures'
import { supabase } from '../lib/supabase'

export default function Sidebar() {
  const {
    page, navigate, sidebarOpen, setSidebarOpen,
    invoices, sidebarCollapsed, setSidebarCollapsed, currentUser, logout,
  } = useApp()

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
    { id: 'payments',      icon: CreditCard,      label: 'Pagesat' },
    { id: 'expenses',      icon: Receipt,         label: 'Shpenzimet' },
    // Suppliers only visible if feature enabled
    ...(canAccessSuppliers ? [{ id: 'suppliers', icon: Truck, label: 'Furnitorët' }] : []),
    { id: 'reports',       icon: BarChart2,       label: 'Raportet' },
    { id: 'communicationHistory', icon: MessageSquare, label: 'Komunikimet' },
    { id: 'ai-chat',       icon: Zap,             label: '🤖 AI Asistenti' },
  ]

  const SYSTEM_NAV = [
    { id: 'users',    icon: UserCog,  label: 'Përdoruesit' },
    { id: 'settings', icon: Settings, label: 'Cilësimet' },
  ]

  const initials = currentUser
    ? currentUser.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : 'AK'

  const w = sidebarCollapsed ? 'w-[64px]' : 'w-60'

  /* ── Artikulli i menusë me "kthesën" e harkuar rreth vetes kur është aktiv —
     kthesa përdor ngjyrën reale të përmbajtjes (bg-gray-50/gray-900, njësoj si
     App.jsx) që artikulli aktiv të duket sikur "derdhet" jashtë sidebar-it. ── */
  const renderNavItem = ({ id, icon: Icon, label, badge, badgeColor }) => {
    const isActive = page === id
    return (
      <div key={id} className="relative">
        {isActive && !sidebarCollapsed && (
          <div className="absolute -top-[18px] right-0 w-[18px] h-[18px] bg-gray-50 dark:bg-gray-900 pointer-events-none overflow-hidden z-10">
            <div className="w-full h-full bg-blue-50 dark:bg-gray-800 rounded-br-[18px]" />
          </div>
        )}
        <div
          title={sidebarCollapsed ? label : undefined}
          className={`flex items-center gap-3 py-2.5 cursor-pointer relative select-none transition-colors duration-150 ${
            sidebarCollapsed
              ? `justify-center px-2 mx-2 rounded-xl ${isActive ? 'bg-blue-500 text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-blue-100/70 dark:hover:bg-gray-700'}`
              : `pl-4 pr-4 rounded-l-full ${isActive
                  ? 'bg-gray-50 dark:bg-gray-900 text-blue-600 dark:text-blue-400 font-bold z-20'
                  : 'text-gray-500 dark:text-gray-400 font-medium hover:bg-blue-100/70 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200'}`
          }`}
          onClick={() => navigate(id)}
        >
          <Icon size={17} className="flex-shrink-0" />
          {!sidebarCollapsed && <span className="flex-1 truncate text-sm">{label}</span>}
          {!sidebarCollapsed && badge ? (
            <span className={`${isActive ? (badgeColor ? badgeColor : 'bg-blue-600') : (badgeColor || 'bg-blue-500')} text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center`}>
              {badge}
            </span>
          ) : null}
          {sidebarCollapsed && badge ? (
            <span className={`absolute top-1 right-1 w-2 h-2 rounded-full ${badgeColor || 'bg-blue-500'}`} />
          ) : null}
        </div>
        {isActive && !sidebarCollapsed && (
          <div className="absolute -bottom-[18px] right-0 w-[18px] h-[18px] bg-gray-50 dark:bg-gray-900 pointer-events-none overflow-hidden z-10">
            <div className="w-full h-full bg-blue-50 dark:bg-gray-800 rounded-tr-[18px]" />
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
        fixed top-0 left-0 h-full bg-blue-50 dark:bg-gray-800 border-r border-blue-100 dark:border-gray-700 flex flex-col z-50
        transition-all duration-300
        rounded-tr-[28px] rounded-br-[28px] overflow-hidden
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:z-auto
        ${w}
      `}>
        {/* Logo + Collapse Button */}
        <div className={`flex items-center border-b border-blue-100 dark:border-gray-800 h-12 sm:h-14 flex-shrink-0 dark:border-gray-700 ${sidebarCollapsed ? 'justify-center px-2' : 'gap-2 sm:gap-3 px-3 sm:px-4'}`}>
          <img
            src="/aflow-logo.svg"
            alt="A Flow"
            className="w-7 h-7 sm:w-8 sm:h-8 object-contain flex-shrink-0"
          />
          {!sidebarCollapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-xs sm:text-sm font-black text-gray-900 dark:text-gray-100 leading-none tracking-tight">A Flow</div>
            </div>
          )}
          {!sidebarCollapsed && (
            <button className="ml-auto icon-btn lg:hidden p-1" onClick={() => setSidebarOpen(false)}>
              <X size={16} />
            </button>
          )}
          {/* Collapse toggle — visible only on desktop */}
          <button
            className="hidden lg:flex items-center justify-center p-1 text-gray-400 hover:text-blue-500 transition-colors flex-shrink-0 dark:text-gray-500"
            onClick={() => setSidebarCollapsed(v => !v)}
            title={sidebarCollapsed ? 'Zgjero menunë' : 'Minimizo menunë'}
          >
            {sidebarCollapsed
              ? <ChevronRight size={16} />
              : <ChevronLeft size={16} />
            }
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto overflow-x-hidden">
          {!sidebarCollapsed && (
            <p className="text-[10px] font-bold text-gray-300 tracking-widest uppercase px-3 mb-2">Kryesore</p>
          )}
          {NAV.map(renderNavItem)}

          {!sidebarCollapsed && (
            <p className="text-[10px] font-bold text-gray-300 tracking-widest uppercase px-3 mt-4 mb-2">Sistemi</p>
          )}
          {sidebarCollapsed && <div className="my-2 border-t border-blue-100 dark:border-gray-700" />}

          {SYSTEM_NAV.map(renderNavItem)}
        </nav>

        {/* User card */}
        {!sidebarCollapsed && (
          <div className="px-2 py-2 border-t border-blue-100 dark:border-gray-700">
            <div
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-blue-100/70 dark:hover:bg-gray-700 cursor-pointer transition-colors"
              onClick={() => navigate('settings')}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                style={{ background: currentUser?.color || '#2563eb' }}
              >
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">{currentUser?.name || 'User'}</p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 capitalize">
                  {currentUser?.isSuperAdmin ? 'Super Admin' : currentUser?.role}
                </p>
              </div>
              <ChevronRight size={14} className="text-gray-300 dark:text-gray-600 flex-shrink-0" />
            </div>
          </div>
        )}

        {/* Logout button */}
        <div className={`px-2 py-3 border-t border-blue-100 dark:border-gray-800 mt-auto dark:border-gray-700`}>
          <button
            type="button"
            className={`sidebar-item w-full text-blue-500 hover:bg-blue-200/70 dark:hover:bg-blue-900/20 hover:text-blue-600 cursor-pointer transition-all ${sidebarCollapsed ? 'justify-center px-2' : ''}`}
            onClick={() => {
              console.log('Logging out...')
              logout()
            }}
            title="Dilni nga sistemi"
          >
            <LogOut size={18} className="flex-shrink-0" />
            {!sidebarCollapsed && <span className="font-medium">Dilni</span>}
          </button>
        </div>
      </aside>
    </>
  )
}
