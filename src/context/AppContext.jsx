import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import {
  mockInvoices, mockCustomers, mockExpenses, mockItems, mockVendors,
  mockPayments, mockTransfers, paymentModes as defaultPaymentModes,
  depositAccounts as defaultDepositAccounts,
  currencies, mockUsers, mockActivityLog,
} from '../data/mockData'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [invoices,        setInvoices]        = useState(mockInvoices)
  const [customers,       setCustomers]       = useState(mockCustomers)
  const [expenses,        setExpenses]        = useState(mockExpenses)
  const [items,           setItems]           = useState(mockItems)
  const [vendors,         setVendors]         = useState(mockVendors)
  const [payments,        setPayments]        = useState(mockPayments)
  const [transfers,       setTransfers]       = useState(mockTransfers)
  const [paymentModes,    setPaymentModes]    = useState(defaultPaymentModes)
  const [depositAccounts, setDepositAccounts] = useState(defaultDepositAccounts)
  const [currency,        setCurrency]        = useState(currencies[0])
  const [darkMode,        setDarkMode]        = useState(() => localStorage.getItem('xflow_dark') === 'true')
  const [toast,           setToast]           = useState(null)
  const [modal,           setModal]           = useState(null)
  const [page,            setPage]            = useState('dashboard')
  const [loading,         setLoading]         = useState(false)
  const [sidebarOpen,     setSidebarOpen]     = useState(false)
  const [sidebarCollapsed,setSidebarCollapsed]= useState(() => localStorage.getItem('xflow_sidebar') === 'true')

  /* ── Users & Auth ── */
  const [users,        setUsers]        = useState(mockUsers)
  const [currentUser,  setCurrentUser]  = useState(null)
  const [activityLog,  setActivityLog]  = useState(mockActivityLog)

  /* ── Dark mode: sync to <html> class ── */
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem('xflow_dark', darkMode)
  }, [darkMode])

  /* ── Sidebar collapse: persist ── */
  useEffect(() => {
    localStorage.setItem('xflow_sidebar', sidebarCollapsed)
  }, [sidebarCollapsed])

  /* ── Log activity ── */
  const logActivity = useCallback((action, module = 'Sistemi') => {
    if (!currentUser) return
    const entry = {
      id:       `LOG-${Date.now()}`,
      userId:   currentUser.id,
      userName: currentUser.name,
      action,
      module,
      timestamp: new Date().toISOString(),
    }
    setActivityLog(prev => [entry, ...prev])
  }, [currentUser])

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }, [])

  const navigate = useCallback((p) => {
    setPage(p)
    setSidebarOpen(false)
    setLoading(true)
    setTimeout(() => setLoading(false), 350)
  }, [])

  const fmt = useCallback(
    (amount) => currency.symbol + new Intl.NumberFormat('de-DE').format(amount),
    [currency]
  )

  const closeModal = useCallback(() => setModal(null), [])

  return (
    <AppContext.Provider value={{
      invoices,        setInvoices,
      customers,       setCustomers,
      expenses,        setExpenses,
      items,           setItems,
      vendors,         setVendors,
      payments,        setPayments,
      transfers,       setTransfers,
      paymentModes,    setPaymentModes,
      depositAccounts, setDepositAccounts,
      currency,        setCurrency,
      darkMode,        setDarkMode,
      toast,           setToast,
      modal,           setModal,           closeModal,
      page,            navigate,
      loading,
      sidebarOpen,     setSidebarOpen,
      sidebarCollapsed,setSidebarCollapsed,
      users,           setUsers,
      currentUser,     setCurrentUser,
      activityLog,     setActivityLog,
      logActivity,
      showToast,
      fmt,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)
