import { Search, Bell, Moon, Sun, Menu, ChevronDown, Zap, Check, Plus, FileText, DollarSign } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { currencies } from '../data/mockData'
import { useState, useEffect, useRef } from 'react'

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
    setSidebarOpen, invoices, customers, navigate, currentUser,
  } = useApp()
  const [curOpen, setCurOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [readNotifications, setReadNotifications] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('arestv_read_notifications') || '{}')
    } catch {
      return {}
    }
  })
  const notifRef = useRef(null)

  // Handle search - only navigate on Enter key, not on every character
  const handleSearchInput = (value) => {
    setSearchInput(value)
  }

  const handleSearchSubmit = () => {
    if (searchInput.trim()) {
      // Find customer with exact name match or close match (case-insensitive)
      const exactMatch = customers.find(c => c.name.toLowerCase() === searchInput.toLowerCase())
      const partialMatch = customers.find(c => c.name.toLowerCase().includes(searchInput.toLowerCase()))
      const customer = exactMatch || partialMatch

      if (customer) {
        // Navigate to invoices with customer filter
        localStorage.setItem('arestv_invoice_search', customer.name)
        navigate('invoices')
      }
    }
  }

  const handleSearchClear = () => {
    setSearchInput('')
    localStorage.removeItem('arestv_invoice_search')
  }

  // Persist read notifications to localStorage
  useEffect(() => {
    localStorage.setItem('arestv_read_notifications', JSON.stringify(readNotifications))
  }, [readNotifications])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false)
      }
    }
    if (notifOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [notifOpen])

  const today       = new Date().toISOString().slice(0, 10)
  const upcomingNotifications = invoices
    .filter(i => i.notifyDate && i.notifyDate <= today)
    .sort((a, b) => new Date(b.notifyDate) - new Date(a.notifyDate))

  const unreadCount = upcomingNotifications.filter(i => !readNotifications[i.id]).length

  const markAllAsRead = () => {
    const newRead = { ...readNotifications }
    upcomingNotifications.forEach(i => {
      newRead[i.id] = true
    })
    setReadNotifications(newRead)
  }

  const initials = currentUser
    ? currentUser.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : 'AK'

  return (
    <header className="h-12 sm:h-14 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 flex items-center px-3 sm:px-5 gap-2 sm:gap-4 sticky top-0 z-30 transition-colors">
      {/* Mobile menu */}
      <button className="icon-btn lg:hidden flex-shrink-0 p-1.5 sm:p-2" onClick={() => setSidebarOpen(true)}>
        <Menu size={18} />
      </button>

      <div className="flex items-center gap-2 flex-1 min-w-0">
        <img src="/logo.svg" alt="X-Flow" className="w-6 h-6 sm:w-8 sm:h-8 flex-shrink-0" />
        <h1 className="text-sm sm:text-base font-bold text-gray-800 dark:text-gray-100 truncate">
          {PAGE_TITLES[page] || 'X-Flow'}
        </h1>
      </div>

      {/* Search - hidden on mobile */}
      <div className="hidden lg:flex items-center gap-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 w-48 focus-within:border-red-400 focus-within:ring-2 focus-within:ring-red-50 transition-all flex-shrink-0">
        <Search size={14} className="text-gray-400 flex-shrink-0" />
        <input
          className="bg-transparent border-none outline-none text-sm text-gray-600 dark:text-gray-300 w-full placeholder-gray-400"
          placeholder="Emri i klientit..."
          value={searchInput}
          onChange={(e) => handleSearchInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSearchSubmit()
            }
          }}
        />
        {searchInput && (
          <button
            onClick={handleSearchClear}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0"
          >
            ✕
          </button>
        )}
      </div>

      {/* Quick Add Button - Context Aware */}
      <div className="relative flex-shrink-0">
        <button
          className="icon-btn bg-red-500 text-white hover:bg-red-600 rounded-lg p-2"
          onClick={() => {
            // Get the base page (remove :create, :edit, etc)
            const basePage = page.split(':')[0]
            // Map pages that have create functionality
            const createPages = {
              invoices: 'invoices:create',
              customers: 'customers:create',
              expenses: 'expenses:create',
              payments: 'payments:create',
              items: 'items:create',
            }
            if (createPages[basePage]) {
              navigate(createPages[basePage])
              setAddOpen(false)
            } else {
              // Show dropdown for pages without current context
              setAddOpen(v => !v)
            }
          }}
          title="Shto element të ri"
        >
          <Plus size={18} />
        </button>
        {addOpen && (
          <div className="absolute right-0 top-full mt-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg shadow-lg z-50 w-48 py-1">
            <button
              onClick={() => {
                navigate('invoices:create')
                setAddOpen(false)
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <FileText size={16} />
              Faturë e Re
            </button>
            <button
              onClick={() => {
                navigate('expenses:create')
                setAddOpen(false)
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <DollarSign size={16} />
              Shpenzim i Ri
            </button>
          </div>
        )}
      </div>

      {/* Currency selector */}
      <div className="relative hidden xs:block flex-shrink-0">
        <button
          className="flex items-center gap-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 sm:px-3 py-1 sm:py-1.5 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          onClick={() => setCurOpen(v => !v)}
        >
          <span>{currency.symbol}</span>
          <span className="hidden sm:inline">{currency.code}</span>
          <ChevronDown size={11} className="text-gray-400" />
        </button>
        {curOpen && (
          <div className="absolute top-full right-0 mt-1.5 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-lg py-1 w-44 z-50">
            {currencies.map(c => (
              <button
                key={c.code}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
                onClick={() => { setCurrency(c); setCurOpen(false) }}
              >
                <span className="font-bold text-red-500 w-5">{c.symbol}</span>
                <span className="text-gray-600 dark:text-gray-300">{c.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Notifications bell with dropdown */}
      <div className="relative" ref={notifRef}>
        <button
          className="icon-btn relative"
          title={unreadCount > 0 ? `${unreadCount} njoftim i palexuar` : 'Njoftimet e abonimit'}
          onClick={() => setNotifOpen(v => !v)}
        >
          <Bell size={18} />
          {unreadCount > 0 ? (
            <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] bg-orange-500 rounded-full border-2 border-white flex items-center justify-center text-[9px] text-white font-bold px-0.5">
              {unreadCount}
            </span>
          ) : (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-gray-300 rounded-full border-2 border-white" />
          )}
        </button>

        {/* Notifications dropdown */}
        {notifOpen && (
          <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-lg z-50 max-h-96 flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <h3 className="font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                <Bell size={16} />
                Njoftimet e Abonimit
              </h3>
              {unreadCount > 0 ? (
                <button
                  onClick={markAllAsRead}
                  className="text-xs font-semibold text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 flex items-center gap-1"
                >
                  <Check size={14} />
                  Lexoje të gjitha
                </button>
              ) : upcomingNotifications.length > 0 ? (
                <span className="text-xs text-gray-400 dark:text-gray-500">Të gjitha lexuar</span>
              ) : null}
            </div>

            {/* Notifications list */}
            <div className="overflow-y-auto flex-1">
              {upcomingNotifications.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Nuk ka njoftime</p>
                </div>
              ) : (
                upcomingNotifications.map(inv => {
                  const isRead = readNotifications[inv.id]
                  const daysLeft = Math.round((new Date(inv.notifyDate) - new Date(today)) / 86400000)

                  return (
                    <button
                      key={inv.id}
                      onClick={() => {
                        setReadNotifications(p => ({ ...p, [inv.id]: true }))
                        navigate('subscriptions')
                      }}
                      className={`w-full px-4 py-3 border-b border-gray-50 dark:border-gray-700 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                        isRead ? 'opacity-60' : 'opacity-100 bg-red-50/30 dark:bg-red-800/10'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">
                            {inv.customer}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            Skadon: {inv.subscriptionExpiry}
                          </p>
                        </div>
                        <div className={`text-xs font-semibold whitespace-nowrap flex-shrink-0 ${
                          daysLeft < 0 ? 'text-red-600' :
                          daysLeft === 0 ? 'text-red-600 font-bold' :
                          'text-amber-600'
                        }`}>
                          {daysLeft < 0 ? `${Math.abs(daysLeft)} ditë më parë` :
                           daysLeft === 0 ? 'Sot!' :
                           `${daysLeft}d`}
                        </div>
                      </div>
                    </button>
                  )
                })
              )}
            </div>

            {/* Footer */}
            {upcomingNotifications.length > 0 && (
              <div className="p-3 border-t border-gray-100 dark:border-gray-700 text-center">
                <button
                  onClick={() => {
                    navigate('subscriptions')
                    setNotifOpen(false)
                  }}
                  className="text-sm text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 font-semibold"
                >
                  Shiko të gjitha
                </button>
              </div>
            )}
          </div>
        )}
      </div>

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
