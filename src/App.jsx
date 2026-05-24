import { useState } from 'react'
import { AppProvider, useApp } from './context/AppContext'
import Login from './pages/Login'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import Dashboard from './pages/Dashboard'
import Invoices from './pages/Invoices'
import Customers from './pages/Customers'
import ExpensesPage from './pages/Expenses'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import { Toast, LoadingSkeleton } from './components/UI'

function AppLayout() {
  const { page, loading, toast, setToast, modal } = useApp()

  const PAGES = {
    dashboard: Dashboard,
    invoices:  Invoices,
    customers: Customers,
    expenses:  ExpensesPage,
    reports:   Reports,
    settings:  Settings,
  }
  const PageComponent = PAGES[page] || Dashboard

  return (
    <div className="app flex min-h-screen bg-gray-50">
      <Sidebar/>
      <div className="flex-1 flex flex-col min-h-screen lg:ml-0">
        <Header/>
        <main className="flex-1 p-5 md:p-6 overflow-y-auto">
          {loading ? <LoadingSkeleton/> : <PageComponent/>}
        </main>
      </div>

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)}/>}

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget}>
          {modal}
        </div>
      )}
    </div>
  )
}

function AuthWrapper() {
  // Persist login — lexon nga localStorage
  const [authed, setAuthed] = useState(
    () => localStorage.getItem('xflow_auth') === 'true'
  )

  const handleLogin = () => {
    localStorage.setItem('xflow_auth', 'true')
    setAuthed(true)
  }

  const handleLogout = () => {
    localStorage.removeItem('xflow_auth')
    setAuthed(false)
  }

  if (!authed) return <Login onLogin={handleLogin}/>
  return <AppLayout onLogout={handleLogout}/>
}

export default function App() {
  return (
    <AppProvider>
      <AuthWrapper/>
    </AppProvider>
  )
}
