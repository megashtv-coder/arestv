import { Search, Bell, Moon, Sun, Menu, ChevronDown, Zap } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { currencies } from '../data/mockData'
import { useState } from 'react'

const PAGE_TITLES = {
  dashboard:     'Dashboard',
  invoices:      'Faturat',
  subscriptions: 'Njoftimet e Abonimit',
  customers:     'Klientët',
  items:         'Produktet',
  payments:      'Pagesat',
  expenses:      'Shpenzimet',
  suppliers:     'Furnitorët',
  reports:       'Raportet',
  users:         'Përdoruesit',
  settings:      'Cilësimet',
}

export default function Header() {
  const {
    page, currency, setCurrency, darkMode, setDarkMode,
    setSidebarOpen, invoices, navigate, currentUser,
  } = useApp()
  const [curOpen, setCurOpen] = useState(false)

  const today       = new Date().toISOString().slice(0, 10)
  const notifyCount = invoices.filter(i => i.notifyDate && i.notifyDate <= today).length

  const initials = currentUser
    ? currentUser.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : 'AK'

  return (
    <header className="h-14 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 flex items-center px-5 gap-4 sticky top-0 z-30 transition-colors">
      {/* Mobile menu */}
      <button className="icon-btn lg:hidden flex-shrink-0" onClick={() => setSidebarOpen(true)}>
        <Menu size={20} />
      </button>

      <h1 className="text-base font-bold text-gray-800 dark:text-gray-100 flex-1">
        {PAGE_TITLES[page] || 'X-Flow'}
      </h1>

      {/* Search */}
      <div className="hidden md:flex items-center gap-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 w-52 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-50 transition-all">
        <Search size={14} className="text-gray-400 flex-shrink-0" />
        <input className="bg-transparent border-none outline-none text-sm text-gray-600 dark:text-gray-300 w-full placeholder-gray-400" placeholder="Kërko..." />
      </div>

      {/* Currency selector */}
      <div className="relative hidden sm:block">
        <button
          className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          onClick={() => setCurOpen(v => !v)}
        >
          <span>{currency.symbol}</span>
          <span>{currency.code}</span>
          <ChevronDown size={12} className="text-gray-400" />
        </button>
        {curOpen && (
          <div className="absolute top-full right-0 mt-1.5 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-lg py-1 w-44 z-50">
            {currencies.map(c => (
              <button
                key={c.code}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
                onClick={() => { setCurrency(c); setCurOpen(false) }}
              >
                <span className="font-bold text-blue-600 w-5">{c.symbol}</span>
                <span className="text-gray-600 dark:text-gray-300">{c.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Notifications bell */}
      <button
        className="icon-btn relative"
        title={notifyCount > 0 ? `${notifyCount} njoftim abonimesh` : 'Njoftimet e abonimit'}
        onClick={() => navigate('subscriptions')}
      >
        <Bell size={18} />
        {notifyCount > 0 ? (
          <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] bg-orange-500 rounded-full border-2 border-white flex items-center justify-center text-[9px] text-white font-bold px-0.5">
            {notifyCount}
          </span>
        ) : (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-gray-300 rounded-full border-2 border-white" />
        )}
      </button>

      {/* Dark mode toggle */}
      <button
        className="icon-btn"
        onClick={() => setDarkMode(v => !v)}
        title={darkMode ? 'Modaliteti i bardhë' : 'Modaliteti i errët'}
      >
        {darkMode ? <Sun size={18} className="text-amber-500" /> : <Moon size={18} />}
      </button>

      {/* Current user avatar */}
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold cursor-pointer hover:opacity-90 transition-opacity flex-shrink-0"
        style={{ background: currentUser?.color || '#2563eb' }}
        title={currentUser?.name || ''}
        onClick={() => navigate('users')}
      >
        {initials}
      </div>
    </header>
  )
}
