import { AppProvider, useApp } from './context/AppContext'
import { TenantProvider, useTenant } from './context/TenantContext'
import { supabase } from './lib/supabase'
import RoleBasedRouter from './components/RoleBasedRouter'
import Login from './pages/Login'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import { Toast, LoadingSkeleton } from './components/UI'
import { useEffect, useState, lazy, Suspense } from 'react'
import AutoNotificationService from './services/AutoNotificationService'
import BackupService from './services/BackupService'

// Lazy load all pages to reduce initial bundle size
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Invoices = lazy(() => import('./pages/Invoices'))
const Customers = lazy(() => import('./pages/Customers'))
const ExpensesPage = lazy(() => import('./pages/Expenses'))
const Items = lazy(() => import('./pages/Items'))
const Payments = lazy(() => import('./pages/Payments'))
const Reports = lazy(() => import('./pages/Reports'))
const Settings = lazy(() => import('./pages/Settings'))
const Subscriptions = lazy(() => import('./pages/Subscriptions'))
const Suppliers = lazy(() => import('./pages/Suppliers'))
const UsersPage = lazy(() => import('./pages/Users'))
const CommunicationHistory = lazy(() => import('./pages/CommunicationHistory'))
const Tasks = lazy(() => import('./pages/Tasks'))

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
  tasks:                 Tasks,
}

function OrgAppLayout() {
  const { page, navigate, loading, toast, setToast, modal, darkMode, invoices, customers, items, payments, expenses, users, showToast } = useApp()

  // Parse nested routes like "invoices:create" or "invoices:INV-123:edit"
  const pageMatch = page.split(':')
  const basePage = pageMatch[0]
  const action = pageMatch[1] // 'create' or id
  const editId = pageMatch[2] // Only for edit routes

  const PageComponent = ORG_PAGES[basePage] || Dashboard

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
          {loading ? <LoadingSkeleton /> : (
            <Suspense fallback={<LoadingSkeleton />}>
              <PageComponent />
            </Suspense>
          )}
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
  const [sessionLoading, setSessionLoading] = useState(true)

  // Check for existing Supabase session on mount
  useEffect(() => {
    const restoreSession = async () => {
      try {
        console.log('🔄 Checking for existing Supabase session...')

        // Get current session
        const { data: { session } } = await supabase.auth.getSession()

        if (session?.user) {
          console.log('✅ Session found, restoring user...')

          // Fetch user profile to get org_id
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('email', session.user.email)
            .single()

          // Enhance user object
          const enhancedUser = {
            ...session.user,
            username: session.user.email,
            name: session.user.user_metadata?.name || session.user.email.split('@')[0],
            orgId: profile?.org_id,
            role: profile?.role || 'user',
            isSuperAdmin: false,
            active: true
          }

          console.log('✅ User restored:', enhancedUser.email)
          setCurrentUser(enhancedUser)
          createSession(enhancedUser, enhancedUser.orgId)
        } else {
          console.log('ℹ️ No active session')
        }
      } catch (err) {
        console.error('❌ Session restore error:', err)
      } finally {
        setSessionLoading(false)
      }
    }

    restoreSession()
  }, [])

  if (tenantLoading || sessionLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="text-center text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
        <p>Duke u ngarku...</p>
      </div>
    </div>
  }

  if (!currentUser) {
    const handleLogin = (user) => {
      try {
        console.log('👤 handleLogin received user:', { id: user.id, email: user.email, orgId: user.orgId })

        // Set user in AppContext (user object has orgId from Login.jsx)
        setCurrentUser(user)

        // Create session in TenantContext with org_id
        createSession(user, user.orgId)

        console.log('✅ handleLogin complete')
      } catch (err) {
        console.error('❌ handleLogin error:', err)
      }
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
