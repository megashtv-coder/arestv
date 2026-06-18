/**
 * AuthService: Authentication & Session Management
 *
 * Responsibilities:
 * - Credential validation
 * - Session lifecycle (login/logout/refresh)
 * - User context management
 * - Multi-tenant aware auth
 */

class AuthService {
  constructor(userStore, tenantService) {
    this.userStore = userStore || []
    this.tenantService = tenantService
    this.currentSession = null
    this.sessionTimeout = 30 * 60 * 1000 // 30 minutes
    this.refreshTimer = null
  }

  /**
   * Authenticate user and establish session
   * @param {string} username
   * @param {string} password
   * @returns {Promise<{user, org, session, permissions}>}
   */
  async login(username, password) {
    try {
      // Find user in store
      const user = this.userStore.find(
        (u) =>
          u.username.toLowerCase() === username.trim().toLowerCase() &&
          u.password === password &&
          u.active !== false
      )

      if (!user) {
        throw new Error('Invalid credentials')
      }

      // Load org context
      let org = null
      if (!user.isSuperAdmin) {
        org = await this.tenantService.getOrganization(user.orgId)
        if (!org || org.status !== 'active') {
          throw new Error('Organization is not active')
        }
      }

      // Create session
      const session = {
        id: this._generateSessionId(),
        userId: user.id,
        username: user.username,
        orgId: user.orgId,
        isSuperAdmin: user.isSuperAdmin,
        role: user.role,
        loginTime: Date.now(),
        lastActivity: Date.now(),
      }

      this.currentSession = session
      this._startSessionRefreshTimer()
      this._persistSession(session)

      return {
        user: this._sanitizeUser(user),
        org: org,
        session: session,
        permissions: this._computePermissions(user, org),
      }
    } catch (error) {
      console.error('[AuthService] Login failed:', error)
      throw error
    }
  }

  /**
   * Logout and destroy session
   */
  async logout() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer)
    }
    this.currentSession = null
    localStorage.removeItem('arestv_session')
    localStorage.removeItem('arestv_user')
  }

  /**
   * Get current session
   * @returns {object|null}
   */
  getSession() {
    if (!this.currentSession) {
      const stored = localStorage.getItem('arestv_session')
      if (stored) {
        try {
          this.currentSession = JSON.parse(stored)
          this._startSessionRefreshTimer()
        } catch (e) {
          return null
        }
      }
    }
    return this.currentSession
  }

  /**
   * Validate session is still active
   * @returns {boolean}
   */
  isSessionValid() {
    const session = this.getSession()
    if (!session) return false

    const now = Date.now()
    const inactivityTime = now - session.lastActivity

    // Session expires after 30 minutes of inactivity
    if (inactivityTime > this.sessionTimeout) {
      this.logout()
      return false
    }

    return true
  }

  /**
   * Update session activity timestamp
   */
  updateActivity() {
    const session = this.getSession()
    if (session) {
      session.lastActivity = Date.now()
      this._persistSession(session)
    }
  }

  /**
   * Verify user is authenticated
   * @returns {boolean}
   */
  isAuthenticated() {
    return this.isSessionValid()
  }

  /**
   * Get current user from session
   * @returns {object|null}
   */
  getCurrentUser() {
    const session = this.getSession()
    return session ? this.userStore.find((u) => u.id === session.userId) : null
  }

  /**
   * Get current organization
   * @returns {object|null}
   */
  getCurrentOrg() {
    const session = this.getSession()
    return session && !session.isSuperAdmin
      ? this.tenantService.getOrganization(session.orgId)
      : null
  }

  /**
   * Check if user is super admin
   * @returns {boolean}
   */
  isSuperAdmin() {
    const session = this.getSession()
    return session?.isSuperAdmin === true
  }

  /**
   * Switch organization context (if user is member of multiple orgs)
   * @param {string} orgId
   * @returns {Promise<object>}
   */
  async switchOrganization(orgId) {
    const session = this.getSession()
    if (!session) throw new Error('No active session')

    const user = this.getCurrentUser()
    if (!user || user.isSuperAdmin) {
      throw new Error('Cannot switch org for super admin')
    }

    // Verify user is member of target org
    if (user.orgId !== orgId) {
      throw new Error('User is not a member of this organization')
    }

    // Update session
    session.orgId = orgId
    session.lastActivity = Date.now()
    this._persistSession(session)

    const org = await this.tenantService.getOrganization(orgId)
    return {
      org,
      permissions: this._computePermissions(user, org),
    }
  }

  // ───────────────────────────── Private Helpers ─────────────────────────────

  _generateSessionId() {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  _persistSession(session) {
    localStorage.setItem('arestv_session', JSON.stringify(session))
  }

  _startSessionRefreshTimer() {
    if (this.refreshTimer) clearInterval(this.refreshTimer)
    this.refreshTimer = setInterval(() => {
      this.updateActivity()
    }, 5 * 60 * 1000) // Update every 5 minutes
  }

  _sanitizeUser(user) {
    const { password, ...safe } = user
    return safe
  }

  _computePermissions(user, org) {
    // Computed by RoleManager/PermissionMatrix
    // This is a stub
    return {
      canViewOrg: !user.isSuperAdmin,
      canManageUsers: user.role === 'owner' || user.role === 'admin',
      canManageInvoices: user.role !== 'viewer',
    }
  }
}

export default AuthService
