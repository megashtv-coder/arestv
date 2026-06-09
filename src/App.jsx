import { AppProvider, useApp } from './context/AppContext'
import { TenantProvider, useTenant } from './context/TenantContext'
import RoleBasedRouter from './components/RoleBasedRouter'
import Login from './pages/Login'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import Dashboard from './pages/Dashboard'
import Invoices from './pages/Invoices'
import Customers from './pages/Customers'
import ExpensesPage from './pages/Expenses'
import Items from './pages/Items'
import Payments from './pages/Payments'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import Subscriptions from './pages/Subscriptions'
import Suppliers from './pages/Suppliers'
import UsersPage from './pages/Users'
import CommunicationHistory from './pages/CommunicationHistory'
import { Toast, LoadingSkeleton } from './components/UI'
import { useEffect } from 'react'
import AutoNotificationService from './services/AutoNotificationService'
import BackupService from './services/BackupService'

const ORG_PAGES = {
  dashboard:              Dashboard,
  invoices:              Invoices,
  customers:             Customers,
  expenses:              ExpensesPage,
  items:                 Items,
  payments:              Payments,
  reports:               Reports,
  settings:              Settings,
  subscriptions:         Subscriptions,
  suppliers:             Suppliers,
  users:                 UsersPage,
  communicationHistory:  CommunicationHistory,
}

function OrgAppLayout() {
  const { page, loading, toast, setToast, modal, darkMode, invoices, customers, items, payments, expenses, users, showToast } = useApp()
  const PageComponent = ORG_PAGES[page] || Dashboard

  // Check for pending auto-notifications when app loads
  useEffect(() => {
    // Get configured advance days from localStorage
    const savedAdvanceDays = localStorage.getItem('xflow_notif_advance_days')
    const advanceDays = savedAdvanceDays ? parseInt(savedAdvanceDays) : 7

    const pending = AutoNotificationService.getPendingNotifications(invoices, customers, advanceDays)

    if (pending.length > 0) {
      console.log(`📬 Found ${pending.length} pending subscription notifications`)
      // Auto-send notifications
      const sentCount = AutoNotificationService.checkAndSendNotifications(invoices, customers, advanceDays)
      if (sentCount > 0) {
        showToast(`📱 ${sentCount} njoftim u dërgua nëpërmjet WhatsApp`, 'success')
      }
    }
  }, [invoices, customers, showToast])

  // Auto-backup every 3 hours (fixed schedule, not on every refresh)
  useEffect(() => {
    const BACKUP_INTERVAL_MS = 3 * 60 * 60 * 1000 // 3 hours
    const LAST_BACKUP_KEY = 'xflow_last_backup_time'
    const CHECK_INTERVAL_MS = 5 * 60 * 1000 // Check every 5 minutes

    // Function to check if it's time to backup and create if needed
    const checkAndCreateBackup = () => {
      const lastBackupTime = localStorage.getItem(LAST_BACKUP_KEY)
      const now = Date.now()

      // If no backup exists or 3 hours have passed, create a backup
      if (!lastBackupTime || (now - parseInt(lastBackupTime)) >= BACKUP_INTERVAL_MS) {
        const appState = { invoices, customers, items, payments, expenses, users }
        const result = BackupService.createAutoBackup(appState)
        if (result.success) {
          localStorage.setItem(LAST_BACKUP_KEY, now.toString())
          console.log('✅ Auto-backup created successfully')
        } else {
          console.error('Auto-backup failed:', result.message)
        }
      }
    }

    // Check on app load
    checkAndCreateBackup()

    // Set up interval to check every 5 minutes if it's time to backup
    const backupCheckInterval = setInterval(checkAndCreateBackup, CHECK_INTERVAL_MS)

    // Cleanup interval on unmount
    return () => clearInterval(backupCheckInterval)
  }, [invoices, customers, items, payments, expenses, users])

  return (
    <div className={`app flex min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <Header />
        <main className={`flex-1 p-3 sm:p-5 md:p-6 overflow-y-auto ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
          {loading ? <LoadingSkeleton /> : <PageComponent />}
        </main>
      </div>

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget}>
          {modal}
        </div>
      )}
    </div>
  )
}

function AuthWrapper() {
  const { users, setCurrentUser, currentUser } = useApp()
  const { createSession, loading: tenantLoading } = useTenant()

  if (tenantLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="text-center text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p>Duke u ngarku...</p>
      </div>
    </div>
  }

  if (!currentUser) {
    const handleLogin = (user) => {
      // Create JWT-like token with org_id claim for RLS policies
      const token = btoa(JSON.stringify({
        sub: user.id,
        email: user.username,
        org_id: user.orgId,
        is_superadmin: user.isSuperAdmin || false,
        iat: Math.floor(Date.now() / 1000)
      }))

      // Store token in localStorage for use in Supabase requests
      localStorage.setItem('xflow_auth_token', token)

      // Set user in AppContext
      setCurrentUser(user)
      // Create session in TenantContext
      createSession(user, user.orgId)
    }
    return <Login users={users} onLogin={handleLogin} />
  }

  // Route based on user role (super admin or regular user)
  return <RoleBasedRouter AppLayout={OrgAppLayout} />
}

export default function App() {
  return (
    <TenantProvider>
      <AppProvider>
        <AuthWrapper />
      </AppProvider>
    </TenantProvider>
  )
}
