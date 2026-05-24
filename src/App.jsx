import { AppProvider, useApp } from './context/AppContext'
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
import { Toast, LoadingSkeleton } from './components/UI'

function AppLayout() {
  const { page, loading, toast, setToast, modal, darkMode } = useApp()

  const PAGES = {
    dashboard:     Dashboard,
    invoices:      Invoices,
    customers:     Customers,
    expenses:      ExpensesPage,
    items:         Items,
    payments:      Payments,
    reports:       Reports,
    settings:      Settings,
    subscriptions: Subscriptions,
    suppliers:     Suppliers,
    users:         UsersPage,
  }
  const PageComponent = PAGES[page] || Dashboard

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

  if (!currentUser) {
    return <Login users={users} onLogin={setCurrentUser} />
  }
  return <AppLayout />
}

export default function App() {
  return (
    <AppProvider>
      <AuthWrapper />
    </AppProvider>
  )
}
