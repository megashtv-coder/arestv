/**
 * MultiTenantDebug.js - Utility for debugging multi-tenant issues
 *
 * Usage:
 *   import { MultiTenantDebug } from './utils/MultiTenantDebug'
 *   const debug = new MultiTenantDebug()
 *   debug.validateSession()
 *   debug.validateDataIsolation()
 */

export class MultiTenantDebug {
  /**
   * Validate current session
   */
  static validateSession() {
    const session = localStorage.getItem('arestv_session')
    const user = localStorage.getItem('arestv_user')

    console.group('[MultiTenant Debug] Session Validation')

    if (!session) {
      console.error('❌ No session found in localStorage')
      return false
    }

    try {
      const sessionObj = JSON.parse(session)
      console.log('✅ Session found:', {
        userId: sessionObj.userId,
        username: sessionObj.username,
        orgId: sessionObj.orgId,
        isSuperAdmin: sessionObj.isSuperAdmin,
        role: sessionObj.role,
        loginTime: new Date(sessionObj.loginTime).toLocaleString(),
        lastActivity: new Date(sessionObj.lastActivity).toLocaleString(),
      })

      if (!sessionObj.userId) {
        console.error('❌ Session missing userId')
        return false
      }

      if (sessionObj.isSuperAdmin && !sessionObj.isSuperAdmin === true) {
        console.warn('⚠️ Super admin role not properly set')
      }

      if (!sessionObj.isSuperAdmin && !sessionObj.orgId) {
        console.error('❌ Non-super-admin missing orgId')
        return false
      }

      console.log('✅ Session structure valid')
      console.groupEnd()
      return true
    } catch (error) {
      console.error('❌ Failed to parse session:', error)
      console.groupEnd()
      return false
    }
  }

  /**
   * Validate user in AppContext
   */
  static validateAppUser() {
    const user = localStorage.getItem('arestv_user')

    console.group('[MultiTenant Debug] App User Validation')

    if (!user) {
      console.error('❌ No user found in localStorage')
      console.groupEnd()
      return false
    }

    try {
      const userObj = JSON.parse(user)
      console.log('✅ User found:', {
        id: userObj.id,
        name: userObj.name,
        username: userObj.username,
        orgId: userObj.orgId,
        role: userObj.role,
        isSuperAdmin: userObj.isSuperAdmin,
      })

      if (!userObj.id) {
        console.error('❌ User missing id')
        return false
      }

      console.log('✅ User structure valid')
      console.groupEnd()
      return true
    } catch (error) {
      console.error('❌ Failed to parse user:', error)
      console.groupEnd()
      return false
    }
  }

  /**
   * Check data isolation - verify localStorage data structure
   */
  static validateDataStructure() {
    console.group('[MultiTenant Debug] Data Structure Validation')

    // Check invoices if available
    const invoicesStr = localStorage.getItem('arestv_invoices')
    if (invoicesStr) {
      try {
        const invoices = JSON.parse(invoicesStr)
        if (Array.isArray(invoices)) {
          const withOrgId = invoices.filter(i => i.orgId).length
          const withoutOrgId = invoices.filter(i => !i.orgId).length

          console.log(`📋 Invoices: ${withOrgId} with orgId, ${withoutOrgId} without (needs migration)`)

          if (withoutOrgId > 0) {
            console.warn(`⚠️ ${withoutOrgId} invoices missing orgId - data migration may be needed`)
          }
        }
      } catch (error) {
        console.error('Failed to parse invoices:', error)
      }
    }

    // Check customers
    const customersStr = localStorage.getItem('arestv_customers')
    if (customersStr) {
      try {
        const customers = JSON.parse(customersStr)
        if (Array.isArray(customers)) {
          const withOrgId = customers.filter(c => c.orgId).length
          const withoutOrgId = customers.filter(c => !c.orgId).length
          console.log(`👥 Customers: ${withOrgId} with orgId, ${withoutOrgId} without`)
        }
      } catch (error) {
        console.error('Failed to parse customers:', error)
      }
    }

    console.groupEnd()
  }

  /**
   * Test data isolation - simulate user access scenarios
   */
  static testDataIsolation(invoices, currentOrgId, isSuperAdmin) {
    console.group('[MultiTenant Debug] Data Isolation Test')

    if (!Array.isArray(invoices)) {
      console.error('❌ Invalid invoices data')
      console.groupEnd()
      return false
    }

    if (!isSuperAdmin && !currentOrgId) {
      console.error('❌ Regular user missing orgId')
      console.groupEnd()
      return false
    }

    const totalInvoices = invoices.length
    let visibleToUser = 0
    let isolationBreaches = 0

    invoices.forEach(invoice => {
      // Super admin sees everything
      if (isSuperAdmin) {
        visibleToUser++
        return
      }

      // Regular user sees:
      // 1. Invoices matching their org
      // 2. Invoices without orgId (backward compat during migration)
      if (invoice.orgId === currentOrgId || !invoice.orgId) {
        visibleToUser++
      } else {
        // This would be a data leak
        isolationBreaches++
      }
    })

    console.log(`📊 Data Isolation Results:`, {
      totalRecords: totalInvoices,
      visibleToUser: visibleToUser,
      userRole: isSuperAdmin ? 'Super Admin' : `Org User (${currentOrgId})`,
      isolationBreaches: isolationBreaches,
    })

    if (isolationBreaches > 0) {
      console.error(`❌ SECURITY ISSUE: ${isolationBreaches} records from other orgs are visible!`)
      console.groupEnd()
      return false
    }

    console.log('✅ Data isolation is properly enforced')
    console.groupEnd()
    return true
  }

  /**
   * Check if user should see OrgManager or regular app
   */
  static checkRoleBasedRouting() {
    console.group('[MultiTenant Debug] Role-Based Routing')

    const session = localStorage.getItem('arestv_session')
    if (!session) {
      console.error('❌ No session - user should see Login')
      console.groupEnd()
      return 'login'
    }

    try {
      const sessionObj = JSON.parse(session)

      if (sessionObj.isSuperAdmin === true) {
        console.log('✅ Super Admin → Should show OrgManager')
        console.groupEnd()
        return 'orgmanager'
      } else {
        console.log(`✅ Org User → Should show App Layout (${sessionObj.orgId})`)
        console.groupEnd()
        return 'applayout'
      }
    } catch (error) {
      console.error('❌ Failed to determine routing:', error)
      console.groupEnd()
      return 'error'
    }
  }

  /**
   * Full diagnostic report
   */
  static runFullDiagnostics() {
    console.clear()
    console.log('═'.repeat(60))
    console.log('MULTI-TENANT SYSTEM DIAGNOSTICS')
    console.log('═'.repeat(60))

    const sessionValid = this.validateSession()
    const userValid = this.validateAppUser()
    const route = this.checkRoleBasedRouting()

    this.validateDataStructure()

    console.group('[Summary]')
    console.log('Session Valid:', sessionValid ? '✅' : '❌')
    console.log('User Valid:', userValid ? '✅' : '❌')
    console.log('Expected Route:', route)

    if (sessionValid && userValid) {
      console.log('🟢 System Ready')
    } else {
      console.log('🔴 System has issues - check errors above')
    }
    console.groupEnd()

    console.log('═'.repeat(60))
  }

  /**
   * Log user permissions (requires context)
   */
  static logPermissions(session) {
    if (!session) {
      console.error('No session provided')
      return
    }

    console.group('[Permissions]')
    console.log('User:', session.username)
    console.log('Role:', session.role)
    console.log('Organization:', session.orgId)
    console.log('Super Admin:', session.isSuperAdmin ? 'YES' : 'NO')

    // Basic permission inference
    const perms = {
      canViewOrg: !session.isSuperAdmin,
      canManageUsers: session.role === 'owner' || session.role === 'admin',
      canManageInvoices: session.role !== 'viewer',
      canDeleteData: session.role === 'owner' || session.role === 'admin',
    }

    Object.entries(perms).forEach(([perm, allowed]) => {
      console.log(`  ${perm}: ${allowed ? '✅' : '❌'}`)
    })

    console.groupEnd()
  }
}

// Also export for React components
export const useDebug = () => ({
  validateSession: () => MultiTenantDebug.validateSession(),
  validateDataStructure: () => MultiTenantDebug.validateDataStructure(),
  checkRouting: () => MultiTenantDebug.checkRoleBasedRouting(),
  runDiagnostics: () => MultiTenantDebug.runFullDiagnostics(),
})
