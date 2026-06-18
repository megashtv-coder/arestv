import { createContext, useContext, useState, useEffect } from 'react'

const TenantContext = createContext(null)

/**
 * TenantProvider - Provides multi-tenant context to the entire application
 * Manages current user session, organization, and permissions
 * Works alongside AppContext for data management
 */
export function TenantProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [organizations, setOrganizations] = useState([])

  // Initialize session from localStorage on mount
  useEffect(() => {
    const savedSession = localStorage.getItem('arestv_session')
    if (savedSession) {
      try {
        setSession(JSON.parse(savedSession))
      } catch (e) {
        console.error('Failed to parse session:', e)
      }
    }
    setLoading(false)
  }, [])

  // Update activity time on user interaction
  useEffect(() => {
    if (!session) return

    const handleActivity = () => {
      const currentSession = JSON.parse(localStorage.getItem('arestv_session') || '{}')
      if (currentSession) {
        currentSession.lastActivity = Date.now()
        localStorage.setItem('arestv_session', JSON.stringify(currentSession))
      }
    }

    // Listen for user interactions
    const debounce = (fn, delay) => {
      let timeout
      return () => {
        clearTimeout(timeout)
        timeout = setTimeout(fn, delay)
      }
    }

    const debouncedActivity = debounce(handleActivity, 5000)
    window.addEventListener('mousemove', debouncedActivity)
    window.addEventListener('keypress', debouncedActivity)
    window.addEventListener('click', debouncedActivity)

    return () => {
      window.removeEventListener('mousemove', debouncedActivity)
      window.removeEventListener('keypress', debouncedActivity)
      window.removeEventListener('click', debouncedActivity)
    }
  }, [session])

  /**
   * Login user - called by AppContext after credential validation
   * Creates session from user object
   */
  const createSession = (user, organizationId) => {
    const newSession = {
      id: `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: user.id,
      username: user.username,
      orgId: organizationId || user.orgId,
      isSuperAdmin: user.isSuperAdmin || false,
      role: user.role || 'viewer',
      loginTime: Date.now(),
      lastActivity: Date.now(),
    }

    setSession(newSession)
    localStorage.setItem('arestv_session', JSON.stringify(newSession))
    return newSession
  }

  /**
   * Logout user
   */
  const logout = () => {
    setSession(null)
    localStorage.removeItem('arestv_session')
  }

  /**
   * Check if user is super admin
   */
  const isSuperAdmin = () => {
    return session?.isSuperAdmin === true
  }

  /**
   * Check if user belongs to organization
   */
  const belongsToOrganization = (organizationId) => {
    return session?.orgId === organizationId
  }

  /**
   * Switch organization for super admin
   */
  const switchOrganization = (organizationId) => {
    if (!isSuperAdmin()) {
      throw new Error('Only super admin can switch organizations')
    }
    const updated = { ...session, orgId: organizationId, lastActivity: Date.now() }
    setSession(updated)
    localStorage.setItem('arestv_session', JSON.stringify(updated))
  }

  const value = {
    // Session state
    session,
    setSession,
    loading,

    // Organizations
    organizations,
    setOrganizations,

    // Auth methods
    createSession,
    logout,
    isLoggedIn: !!session,
    isSuperAdmin,
    belongsToOrganization,
    switchOrganization,

    // Current user/org info
    currentUserId: session?.userId || null,
    currentOrgId: session?.orgId || null,
    currentRole: session?.role || null,

    // Helpers
    isSystemAdmin: session?.isSuperAdmin === true,
    isOrgAdmin: session?.role === 'owner' || session?.role === 'admin',
  }

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  )
}

/**
 * Hook to use tenant context
 */
export function useTenant() {
  const context = useContext(TenantContext)
  if (!context) {
    throw new Error('useTenant must be used within TenantProvider')
  }
  return context
}

/**
 * Hook to use only authentication
 */
export function useAuth() {
  const { session, logout, isLoggedIn, createSession } = useTenant()
  return { session, logout, isLoggedIn, createSession }
}

/**
 * Hook to check admin status
 */
export function useAdmin() {
  const { isSuperAdmin, isSystemAdmin, isOrgAdmin } = useTenant()
  return { isSuperAdmin, isSystemAdmin, isOrgAdmin }
}
