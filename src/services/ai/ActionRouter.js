/**
 * ActionRouter.js
 * Generates structured action objects based on intent and extracted entities
 */

import { getPriceFromPackage } from './EntityExtractor'

/**
 * Generate action object from intent and entities
 * @param {string} intent - Detected intent
 * @param {Object} entities - Extracted entities
 * @param {Object} context - App context
 * @returns {Object} - {success: boolean, action: Object, error: ?}
 */
export function generateAction(intent, entities, context = {}) {
  try {
    let action = null

    switch (intent) {
      // Invoice Operations
      case 'CREATE_INVOICE':
        action = generateCreateInvoice(entities, context)
        break
      case 'EDIT_INVOICE':
        action = generateEditInvoice(entities, context)
        break
      case 'DELETE_INVOICE':
        action = generateDeleteInvoice(entities, context)
        break
      case 'LIST_INVOICES':
        action = generateListInvoices(entities, context)
        break
      case 'GET_INVOICE':
        action = generateGetInvoice(entities, context)
        break
      case 'MARK_PAID':
        action = generateMarkPaid(entities, context)
        break
      case 'VOID_INVOICE':
        action = generateVoidInvoice(entities, context)
        break

      // Customer Operations
      case 'CREATE_CUSTOMER':
        action = generateCreateCustomer(entities, context)
        break
      case 'EDIT_CUSTOMER':
        action = generateEditCustomer(entities, context)
        break
      case 'DELETE_CUSTOMER':
        action = generateDeleteCustomer(entities, context)
        break
      case 'LIST_CUSTOMERS':
        action = generateListCustomers(entities, context)
        break
      case 'RENEW_CUSTOMER':
        action = generateRenewCustomer(entities, context)
        break
      case 'CREATE_TASK':
        action = generateCreateTask(entities, context)
        break

      // Payment Operations
      case 'REGISTER_PAYMENT':
        action = generateRegisterPayment(entities, context)
        break
      case 'DELETE_PAYMENT':
        action = generateDeletePayment(entities, context)
        break
      case 'LIST_PAYMENTS':
        action = generateListPayments(entities, context)
        break

      // Expense Operations
      case 'REGISTER_EXPENSE':
        action = generateRegisterExpense(entities, context)
        break
      case 'DELETE_EXPENSE':
        action = generateDeleteExpense(entities, context)
        break
      case 'LIST_EXPENSES':
        action = generateListExpenses(entities, context)
        break

      // Reporting
      case 'MONTHLY_SUMMARY':
        action = generateMonthlySummary(entities, context)
        break
      case 'PROFIT_REPORT':
        action = generateProfitReport(entities, context)
        break
      case 'PARTNER_BALANCE':
        action = generatePartnerBalance(entities, context)
        break
      case 'INCOME_REPORT':
        action = generateIncomeReport(entities, context)
        break
      case 'OVERDUE_REPORT':
        action = generateOverdueReport(entities, context)
        break

      // Organization
      case 'SWITCH_ORGANIZATION':
        action = generateSwitchOrganization(entities, context)
        break
      case 'UNDO_ACTION':
        action = generateUndoAction(entities, context)
        break

      // Quick Commands
      case 'QUICK_INVOICE_CUSTOMER':
        action = generateCreateInvoice(entities, context)
        break
      case 'ADD_CUSTOMER_QUICK':
        action = generateCreateCustomer(entities, context)
        break

      default:
        throw new Error(`Unknown intent: ${intent}`)
    }

    return {
      success: true,
      action,
    }
  } catch (err) {
    return {
      success: false,
      error: {
        code: 'ACTION_GENERATION_ERROR',
        message: err.message,
      },
    }
  }
}

// ════════════════════════════════════════
// Invoice Actions
// ════════════════════════════════════════

function generateCreateInvoice(entities, context) {
  const price = entities.amount || getPriceFromPackage(entities.package, context.items) || 0
  const today = new Date().toISOString().slice(0, 10)
  const dueDate = new Date(new Date().setDate(new Date().getDate() + 7)).toISOString().slice(0, 10)

  return {
    action: 'create_invoice',
    type: 'INVOICE',
    operation: 'CREATE',
    parameters: {
      customer: entities.customer,
      referent: entities.referent || '',
      amount: price,
      date: entities.date || today,
      due: entities.dueDate || dueDate,
      subscriptionExpiry: entities.subscriptionExpiry || null,
      status: 'pending',
      items: entities.package ? [
        {
          desc: entities.package.display || `${entities.package.duration} subscription`,
          qty: 1,
          price: price,
        },
      ] : [],
    },
  }
}

function generateEditInvoice(entities, context) {
  return {
    action: 'edit_invoice',
    type: 'INVOICE',
    operation: 'EDIT',
    parameters: {
      invoiceId: entities.invoiceId,
      updates: {
        customer: entities.customer,
        amount: entities.amount,
        date: entities.date,
        status: entities.status,
      },
    },
  }
}

function generateDeleteInvoice(entities, context) {
  return {
    action: 'delete_invoice',
    type: 'INVOICE',
    operation: 'DELETE',
    parameters: {
      invoiceId: entities.invoiceId,
    },
  }
}

function generateListInvoices(entities, context) {
  return {
    action: 'list_invoices',
    type: 'INVOICE',
    operation: 'LIST',
    parameters: {
      filters: {
        status: entities.status,
        customer: entities.customer,
        period: entities.period,
      },
    },
  }
}

function generateGetInvoice(entities, context) {
  return {
    action: 'get_invoice',
    type: 'INVOICE',
    operation: 'READ',
    parameters: {
      invoiceId: entities.invoiceId,
    },
  }
}

function generateMarkPaid(entities, context) {
  return {
    action: 'mark_paid',
    type: 'INVOICE',
    operation: 'UPDATE_STATUS',
    parameters: {
      invoiceId: entities.invoiceId,
      status: 'paid',
      payment: entities.amount ? {
        amount: entities.amount,
        mode: entities.paymentMode || 'Unknown',
        date: entities.date || new Date().toISOString().slice(0, 10),
      } : null,
    },
  }
}

function generateVoidInvoice(entities, context) {
  return {
    action: 'void_invoice',
    type: 'INVOICE',
    operation: 'UPDATE_STATUS',
    parameters: {
      invoiceId: entities.invoiceId,
      status: 'void',
    },
  }
}

// ════════════════════════════════════════
// Customer Actions
// ════════════════════════════════════════

function generateCreateCustomer(entities, context) {
  return {
    action: 'create_customer',
    type: 'CUSTOMER',
    operation: 'CREATE',
    parameters: {
      name: entities.customer,
      phone: entities.phone || '',
      email: entities.email || '',
      country: entities.country || '',
      referent: entities.referent || '',
      app: entities.app || '',
      macAddress: entities.macAddress || '',
    },
  }
}

function generateCreateTask(entities, context) {
  return {
    action: 'create_task',
    type: 'TASK',
    operation: 'CREATE',
    parameters: {
      customer: entities.customer,
      description: entities.description,
      reminderDate: entities.reminderDate || '',
    },
  }
}

function generateEditCustomer(entities, context) {
  return {
    action: 'edit_customer',
    type: 'CUSTOMER',
    operation: 'EDIT',
    parameters: {
      name: entities.customer,
      updates: {
        phone: entities.phone,
        email: entities.email,
        country: entities.country,
      },
    },
  }
}

function generateDeleteCustomer(entities, context) {
  return {
    action: 'delete_customer',
    type: 'CUSTOMER',
    operation: 'DELETE',
    parameters: {
      name: entities.customer,
    },
  }
}

function generateListCustomers(entities, context) {
  return {
    action: 'list_customers',
    type: 'CUSTOMER',
    operation: 'LIST',
    parameters: {
      filters: {},
    },
  }
}

function generateRenewCustomer(entities, context) {
  const price = entities.amount || getPriceFromPackage(entities.package, context.items) || 100

  return {
    action: 'renew_customer',
    type: 'CUSTOMER',
    operation: 'RENEW',
    parameters: {
      customer: entities.customer,
      newInvoice: {
        amount: price,
        package: entities.package,
      },
    },
  }
}

// ════════════════════════════════════════
// Payment Actions
// ════════════════════════════════════════

function generateRegisterPayment(entities, context) {
  return {
    action: 'register_payment',
    type: 'PAYMENT',
    operation: 'CREATE',
    parameters: {
      invoiceId: entities.invoiceId || null,
      customer: entities.customer || null,
      amount: entities.amount,
      fee: entities.fee || 0,
      mode: entities.paymentMode || 'Unknown',
      date: entities.date || new Date().toISOString().slice(0, 10),
      depositedTo: entities.depositedTo || '',
    },
  }
}

function generateDeletePayment(entities, context) {
  return {
    action: 'delete_payment',
    type: 'PAYMENT',
    operation: 'DELETE',
    parameters: {
      invoiceId: entities.invoiceId,
    },
  }
}

function generateListPayments(entities, context) {
  return {
    action: 'list_payments',
    type: 'PAYMENT',
    operation: 'LIST',
    parameters: {
      filters: {
        customer: entities.customer,
        period: entities.period,
      },
    },
  }
}

// ════════════════════════════════════════
// Expense Actions
// ════════════════════════════════════════

function generateRegisterExpense(entities, context) {
  return {
    action: 'register_expense',
    type: 'EXPENSE',
    operation: 'CREATE',
    parameters: {
      amount: entities.amount,
      type: entities.category,
      vendor: entities.vendor || '',
      paidFrom: entities.paidFrom || '',
      paidBy: entities.paidBy || '',
      date: entities.date || new Date().toISOString().slice(0, 10),
      description: entities.description || '',
    },
  }
}

function generateDeleteExpense(entities, context) {
  return {
    action: 'delete_expense',
    type: 'EXPENSE',
    operation: 'DELETE',
    parameters: {
      expenseId: entities.expenseId,
    },
  }
}

function generateListExpenses(entities, context) {
  return {
    action: 'list_expenses',
    type: 'EXPENSE',
    operation: 'LIST',
    parameters: {
      filters: {
        category: entities.category,
        vendor: entities.vendor,
        period: entities.period,
      },
    },
  }
}

// ════════════════════════════════════════
// Reporting Actions
// ════════════════════════════════════════

function generateMonthlySummary(entities, context) {
  const period = entities.period || getCurrentMonth()

  return {
    action: 'monthly_summary',
    type: 'REPORT',
    operation: 'READ',
    parameters: {
      month: period.month,
      year: period.year,
    },
  }
}

function generateProfitReport(entities, context) {
  const period = entities.period || getCurrentMonth()

  return {
    action: 'profit_report',
    type: 'REPORT',
    operation: 'READ',
    parameters: {
      month: period.month,
      year: period.year,
    },
  }
}

function generatePartnerBalance(entities, context) {
  return {
    action: 'partner_balance',
    type: 'REPORT',
    operation: 'READ',
    parameters: {
      customer: entities.customer,
      vendor: entities.vendor,
    },
  }
}

function generateIncomeReport(entities, context) {
  const period = entities.period || getCurrentMonth()

  return {
    action: 'income_report',
    type: 'REPORT',
    operation: 'READ',
    parameters: {
      month: period.month,
      year: period.year,
    },
  }
}

function generateOverdueReport(entities, context) {
  return {
    action: 'overdue_report',
    type: 'REPORT',
    operation: 'READ',
    parameters: {},
  }
}

// ════════════════════════════════════════
// Organization Actions
// ════════════════════════════════════════

function generateSwitchOrganization(entities, context) {
  return {
    action: 'switch_organization',
    type: 'ORGANIZATION',
    operation: 'SWITCH',
    parameters: {
      organization: entities.organization,
    },
  }
}

function generateUndoAction(entities, context) {
  return {
    action: 'undo_action',
    type: 'SYSTEM',
    operation: 'UNDO',
    parameters: {},
  }
}

// ════════════════════════════════════════
// Helpers
// ════════════════════════════════════════

function getCurrentMonth() {
  const now = new Date()
  return {
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  }
}
