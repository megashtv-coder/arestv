import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import {
  mockInvoices, mockCustomers, mockExpenses, mockItems, mockVendors,
  mockPayments, mockTransfers, paymentModes as defaultPaymentModes,
  depositAccounts as defaultDepositAccounts,
  currencies, mockUsers, mockActivityLog, mockOrganizations,
} from '../data/mockData'
import { supabase } from '../lib/supabase'
import DataMigration from '../services/data/DataMigration'
import { guardRoute, logAccessDenial } from '../middleware/featureRouteGuard'

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

  if (toUpsert.length) {
    supabase.from(table).upsert(
      toUpsert.map(d => ({ id: d.id, data: { ...d, orgId: orgId || d.orgId } }))
    ).then(result => {
      if (result.error) {
        console.error(`[diffSync] Error upserting ${table}:`, result.error)
      }
    }).catch(err => {
      console.error(`[diffSync] Error upserting ${table}:`, err)
    })
  }
  if (toDelete.length) {
    supabase.from(table).delete().in('id', toDelete.map(d => d.id)).then(result => {
      if (result.error) {
        console.error(`[diffSync] Error deleting from ${table}:`, result.error)
      }
    }).catch(err => {
      console.error(`[diffSync] Error deleting from ${table}:`, err)
    })
  }
}

/* ══════════════════════════════════════════════════════════
   Provider
══════════════════════════════════════════════════════════ */
export function AppProvider({ children }) {

  /* ── UI states ── */
  const [currency,         setCurrency]         = useState(currencies[0])
  const [darkMode,         setDarkMode]         = useState(() => localStorage.getItem('arestv_dark') === 'true')
  const [toast,            setToast]            = useState(null)
  const [modal,            setModal]            = useState(null)
  const [page,             setPage]             = useState(() => {
    // Read page from URL on load, default to dashboard
    if (typeof window !== 'undefined') {
      const url = new URL(window.location)
      return url.searchParams.get('page') || 'dashboard'
    }
    return 'dashboard'
  })
  const [loading,          setLoading]          = useState(false)
  const [dbLoading,        setDbLoading]        = useState(!!supabase) // loading initial kur ka Supabase
  const [sidebarOpen,      setSidebarOpen]      = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem('arestv_sidebar') === 'true')

  /* ── Organizations ── */
  const [organizations, setOrganizations] = useState(mockOrganizations)

  /* ── Users & Auth ── */
  const _loadedUsers = (() => {
    try {
      const saved = localStorage.getItem('arestv_users')
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
      const saved = localStorage.getItem('arestv_user')
      if (!saved) return null
      const parsed = JSON.parse(saved)
      return _loadedUsers.find(u => u.id === parsed.id && u.active !== false) || null
    } catch { return null }
  })
  const [activityLog, setActivityLog] = useState(() => {
    const saved = localStorage.getItem('arestv_activity_log')
    return saved ? JSON.parse(saved) : mockActivityLog
  })

  const isTester     = currentUser?.role === 'tester'
  const isSuperAdmin = currentUser?.isSuperAdmin === true
  const currentOrgId = currentUser?.orgId || null

  // Org aktuale (objekti i plotë)
  const currentOrg = organizations.find(o => o.id === currentOrgId) || null

  /* ── Single-org: No filtering needed ── */
  const filterByOrg = (data) => {
    // Single org app - return all data without filtering
    return data
  }

  /* ── Wrapper setters që automatikisht shtojnë orgId në të dhëna të reja ── */
  const wrappedSetInvoices = useCallback((fn) => {
    setInvoices(prev => {
      const next = typeof fn === 'function' ? fn(prev) : fn
      return next
    })
  }, [])

  const wrappedSetCustomers = useCallback((fn) => {
    setCustomers(prev => {
      const next = typeof fn === 'function' ? fn(prev) : fn
      return next
    })
  }, [])

  const wrappedSetExpenses = useCallback((fn) => {
    setExpenses(prev => {
      const next = typeof fn === 'function' ? fn(prev) : fn
      return next
    })
  }, [])

  const wrappedSetPayments = useCallback((fn) => {
    setPayments(prev => {
      const next = typeof fn === 'function' ? fn(prev) : fn
      return next
    })
  }, [])

  const wrappedSetTransfers = useCallback((fn) => {
    setTransfers(prev => {
      const next = typeof fn === 'function' ? fn(prev) : fn
      return next
    })
  }, [])

  const wrappedSetUsers = useCallback((fn) => {
    setUsers(prev => {
      const next = typeof fn === 'function' ? fn(prev) : fn
      return next
    })
  }, [])

  /* ── Data migration: Fix any invoices without orgId ── */
  const migrateOrgIds = (rawInvoices, orgId) => {
    if (!Array.isArray(rawInvoices)) return rawInvoices
    return rawInvoices.map(inv => {
      if (!inv.orgId && orgId) {
        console.warn(`[MIGRATION] Fixing invoice ${inv.id} - assigning orgId`)
        return { ...inv, orgId }
      }
      return inv
    })
  }

  /* ── Data states — inicializohen bosh, mbushen nga Supabase / mockData ── */
  const [invoices,        setInvoices]        = useState([])
  const [customers,       setCustomers]       = useState([])
  const [expenses,        setExpenses]        = useState([])
  const [payments,        setPayments]        = useState([])
  const [transfers,       setTransfers]       = useState([])
  const [vendors,         setVendors]         = useState([])
  const [items,           setItems]           = useState([])
  const [representatives, setRepresentatives] = useState(() => {
    try {
      const saved = localStorage.getItem('arestv_representatives')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })
  const [paymentModes,    setPaymentModes]    = useState(defaultPaymentModes)
  const [depositAccounts, setDepositAccounts] = useState(defaultDepositAccounts)

  /* ── Tester sandbox ── */
  const [tInvoices,  setTInvoices]  = useState([])
  const [tCustomers, setTCustomers] = useState([])
  const [tExpenses,  setTExpenses]  = useState([])
  const [tPayments,  setTPayments]  = useState([])
  const [tTransfers, setTTransfers] = useState([])
  const [tUsers,     setTUsers]     = useState([])

  /* ── Refs për diff-sync ── */
  const prevInvoices  = useRef([])
  const prevCustomers = useRef([])
  const prevExpenses  = useRef([])
  const prevPayments  = useRef([])
  const prevTransfers = useRef([])
  const prevVendors   = useRef([])
  const prevItems     = useRef([])
  const prevActivities= useRef([])
  const prevPM        = useRef(null)
  const prevDA        = useRef(null)
  const prevUsers     = useRef(null) // null = nuk është inicializuar ende nga Supabase

  /* ══════════════════════════════════════════════════════════
     NGARKIM fillestar nga Supabase (ose mockData nëse pa Supabase)
  ══════════════════════════════════════════════════════════ */
  useEffect(() => {
    if (!supabase) {
      // Pa Supabase — përdor mock data
      console.log('📊 Loading invoices from mockData:', mockInvoices.length, 'invoices')
      console.log('🆕 First invoice:', mockInvoices[0])
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

    // Helper: merr TË GJITHA rreshtat duke paginuar (Supabase kthen max 1000 pa range)
    const fetchAll = async (table, col = 'id,data') => {
      const PAGE = 1000
      let from = 0
      let all  = []
      while (true) {
        const { data, error } = await supabase
          .from(table).select(col).range(from, from + PAGE - 1)
        if (error || !data?.length) break
        all  = all.concat(data)
        if (data.length < PAGE) break
        from += PAGE
      }
      return { data: all }
    }

    // Me Supabase — ngarko të gjitha tabelat paralelisht
    Promise.all([
      fetchAll('invoices'),
      fetchAll('customers'),
      fetchAll('expenses'),
      fetchAll('payments'),
      fetchAll('transfers'),
      fetchAll('vendors'),
      fetchAll('items'),
      fetchAll('activities'),
      supabase.from('settings').select('key, value'),
      fetchAll('organizations'),
      fetchAll('users'),
    ]).then(([inv, cust, exp, pay, tran, vend, itm, act, sett, orgs, usrs]) => {

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

      // Use wrapped setters to ensure orgId is assigned to all items from Supabase
      wrappedSetInvoices(loadedInvoices);    prevInvoices.current  = loadedInvoices
      wrappedSetCustomers(loadedCustomers);  prevCustomers.current = loadedCustomers
      wrappedSetExpenses(loadedExpenses);    prevExpenses.current  = loadedExpenses
      wrappedSetPayments(loadedPayments);    prevPayments.current  = loadedPayments
      wrappedSetTransfers(loadedTransfers);  prevTransfers.current = loadedTransfers
      setVendors(loadedVendors);             prevVendors.current   = loadedVendors
      setItems(loadedItems);                 prevItems.current     = loadedItems

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

      // Organizations — merge Supabase + mockOrganizations (kurrë mos humb ato default)
      {
        const supaOrgs    = orgs?.data?.length ? fromRows(orgs.data) : []
        const supaIds     = new Set(supaOrgs.map(o => o.id))
        const missingMock = mockOrganizations.filter(o => !supaIds.has(o.id))
        const merged      = [...supaOrgs, ...missingMock]
        setOrganizations(merged)
        prevOrgs.current  = merged   // inicializo prev me gjendjen aktuale — mos aktivizo delete
        // Nëse mungonin mock orgs, shtoji edhe në Supabase
        if (missingMock.length)
          supabase.from('organizations').upsert(missingMock.map(o => ({ id: o.id, data: o }))).then()
      }

      // Users — merge Supabase + mockUsers (kurrë mos humb default users)
      {
        const supaUsers   = usrs?.data?.length ? fromRows(usrs.data) : []
        // Apliko fushat bazë nga mockUsers për userat default
        const merged = supaUsers.map(u => {
          const base = mockUsers.find(m => m.id === u.id)
          if (!base) return u
          return { ...u, username: base.username, role: base.role, orgId: base.orgId, isSuperAdmin: base.isSuperAdmin }
        })
        const supaIds     = new Set(supaUsers.map(u => u.id))
        const deletedIds  = new Set(supaUsers.filter(u => u.deleted).map(u => u.id))
        const missingMock = mockUsers.filter(u => !supaIds.has(u.id) && !deletedIds.has(u.id))
        const finalUsers  = missingMock.length ? [...merged, ...missingMock] : merged
        setUsers(finalUsers)
        prevUsers.current = finalUsers
        // Nëse mungonin mock users ose tabela ishte bosh, shtoji në Supabase
        const toSeed = finalUsers.filter(u => !supaIds.has(u.id))
        if (toSeed.length)
          supabase.from('users').upsert(toSeed.map(u => ({ id: u.id, data: u }))).then()
      }

      // Activities — merge localStorage + Supabase for cross-device sync
      {
        const localActivities = activityLog || []
        const supabaseActivities = act?.data?.length ? fromRows(act.data) : []

        // Filter Supabase activities by current org
        const filteredSupabase = currentOrgId
          ? supabaseActivities.filter(a => a.orgId === currentOrgId)
          : []

        // Merge: keep all local activities + add from Supabase that aren't local
        const localIds = new Set(localActivities.map(a => a.id))
        const newFromSupabase = filteredSupabase.filter(a => !localIds.has(a.id))

        // Combine and sort by timestamp (newest first)
        const merged = [...localActivities, ...newFromSupabase]
          .sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime())

        // Update state only if we have new activities from Supabase
        if (newFromSupabase.length > 0) {
          setActivityLog(merged)
          prevActivities.current = merged
        } else {
          prevActivities.current = localActivities
        }
      }

      // MIGRATION: Ensure all records have orgId (critical for data isolation)
      if (supabase) {
        const migration = new DataMigration(supabase)
        migration.checkStatus().then(status => {
          const needsMigration = Object.values(status).some(t => t.needsMigration)
          if (needsMigration) {
            console.warn('[AppContext] Data migration needed — some records missing orgId')
            console.log('[AppContext] Migration status:', status)
            // Auto-run migration silently to fix data isolation
            migration.migrateAllData('ORG-001').catch(err => {
              console.error('[AppContext] Migration failed:', err)
            })
          }
        }).catch(err => {
          console.error('[AppContext] Failed to check migration status:', err)
        })
      }

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
      prevPM.current   = defaultPaymentModes
      prevDA.current   = defaultDepositAccounts
      prevUsers.current = _loadedUsers  // fallback — mos sync-o deri sa të jetë online
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

  // Always save activities to localStorage, and also sync to Supabase if available
  useEffect(() => {
    // Always persist to localStorage for immediate access on refresh
    localStorage.setItem('arestv_activity_log', JSON.stringify(activityLog))

    // Also sync to Supabase if available
    if (canSync && supabase) {
      diffSync('activities', activityLog, prevActivities, currentOrgId)
    }
  }, [activityLog, canSync, currentOrgId])

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

  // Sync users — kur ndryshojnë users (shto/edito/fshi), ruhen automatikisht në Supabase
  useEffect(() => {
    if (!supabase || isTester || prevUsers.current === null) return
    if (prevUsers.current === users) return
    const prev = prevUsers.current
    const toUpsert = users.filter(u => {
      const old = prev.find(x => x.id === u.id)
      return !old || JSON.stringify(old) !== JSON.stringify(u)
    })
    const toDelete = prev.filter(u => !users.find(x => x.id === u.id))
    prevUsers.current = users
    if (toUpsert.length) supabase.from('users').upsert(toUpsert.map(d => ({ id: d.id, data: d }))).then()
    if (toDelete.length) supabase.from('users').delete().in('id', toDelete.map(d => d.id)).then()
  }, [users, isTester])

  // Sync organizations — ruhen nga super admin, pa kufizim org
  const prevOrgs = useRef([])
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
    localStorage.setItem('arestv_users', JSON.stringify(users))
  }, [users])

  useEffect(() => {
    if (currentUser) localStorage.setItem('arestv_user', JSON.stringify(currentUser))
    else             localStorage.removeItem('arestv_user')
  }, [currentUser])

  /* ── Dark mode ── */
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
    localStorage.setItem('arestv_dark', darkMode)
  }, [darkMode])

  /* ── Sidebar collapse ── */
  useEffect(() => {
    localStorage.setItem('arestv_sidebar', sidebarCollapsed)
  }, [sidebarCollapsed])

  /* ── Representatives persistence ── */
  useEffect(() => {
    localStorage.setItem('arestv_representatives', JSON.stringify(representatives))
  }, [representatives])

  /* ── Browser history management for page and modal navigation ── */
  useEffect(() => {
    // Sync page state with browser URL for back button support
    const url = new URL(window.location)
    if (page !== 'dashboard') {
      url.searchParams.set('page', page)
    } else {
      url.searchParams.delete('page')
    }
    // Push new state only when page changes
    window.history.pushState({ page, hasModal: !!modal }, '', url.toString())
  }, [page])

  // Update current history entry when modal state changes without creating new entry
  useEffect(() => {
    if (!modal) return  // Only sync when modal is open
    // Replace current state to include modal flag when modal opens
    const url = new URL(window.location)
    window.history.replaceState({ page, hasModal: true }, '', url.toString())
  }, [modal, page])

  useEffect(() => {
    // Handle back button presses
    const handlePopState = (e) => {
      const state = e.state || {}

      // If a modal is currently open, close it but stay on the same page
      if (modal) {
        setModal(null)
        // Push state back to stay on current page (don't navigate)
        const url = new URL(window.location)
        window.history.pushState({ page, hasModal: false }, '', url.toString())
      } else {
        // No modal is open, navigate to previous page
        const newPage = state.page || new URL(window.location).searchParams.get('page') || 'dashboard'
        if (newPage !== page) {
          setPage(newPage)
        }
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [modal, page])

  /* ── Logout ── */
  const logout = useCallback(() => {
    setCurrentUser(null)
    setPage('dashboard')
    // Clear both AppContext and TenantContext
    localStorage.removeItem('arestv_user')
    localStorage.removeItem('arestv_session')
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
      orgId:     currentOrgId,
    }, ...prev])
  }, [currentUser, currentOrgId])

  /* ── Helpers ── */
  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }, [])

  const navigate = useCallback((p) => {
    // Guard route access based on features
    const guardResult = guardRoute({
      route: p,
      orgId: currentOrgId,
    })

    if (!guardResult.allowed) {
      logAccessDenial({ route: p, orgId: currentOrgId }, guardResult.reason || 'Access denied')
      // Show toast and redirect to allowed page
      setToast({ msg: 'Ky modul nuk është në dispozicion për organizatën tuaj.', type: 'error' })
      if (guardResult.redirectTo) {
        setPage(guardResult.redirectTo)
      }
      return
    }

    setPage(p)
    // Update URL so page state is preserved on refresh
    const url = new URL(window.location)
    url.searchParams.set('page', p)
    window.history.pushState({ page: p }, '', url.toString())
    setSidebarOpen(false)
    setLoading(true)
    setTimeout(() => setLoading(false), 80)
  }, [currentOrgId])

  const fmt = useCallback(
    (amount) => currency.symbol + new Intl.NumberFormat('de-DE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount ?? 0),
    [currency]
  )

  const closeModal = useCallback(() => setModal(null), [])

  /* ══════════════════════════════════════════════════════════
     Context value
  ══════════════════════════════════════════════════════════ */
  // Determine which data to show (tester sandbox, filtered by org, or all for superadmin)
  const contextInvoices  = isTester ? tInvoices   : filterByOrg(invoices)
  const contextCustomers = isTester ? tCustomers  : filterByOrg(customers)
  const contextExpenses  = isTester ? tExpenses   : filterByOrg(expenses)
  const contextPayments  = isTester ? tPayments   : filterByOrg(payments)
  const contextTransfers = isTester ? tTransfers  : filterByOrg(transfers)
  const contextUsers     = isTester ? tUsers      : filterByOrg(users).filter(u => !u.deleted)

  return (
    <AppContext.Provider value={{
      /* Tester user sheh izolim — nuk ndikon në të dhënat reale */
      invoices:        contextInvoices,
      setInvoices:     isTester ? setTInvoices : wrappedSetInvoices,
      customers:       contextCustomers,
      setCustomers:    isTester ? setTCustomers : wrappedSetCustomers,
      expenses:        contextExpenses,
      setExpenses:     isTester ? setTExpenses  : wrappedSetExpenses,
      payments:        contextPayments,
      setPayments:     isTester ? setTPayments  : wrappedSetPayments,
      transfers:       contextTransfers,
      setTransfers:    isTester ? setTTransfers : wrappedSetTransfers,
      /* Shared */
      items,           setItems,
      vendors,         setVendors,
      representatives, setRepresentatives,
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
      users:           contextUsers,
      setUsers:        isTester ? setTUsers : wrappedSetUsers,
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
    }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)
