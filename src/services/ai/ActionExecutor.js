/**
 * ActionExecutor.js
 * Turns an action descriptor from ActionRouter into a real change in app state.
 * generateAction() only builds a plain description of what should happen —
 * this is the step that actually persists it (e.g. creates the invoice).
 */

import { supabase } from '../../lib/supabase'

function generateNextInvoiceId(invoices = []) {
  let maxNum = 0
  invoices.forEach(inv => {
    const match = inv.id?.match(/INV-(\d+)/)
    if (match) {
      const num = parseInt(match[1], 10)
      if (num > maxNum) maxNum = num
    }
  })
  return `INV-${String(maxNum + 1).padStart(6, '0')}`
}

function extractMonths(desc) {
  if (!desc) return null
  const plusMatch = desc.match(/(\d+)\s*\+\s*(\d+)\s*muaj/i)
  if (plusMatch) return parseInt(plusMatch[1], 10) + parseInt(plusMatch[2], 10)
  const m = desc.match(/(\d+)\s*muaj/i)
  return m ? parseInt(m[1], 10) : null
}

// Parse a "YYYY-MM-DD" string as a local calendar date (not UTC midnight,
// which `new Date(str)` would give and which shifts by a day once formatted
// back through toISOString() in timezones ahead of UTC).
function parseISODate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

// Format a local Date as "YYYY-MM-DD" using local getters, not toISOString()
// (which converts to UTC and can roll the date back/forward by one day).
function toISODate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function calculateSubscriptionExpiry(baseDateStr, months) {
  const date = parseISODate(baseDateStr)
  const year = date.getFullYear()
  const month = date.getMonth()
  const day = date.getDate()

  let newMonth = month + months
  let newYear = year
  while (newMonth > 11) {
    newMonth -= 12
    newYear += 1
  }

  const expiryDate = new Date(newYear, newMonth, day)
  if (expiryDate.getMonth() !== newMonth) {
    expiryDate.setDate(0) // last day of previous month
  }
  return expiryDate
}

function executeCreateInvoice(params, appContext) {
  const { invoices = [], setInvoices, customers = [], logActivity } = appContext

  if (!params?.customer) {
    return { success: false, error: 'Mungon klienti për faturën.' }
  }
  if (!params?.amount) {
    return { success: false, error: 'Mungon shuma për faturën.' }
  }
  if (typeof setInvoices !== 'function') {
    return { success: false, error: 'Nuk mund të krijohet fatura (sistemi nuk është gati).' }
  }

  const custObj = customers.find(c => c.name === params.customer)
  const newId = generateNextInvoiceId(invoices)

  // An explicit expiry date always wins; otherwise derive it from the
  // package's duration (e.g. "12 muaj" -> +12 months from the invoice date).
  let subscriptionExpiry = params.subscriptionExpiry || ''
  let notifyDate = ''
  if (subscriptionExpiry) {
    const notifyD = parseISODate(subscriptionExpiry)
    notifyD.setDate(notifyD.getDate() - 7)
    notifyDate = toISODate(notifyD)
  } else {
    const months = extractMonths(params.items?.[0]?.desc)
    if (months) {
      const exp = calculateSubscriptionExpiry(params.date, months)
      subscriptionExpiry = toISODate(exp)
      const notifyD = new Date(exp)
      notifyD.setDate(notifyD.getDate() - 7)
      notifyDate = toISODate(notifyD)
    }
  }

  const invoice = {
    id: newId,
    date: params.date,
    customer: params.customer,
    referent: params.referent || '',
    country: custObj?.country || '',
    email: custObj?.email || '',
    amount: params.amount,
    due: params.due,
    subscriptionExpiry,
    notifyDate,
    status: params.status || 'pending',
    items: params.items?.length ? params.items : [{ desc: 'Shërbim', qty: 1, price: params.amount }],
    discount: null,
    comments: [],
  }

  setInvoices(prev => [invoice, ...prev])
  logActivity?.(`Krijoi faturën ${newId} — ${params.customer} €${params.amount} (AI)`, 'Faturat')

  return { success: true, invoice, message: `✓ Fatura ${newId} u krijua me sukses!` }
}

// Same palette used by the manual "add customer" forms (Customers.jsx,
// InvoiceModal.jsx's QuickAddCustomer) — kept in sync manually since neither
// exports it as a shared constant.
const CUST_COLORS = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626', '#0891b2', '#be185d', '#0f766e']

function splitName(fullName) {
  const parts = fullName.trim().split(/\s+/)
  return { firstName: parts[0] || '', lastName: parts.slice(1).join(' ') }
}

function executeCreateCustomer(params, appContext) {
  const { customers = [], setCustomers, representatives = [], setRepresentatives, logActivity } = appContext

  if (!params?.name) {
    return { success: false, error: 'Mungon emri i klientit.' }
  }
  if (typeof setCustomers !== 'function') {
    return { success: false, error: 'Nuk mund të krijohet klienti (sistemi nuk është gati).' }
  }
  if (customers.some(c => c.name.toLowerCase() === params.name.toLowerCase())) {
    return { success: false, error: `Klienti "${params.name}" ekziston tashmë.` }
  }

  const { firstName, lastName } = splitName(params.name)
  const customer = {
    id: `CUS-AI-${Date.now()}`,
    name: params.name,
    firstName,
    lastName,
    phone: params.phone || '',
    email: params.email || '',
    country: params.country || '',
    app: params.app || '',
    macAddress: params.macAddress || '',
    username: '',
    panel: '',
    referredBy: params.referent || '',
    type: 'individual',
    color: CUST_COLORS[customers.length % CUST_COLORS.length],
    total: 0,
    invoices: 0,
  }

  setCustomers(prev => [...prev, customer])

  if (params.referent && typeof setRepresentatives === 'function' && !representatives.includes(params.referent)) {
    setRepresentatives(prev => [...prev, params.referent])
  }

  logActivity?.(`Shtoi klientin ${params.name} (AI)`, 'Klientët')

  return { success: true, customer, message: `✓ Klienti ${params.name} u shtua me sukses!` }
}

// Tasks aren't part of AppContext (Tasks.jsx owns its own local state, loaded
// straight from Supabase on mount) — so unlike the other execute* functions
// above, this one writes directly to Supabase instead of going through a
// setXxx from appContext. Tasks.jsx picks it up next time it loads.
async function executeCreateTask(params, appContext) {
  const { logActivity } = appContext

  if (!params?.customer) {
    return { success: false, error: 'Mungon klienti për detyrën.' }
  }
  if (!params?.description) {
    return { success: false, error: 'Mungon përshkrimi i detyrës.' }
  }

  const reminderDate = params.reminderDate || toISODate(new Date())
  const newId = `TSK-${Date.now()}`

  const { error } = await supabase.from('tasks').insert([{
    id: newId,
    customer: params.customer,
    description: params.description,
    completed: false,
    reminderdate: reminderDate,
  }])

  if (error) {
    console.error('[ActionExecutor] Task insert error:', error)
    return { success: false, error: 'Nuk mund të krijohet detyra: ' + (error.message || 'gabim i panjohur') }
  }

  logActivity?.(`Krijoi detyrën për ${params.customer} (AI)`, 'Detyrat')

  const [y, m, d] = reminderDate.split('-')
  return {
    success: true,
    message: `✓ Detyra u krijua për ${params.customer} — ${d}/${m}/${y}`,
  }
}

// Find the invoice a payment should apply against: the explicit invoiceId if
// given, otherwise the customer's oldest unpaid (not draft/paid) invoice.
function findTargetInvoice(params, invoices) {
  if (params.invoiceId) {
    return invoices.find(i => i.id === params.invoiceId) || null
  }
  if (params.customer) {
    const unpaid = invoices
      .filter(i => i.customer === params.customer && i.status !== 'paid' && i.status !== 'draft')
      .sort((a, b) => new Date(a.date) - new Date(b.date))
    return unpaid[0] || null
  }
  return null
}

function executeRegisterPayment(params, appContext) {
  const { invoices = [], setInvoices, setPayments, setExpenses, logActivity, currentOrgId } = appContext

  if (!params?.amount) {
    return { success: false, error: 'Mungon shuma e pagesës.' }
  }
  if (typeof setInvoices !== 'function' || typeof setPayments !== 'function') {
    return { success: false, error: 'Nuk mund të regjistrohet pagesa (sistemi nuk është gati).' }
  }

  const targetInvoice = findTargetInvoice(params, invoices)
  if (!targetInvoice) {
    return {
      success: false,
      error: params.customer
        ? `${params.customer} nuk ka fatura të papaguara.`
        : 'Nuk u gjet fatura për këtë pagesë.',
    }
  }

  const fee = params.fee || 0
  const net = params.amount - fee
  const newId = `PAY-${Date.now()}`

  const payment = {
    id: newId,
    invoiceId: targetInvoice.id,
    customer: targetInvoice.customer,
    amount: params.amount,
    fee,
    net,
    date: params.date,
    paidDate: params.date,
    method: params.mode || 'Unknown',
    depositAccount: '',
    reference: '',
    depositedTo: params.depositedTo || '',
    notes: '',
    orgId: currentOrgId,
  }

  setPayments(prev => [payment, ...prev])

  setInvoices(prev => prev.map(i => {
    if (i.id !== targetInvoice.id) return i
    const newPaidAmount = (i.paidAmount || 0) + params.amount
    let status = 'pending'
    if (newPaidAmount >= i.amount) status = 'paid'
    else if (newPaidAmount > 0) status = 'partial'
    const updates = { ...i, paidAmount: newPaidAmount, status }
    if (status === 'paid' && !i.paidDate) updates.paidDate = params.date
    return updates
  }))

  // Mirrors PaymentModal.jsx: a transaction fee is also booked as an expense
  if (fee > 0 && typeof setExpenses === 'function') {
    setExpenses(prev => [{
      id: `EXP-${Date.now() + 1}`,
      date: params.date,
      type: 'Pagesa tjera',
      vendor: params.mode || 'Unknown',
      paidFrom: '',
      reference: `Fee transaksioni — ${params.mode || 'Unknown'} (${targetInvoice.id})`,
      paidBy: params.depositedTo || '',
      recurring: false,
      recurringFreq: '',
      amount: fee,
      orgId: currentOrgId,
    }, ...prev])
  }

  logActivity?.(`Regjistroi pagesën ${newId} — ${targetInvoice.customer} €${params.amount} (AI)`, 'Pagesat')

  return {
    success: true,
    payment,
    invoice: targetInvoice,
    message: `✓ Pagesa u regjistrua! Neto: €${net} — Fatura ${targetInvoice.id} (${targetInvoice.customer})`,
  }
}

function executeRegisterExpense(params, appContext) {
  const { setExpenses, logActivity, currentOrgId } = appContext

  if (!params?.amount) {
    return { success: false, error: 'Mungon shuma e shpenzimit.' }
  }
  if (!params?.type) {
    return { success: false, error: 'Mungon lloji i shpenzimit.' }
  }
  if (typeof setExpenses !== 'function') {
    return { success: false, error: 'Nuk mund të regjistrohet shpenzimi (sistemi nuk është gati).' }
  }

  const newId = `EXP-${Date.now()}`
  const expense = {
    id: newId,
    date: params.date,
    type: params.type,
    vendor: params.vendor || '',
    paidFrom: params.paidFrom || '',
    reference: params.description || '',
    paidBy: params.paidBy || 'Enndy',
    recurring: false,
    recurringFreq: 'Mujore',
    amount: params.amount,
    orgId: currentOrgId,
  }

  setExpenses(prev => [expense, ...prev])
  logActivity?.(`Regjistroi shpenzimin ${newId} — ${params.type} €${params.amount} (AI)`, 'Shpenzimet')

  return { success: true, expense, message: `✓ Shpenzimi u regjistrua! ${params.type} — €${params.amount}` }
}

/**
 * Execute an action descriptor produced by ActionRouter.generateAction()
 * @param {Object} action - {action, type, operation, parameters}
 * @param {Object} appContext - App context from useApp()
 * @returns {Promise<{success: boolean, message?: string, error?: string, [key: string]: any}>}
 */
export async function executeAction(action, appContext) {
  if (!action) {
    return { success: false, error: 'Nuk ka veprim për të ekzekutuar.' }
  }

  switch (action.action) {
    case 'create_invoice':
      return executeCreateInvoice(action.parameters, appContext)
    case 'create_customer':
      return executeCreateCustomer(action.parameters, appContext)
    case 'create_task':
      return executeCreateTask(action.parameters, appContext)
    case 'register_payment':
      return executeRegisterPayment(action.parameters, appContext)
    case 'register_expense':
      return executeRegisterExpense(action.parameters, appContext)
    default:
      return {
        success: false,
        error: `Ky veprim (${action.action}) nuk mbështetet ende nga asistenti.`,
      }
  }
}
