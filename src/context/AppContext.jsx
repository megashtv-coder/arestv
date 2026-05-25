import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import {
  mockInvoices, mockCustomers, mockExpenses, mockItems, mockVendors,
  mockPayments, mockTransfers, paymentModes as defaultPaymentModes,
  depositAccounts as defaultDepositAccounts,
  currencies, mockUsers, mockActivityLog, mockOrganizations,
} from '../data/mockData'
import { supabase } from '../lib/supabase'

const AppContext = createContext(null)

/* ══════════════════════════════════════════════════════════
   Supabase helpers
══════════════════════════════════════════════════════════ */

// Rreshtat nga Supabase kanë formën { id, data } — shpaketoj data
const fromRows = (rows) => (rows || []).map(r => r.data)

// Sinkronizon ndryshimet e një tabele: upsert të reja/ndryshuara, delete të fshira
function diffSync(table, curr, prevRef, orgId) {
  if (!supabase) return
  const prev = prevRef.current
  if (prev === curr) return               // asnjë ndryshim

  const toUpsert = curr.filter(item => {
    const old = prev.find(i => i.id === item.id)
    return !old || JSON.stringify(old) !== JSON.stringify(item)
  })
  const toDelete = prev.filter(item => !curr.find(i => i.id === item.id))

  prevRef.current = curr

  if (toUpsert.length)
    supabase.from(table).upsert(
      toUpsert.map(d => ({ id: d.id, data: { ...d, orgId: orgId || d.orgId } }))
    ).then()
  if (toDelete.length)
    supabase.from(table).delete().in('id', toDelete.map(d => d.id)).then()
}

/* ══════════════════════════════════════════════════════════
   Provider
══════════════════════════════════════════════════════════ */
export function AppProvider({ children }) {

  /* ── UI states ── */
  const [currency,         setCurrency]         = useState(currencies[0])
  const [darkMode,         setDarkMode]         = useState(() => localStorage.getItem('xflow_dark') === 'true')
  const [toast,            setToast]            = useState(null)
  const [modal,            setModal]            = useState(null)
  const [page,             setPage]             = useState(() => localStorage.getItem('xflow_page') || 'dashboard')
  const [loading,          setLoading]          = useState(false)
  const [dbLoading,        setDbLoading]        = useState(!!supabase) // loading initial kur ka Supabase
  const [sidebarOpen,      setSidebarOpen]      = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem('xflow_sidebar') === 'true')
  const [managerMode,      setManagerMode]      = useState(false) // super admin mund të kalojë në manager view

  /* ── Organizations ── */
  const [organizations, setOrganizations] = useState(mockOrganizations)

  /* ── Users & Auth ── */
  const _loadedUsers = (() => {
    try {
      const saved = localStorage.getItem('xflow_users')
      if (!saved) return mockUsers
      const stored = JSON.parse(saved)
      // Sync immutable base fields from mockData (username, role, orgId, isSuperAdmin)
      // so that changes in mockData always take effect even for existing stored users
      const merged = stored.map(u => {
        const base = mockUsers.find(m => m.id === u.id)
        if (!base) return u
        return { ...u, username: base.username, role: base.role, orgId: base.orgId, isSuperAdmin: base.isSuperAdmin }
      })
      const storedIds = new Set(stored.map(u => u.id))
      const missing = mockUsers.filter(u => !storedIds.has(u.id))
      return missing.length ? [...merged, ...missing] : merged
    } catch { return mockUsers }
  })()

  const [users,       setUsers]       = useState(_loadedUsers)
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('xflow_user')
      if (!saved) return null
      const parsed = JSON.parse(saved)
      return _loadedUsers.find(u => u.id === parsed.id && u.active !== false) || null
    } catch { return null }
  })
  const [activityLog, setActivityLog] = useState(mockActivityLog)

  const isTester     = currentUser?.role === 'tester'
  const isSuperAdmin = currentUser?.isSuperAdmin === true
  const currentOrgId = currentUser?.orgId || null

  // Org aktuale (objekti i plotë)
  const currentOrg = organizations.find(o => o.id === currentOrgId) || null

  /* ── Data states — inicializohen bosh, mbushen nga Supabase / mockData ── */
  const [invoices,        setInvoices]        = useState([])
  const [customers,       setCustomers]       = useState([])
  const [expenses,        setExpenses]        = useState([])
  const [payments,        setPayments]        = useState([])
  const [transfers,       setTransfers]       = useState([])
  const [vendors,         setVendors]         = useState([])
  const [items,           setItems]           = useState([])
  const [paymentModes,    setPaymentModes]    = useState(defaultPaymentModes)
  const [depositAccounts, setDepositAccounts] = useState(defaultDepositAccounts)

  /* ── Tester sandbox ── */
  const [tInvoices,  setTInvoices]  = useState([])
  const [tCustomers, setTCustomers] = useState([])
  const [tExpenses,  setTExpenses]  = useState([])
  const [tPayments,  setTPayments]  = useState([])
  const [tTransfers, setTTransfers] = useState([])

  /* ── Refs për diff-sync ── */
  const prevInvoices  = useRef([])
  const prevCustomers = useRef([])
  const prevExpenses  = useRef([])
  const prevPayments  = useRef([])
  const prevTransfers = useRef([])
  const prevVendors   = useRef([])
  const prevItems     = useRef([])
  const prevPM        = useRef(null)
  const prevDA        = useRef(null)

  /* ══════════════════════════════════════════════════════════
     NGARKIM fillestar nga Supabase (ose mockData nëse pa Supabase)
  ══════════════════════════════════════════════════════════ */
  useEffect(() => {
    if (!supabase) {
      // Pa Supabase — përdor mock data
      setInvoices(mockInvoices);        prevInvoices.current  = mockInvoices
      setCustomers(mockCustomers);      prevCustomers.current = mockCustomers
      setExpenses(mockExpenses);        prevExpenses.current  = mockExpenses
      setPayments(mockPayments);        prevPayments.current  = mockPayments
      setTransfers(mockTransfers);      prevTransfers.current = mockTransfers
      setVendors(mockVendors);          prevVendors.current   = mockVendors
      setItems(mockItems);              prevItems.current     = mockItems
      prevPM.current = defaultPaymentModes
      prevDA.current = defaultDepositAccounts
      return
    }

    // Me Supabase — ngarko të gjitha tabelat paralelisht
    Promise.all([
      supabase.from('invoices').select('data'),
      supabase.from('customers').select('data'),
      supabase.from('expenses').select('data'),
      supabase.from('payments').select('data'),
      supabase.from('transfers').select('data'),
      supabase.from('vendors').select('data'),
      supabase.from('items').select('data'),
      supabase.from('settings').select('key, value'),
      supabase.from('organizations').select('data'),
    ]).then(([inv, cust, exp, pay, tran, vend, itm, sett, orgs]) => {

      const load = (res, fallback) => {
        const d = res.data?.length ? fromRows(res.data) : fallback
        return d
      }

      const loadedInvoices  = load(inv,  [])
      const loadedCustomers = load(cust, [])
      const loadedExpenses  = load(exp,  [])
      const loadedPayments  = load(pay,  [])
      const loadedTransfers = load(tran, [])
      const loadedVendors   = load(vend, mockVendors)
      const loadedItems     = load(itm,  mockItems)

      setInvoices(loadedInvoices);        prevInvoices.current  = loadedInvoices
      setCustomers(loadedCustomers);      prevCustomers.current = loadedCustomers
      setExpenses(loadedExpenses);        prevExpenses.current  = loadedExpenses
      setPayments(loadedPayments);        prevPayments.current  = loadedPayments
      setTransfers(loadedTransfers);      prevTransfers.current = loadedTransfers
      setVendors(loadedVendors);          prevVendors.current   = loadedVendors
      setItems(loadedItems);              prevItems.current     = loadedItems

      // Settings
      if (sett.data?.length) {
        const pmRow = sett.data.find(r => r.key === 'paymentModes')
        const daRow = sett.data.find(r => r.key === 'depositAccounts')
        const pm = pmRow?.value ?? defaultPaymentModes
        const da = daRow?.value ?? defaultDepositAccounts
        setPaymentModes(pm);    prevPM.current = pm
        setDepositAccounts(da); prevDA.current = da
      } else {
        prevPM.current = defaultPaymentModes
        prevDA.current = defaultDepositAccounts
      }

      // Organizations
      if (orgs?.data?.length) setOrganizations(fromRows(orgs.data))

      setDbLoading(false)
    }).catch(() => {
      // Fallback në rast gabimi rrjeti
      setInvoices(mockInvoices);        prevInvoices.current  = mockInvoices
      setCustomers(mockCustomers);      prevCustomers.current = mockCustomers
      setExpenses(mockExpenses);        prevExpenses.current  = mockExpenses
      setPayments(mockPayments);        prevPayments.current  = mockPayments
      setTransfers(mockTransfers);      prevTransfers.current = mockTransfers
      setVendors(mockVendors);          prevVendors.current   = mockVendors
      setItems(mockItems);              prevItems.current     = mockItems
      prevPM.current = defaultPaymentModes
      prevDA.current = defaultDepositAccounts
      setDbLoading(false)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ══════════════════════════════════════════════════════════
     SYNC — kur ndryshohen të dhënat, ruhen automatikisht
  ══════════════════════════════════════════════════════════ */
  const canSync = !dbLoading && !isTester && !!currentOrgId

  useEffect(() => { if (canSync) diffSync('invoices',  invoices,  prevInvoices,  currentOrgId) }, [invoices,  canSync])
  useEffect(() => { if (canSync) diffSync('customers', customers, prevCustomers, currentOrgId) }, [customers, canSync])
  useEffect(() => { if (canSync) diffSync('expenses',  expenses,  prevExpenses,  currentOrgId) }, [expenses,  canSync])
  useEffect(() => { if (canSync) diffSync('payments',  payments,  prevPayments,  currentOrgId) }, [payments,  canSync])
  useEffect(() => { if (canSync) diffSync('transfers', transfers, prevTransfers, currentOrgId) }, [transfers, canSync])
  useEffect(() => { if (canSync) diffSync('vendors',   vendors,   prevVendors,   currentOrgId) }, [vendors,   canSync])
  useEffect(() => { if (canSync) diffSync('items',     items,     prevItems,     currentOrgId) }, [items,     canSync])

  useEffect(() => {
    if (!canSync || !supabase) return
    if (JSON.stringify(prevPM.current) === JSON.stringify(paymentModes)) return
    prevPM.current = paymentModes
    supabase.from('settings').upsert({ key: 'paymentModes', value: paymentModes }).then()
  }, [paymentModes, canSync])

  useEffect(() => {
    if (!canSync || !supabase) return
    if (JSON.stringify(prevDA.current) === JSON.stringify(depositAccounts)) return
    prevDA.current = depositAccounts
    supabase.from('settings').upsert({ key: 'depositAccounts', value: depositAccounts }).then()
  }, [depositAccounts, canSync])

  // Sync organizations — ruhen nga super admin, pa kufizim org
  const prevOrgs = useRef(mockOrganizations)
  useEffect(() => {
    if (!supabase || !isSuperAdmin) return
    if (prevOrgs.current === organizations) return
    const toUpsert = organizations.filter(o => {
      const old = prevOrgs.current.find(x => x.id === o.id)
      return !old || JSON.stringify(old) !== JSON.stringify(o)
    })
    const toDelete = prevOrgs.current.filter(o => !organizations.find(x => x.id === o.id))
    prevOrgs.current = organizations
    if (toUpsert.length) supabase.from('organizations').upsert(toUpsert.map(o => ({ id: o.id, data: o }))).then()
    if (toDelete.length) supabase.from('organizations').delete().in('id', toDelete.map(o => o.id)).then()
  }, [organizations, isSuperAdmin])

  /* ══════════════════════════════════════════════════════════
     MIGRIM një-herësh: resellers + referredBy cleanup
  ══════════════════════════════════════════════════════════ */
  const migrationDone = useRef(false)
  useEffect(() => {
    if (dbLoading || customers.length === 0 || migrationDone.current) return
    migrationDone.current = true

    const RESELLERS = new Set([
      'egzon gimolli', 'showtime', 'kitha', 'gmedia96#', 'bastri qukovci',
      'luli 82', 'besnik refiku', 'egson stp', 'uni2005', 'kemmytv',
      'arxhend zabeli', 'egzon pllana', 'juve87', 'clirim kokollari',
      'drinitv', 'elton zale', 'kematv', 'ali tetova', 'isz90',
      'promedia tv', 'monotv', 'pingtv', 'fresh tv', 'shkodran shabani',
      'lizzaa', 'ares tv', 'luha65',
    ])

    // Grumbulloj emrat e të gjithë klientëve (për validimin e referredBy)
    const validNames = new Set(
      customers.map(c =>
        (c.name || `${c.firstName || ''} ${c.lastName || ''}`).trim().toLowerCase()
      )
    )

    let changed = false
    const updated = customers.map(c => {
      let u = c
      const nameLow = (c.name || `${c.firstName || ''} ${c.lastName || ''}`).trim().toLowerCase()

      // Vendos llojin reseller nëse emri është në listë
      if (RESELLERS.has(nameLow) && c.type !== 'reseller') {
        u = { ...u, type: 'reseller' }
        changed = true
      }

      // Pastro referredBy nëse nuk është emër klienti valid
      if (u.referredBy && !validNames.has(u.referredBy.trim().toLowerCase())) {
        u = { ...u, referredBy: '' }
        changed = true
      }

      return u
    })

    if (changed) setCustomers(updated)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbLoading, customers.length])

  /* ══════════════════════════════════════════════════════════
     Persist users & currentUser në localStorage
  ══════════════════════════════════════════════════════════ */
  useEffect(() => {
    localStorage.setItem('xflow_users', JSON.stringify(users))
  }, [users])

  useEffect(() => {
    if (currentUser) localStorage.setItem('xflow_user', JSON.stringify(currentUser))
    else             localStorage.removeItem('xflow_user')
  }, [currentUser])

  /* ── Dark mode ── */
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
    localStorage.setItem('xflow_dark', darkMode)
  }, [darkMode])

  /* ── Sidebar collapse ── */
  useEffect(() => {
    localStorage.setItem('xflow_sidebar', sidebarCollapsed)
  }, [sidebarCollapsed])

  /* ── Logout ── */
  const logout = useCallback(() => {
    setCurrentUser(null)
    setPage('dashboard')
    localStorage.removeItem('xflow_page')
  }, [])

  /* ── Log activity ── */
  const logActivity = useCallback((action, module = 'Sistemi') => {
    if (!currentUser) return
    setActivityLog(prev => [{
      id:        `LOG-${Date.now()}`,
      userId:    currentUser.id,
      userName:  currentUser.name,
      action,
      module,
      timestamp: new Date().toISOString(),
    }, ...prev])
  }, [currentUser])

  /* ── Helpers ── */
  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }, [])

  const navigate = useCallback((p) => {
    setPage(p)
    localStorage.setItem('xflow_page', p)
    setSidebarOpen(false)
    setLoading(true)
    setTimeout(() => setLoading(false), 350)
  }, [])

  const fmt = useCallback(
    (amount) => currency.symbol + new Intl.NumberFormat('de-DE').format(amount),
    [currency]
  )

  const closeModal = useCallback(() => setModal(null), [])

  /* ══════════════════════════════════════════════════════════
     Context value
  ══════════════════════════════════════════════════════════ */
  return (
    <AppContext.Provider value={{
      /* Tester user sheh izolim — nuk ndikon në të dhënat reale */
      invoices:        isTester ? tInvoices   : invoices,
      setInvoices:     isTester ? setTInvoices : setInvoices,
      customers:       isTester ? tCustomers   : customers,
      setCustomers:    isTester ? setTCustomers : setCustomers,
      expenses:        isTester ? tExpenses    : expenses,
      setExpenses:     isTester ? setTExpenses  : setExpenses,
      payments:        isTester ? tPayments    : payments,
      setPayments:     isTester ? setTPayments  : setPayments,
      transfers:       isTester ? tTransfers   : transfers,
      setTransfers:    isTester ? setTTransfers : setTransfers,
      /* Shared */
      items,           setItems,
      vendors,         setVendors,
      paymentModes,    setPaymentModes,
      depositAccounts, setDepositAccounts,
      currency,        setCurrency,
      darkMode,        setDarkMode,
      toast,           setToast,
      modal,           setModal,      closeModal,
      page,            navigate,
      loading,         dbLoading,
      sidebarOpen,     setSidebarOpen,
      sidebarCollapsed,setSidebarCollapsed,
      users,           setUsers,
      currentUser,     setCurrentUser,
      activityLog,     setActivityLog,
      logActivity,
      showToast,
      fmt,
      logout,
      isTester,
      isSuperAdmin,
      currentOrgId,
      currentOrg,
      organizations,   setOrganizations,
      managerMode,     setManagerMode,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)
