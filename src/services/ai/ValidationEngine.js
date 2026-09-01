/**
 * ValidationEngine.js
 * Validates extracted entities and determines if all required data is present
 */

import { getPriceFromPackage } from './EntityExtractor'

export class ValidationError extends Error {
  constructor(code, message, field = null, suggestion = null) {
    super(message)
    this.code = code
    this.field = field
    this.suggestion = suggestion
  }
}

/**
 * Validate action and entities
 * @param {string} intent - The intent/action
 * @param {Object} entities - Extracted entities
 * @param {Object} context - App context (customers, items, etc.)
 * @returns {Object} - {valid: boolean, errors: [], missingFields: [], followUpQuestion: string}
 */
export function validateAction(intent, entities, context = {}) {
  const errors = []
  const missingFields = []

  // If a package/product was selected but no explicit price was given,
  // default the amount to that package's own configured price.
  if (!entities.amount && entities.package) {
    const packagePrice = getPriceFromPackage(entities.package, context.items || [])
    if (packagePrice) {
      entities.amount = packagePrice
    }
  }

  // Get required fields for this intent
  const requirements = getRequirements(intent)

  // Check each required field
  for (const field of requirements.required) {
    if (!entities[field]) {
      missingFields.push(field)
    }
  }

  // REGISTER_PAYMENT needs a way to identify the target invoice — either an
  // explicit invoiceId, or a customer name (whose oldest unpaid invoice is
  // used instead), so neither is individually required but at least one must
  // be present.
  if (intent === 'REGISTER_PAYMENT' && !entities.invoiceId && !entities.customer) {
    missingFields.push('customer')
  }

  // VOID_INVOICE: same dual-identifier shape as REGISTER_PAYMENT — either an
  // explicit invoiceId, or a customer name (whose most recent unpaid invoice
  // gets voided instead).
  if (intent === 'VOID_INVOICE' && !entities.invoiceId && !entities.customer) {
    missingFields.push('customer')
  }

  // Validate specific fields
  try {
    validateEntities(intent, entities, context)
  } catch (err) {
    errors.push({
      code: err.code,
      message: err.message,
      field: err.field,
      suggestion: err.suggestion,
    })
  }

  // Generate follow-up question if fields are missing
  let followUpQuestion = null
  if (missingFields.length > 0) {
    followUpQuestion = generateFollowUpQuestion(intent, entities, missingFields, context)
  }

  return {
    valid: missingFields.length === 0 && errors.length === 0,
    errors,
    missingFields,
    followUpQuestion,
    requirements,
  }
}

/**
 * Get required and optional fields for each intent
 */
function getRequirements(intent) {
  const requirements = {
    CREATE_INVOICE: {
      required: ['customer', 'amount'],
      optional: ['date', 'package', 'category', 'referent', 'subscriptionExpiry'],
    },
    QUICK_INVOICE_CUSTOMER: {
      required: ['customer', 'amount'],
      optional: ['date', 'package', 'referent', 'subscriptionExpiry'],
    },
    EDIT_INVOICE: {
      required: ['invoiceId'],
      optional: ['customer', 'amount', 'date', 'status'],
    },
    DELETE_INVOICE: {
      required: ['invoiceId'],
      optional: [],
    },
    LIST_INVOICES: {
      required: [],
      optional: ['status', 'customer', 'period'],
    },
    GET_INVOICE: {
      required: ['invoiceId'],
      optional: [],
    },
    MARK_PAID: {
      required: ['invoiceId'],
      optional: ['amount', 'paymentMode', 'date'],
    },
    VOID_INVOICE: {
      // "void @Klienti" voids their most recent unpaid invoice — invoiceId
      // stays a valid alternative for "void FATURA-ID" style, so neither is
      // individually required (see the dual-identifier check below, same
      // pattern as REGISTER_PAYMENT).
      required: [],
      optional: ['invoiceId', 'customer'],
    },
    CREATE_CUSTOMER: {
      required: ['customer'],
      optional: ['phone', 'email', 'country', 'referent', 'app', 'macAddress'],
    },
    EDIT_CUSTOMER: {
      required: ['customer'],
      optional: ['phone', 'email', 'country'],
    },
    DELETE_CUSTOMER: {
      required: ['customer'],
      optional: [],
    },
    LIST_CUSTOMERS: {
      required: [],
      optional: [],
    },
    RENEW_CUSTOMER: {
      required: ['customer'],
      optional: ['package', 'amount'],
    },
    CREATE_TASK: {
      required: ['customer', 'description'],
      optional: ['reminderDate'],
    },
    REGISTER_PAYMENT: {
      required: ['amount'],
      optional: ['invoiceId', 'customer', 'paymentMode', 'date', 'fee', 'depositedTo'],
    },
    DELETE_PAYMENT: {
      required: ['invoiceId'],
      optional: [],
    },
    LIST_PAYMENTS: {
      required: [],
      optional: ['period', 'customer'],
    },
    REGISTER_EXPENSE: {
      required: ['amount', 'category'],
      optional: ['vendor', 'date', 'description'],
    },
    DELETE_EXPENSE: {
      required: [],
      optional: [],
    },
    LIST_EXPENSES: {
      required: [],
      optional: ['category', 'vendor', 'period'],
    },
    MONTHLY_SUMMARY: {
      required: [],
      optional: ['period'],
    },
    PROFIT_REPORT: {
      required: [],
      optional: ['period'],
    },
    PARTNER_BALANCE: {
      required: [],
      optional: ['customer', 'vendor'],
    },
    INCOME_REPORT: {
      required: [],
      optional: ['period'],
    },
    OVERDUE_REPORT: {
      required: [],
      optional: [],
    },
    SWITCH_ORGANIZATION: {
      required: [],
      optional: ['organization'],
    },
    UNDO_ACTION: {
      required: [],
      optional: [],
    },
    SEARCH: {
      required: ['query'],
      optional: [],
    },
  }

  return requirements[intent] || { required: [], optional: [] }
}

/**
 * Validate entity values
 */
function validateEntities(intent, entities, context = {}) {
  // Validate customer exists or can be created
  if (entities.customer && context.customers) {
    const exists = context.customers.some(
      c => c.name.toLowerCase() === entities.customer.toLowerCase()
    )

    if (!exists) {
      // Check if it's a new customer creation intent
      if (!intent.includes('CREATE') && !intent.includes('NEW')) {
        throw new ValidationError(
          'CUSTOMER_NOT_FOUND',
          `Klient i panjohur: ${entities.customer}`,
          'customer',
          `Dëshiron të krijohet klient i ri "${entities.customer}"?`
        )
      }
    }
  }

  // Validate amount is positive
  if (entities.amount !== null && entities.amount !== undefined) {
    if (typeof entities.amount !== 'number' || entities.amount <= 0) {
      throw new ValidationError(
        'INVALID_AMOUNT',
        'Shuma duhet të jetë më e madhe se 0',
        'amount'
      )
    }
  }

  // Validate invoice exists
  if (entities.invoiceId && context.invoices) {
    const exists = context.invoices.some(i => i.id === entities.invoiceId)
    if (!exists) {
      throw new ValidationError(
        'INVOICE_NOT_FOUND',
        `Fatura nuk ekziston: ${entities.invoiceId}`,
        'invoiceId'
      )
    }
  }

  // Validate date format
  if (entities.date && !isValidDate(entities.date)) {
    throw new ValidationError(
      'INVALID_DATE',
      'Data nuk është e vlefshme',
      'date'
    )
  }

  // Validate payment doesn't exceed invoice amount
  if (entities.amount && entities.invoiceId && context.invoices) {
    const invoice = context.invoices.find(i => i.id === entities.invoiceId)
    if (invoice && entities.amount > invoice.amount) {
      throw new ValidationError(
        'PAYMENT_EXCEEDS_INVOICE',
        `Pagesa (€${entities.amount}) nuk mund të jetë më e madhe se shuma e faturës (€${invoice.amount})`,
        'amount'
      )
    }
  }
}

/**
 * Check if date string is valid
 */
function isValidDate(dateStr) {
  if (typeof dateStr !== 'string') return false
  const date = new Date(dateStr)
  return date instanceof Date && !isNaN(date)
}

/**
 * Generate follow-up question to ask user for missing fields
 */
function generateFollowUpQuestion(intent, entities, missingFields, context = {}) {
  if (missingFields.length === 0) return null

  const field = missingFields[0] // Ask for first missing field

  const questions = {
    customer: 'Për cilin klient?',
    amount: 'Sa është shuma?',
    package: 'Cila paketë? (1, 3, 6 apo 12 muaj)',
    category: 'Cila është kategoria?',
    vendor: 'Cili është furnitori?',
    invoiceId: 'Cila faturë?',
    paymentMode: 'Si pagoi? (PayPal, Transfer, Kesh, etj.)',
    phone: 'Cili është numri i telefonit?',
    email: 'Cili është emaili?',
    query: 'Çfarë të kërkosh?',
    period: 'Për cilin muaj?',
    description: 'Çfarë duhet të bësh?',
  }

  return questions[field] || `Çfarë është ${field}?`
}

/**
 * Auto-correct common typos and variations
 */
export function autoCorrect(text, context = {}) {
  if (!text || typeof text !== 'string') return text

  // Skip: the quick "add customer" comma command carries literal free-text
  // field values (name, phone, country, referent, app, MAC) that must never
  // be rewritten — e.g. a name containing "Klienti" would otherwise get
  // silently corrupted by the /\bklienti\b/gi -> 'klient' correction below.
  if (/^\s*shto\b/i.test(text) && text.includes(',')) return text

  // Common replacements
  const corrections = [
    [/\bfacturë\b/gi, 'faturë'],
    [/\bklienti\b/gi, 'klient'],
    [/\bmmadhesi\b/gi, 'madhësi'],
    [/\bpagesje\b/gi, 'pagese'],
    [/\bshpenzje\b/gi, 'shpenzim'],
    [/\bkrahasim\b/gi, 'krahasim'],
  ]

  let corrected = text
  for (const [pattern, replacement] of corrections) {
    corrected = corrected.replace(pattern, replacement)
  }

  return corrected
}

/**
 * Suggest customer name if similar one exists
 */
export function suggestCustomer(input, customers = []) {
  if (!input || input.length < 2) return null

  const inputLower = input.toLowerCase()

  // Exact match
  const exact = customers.find(c => c.name.toLowerCase() === inputLower)
  if (exact) return exact.name

  // Partial match
  const partial = customers.find(c =>
    c.name.toLowerCase().includes(inputLower) ||
    inputLower.includes(c.name.toLowerCase())
  )
  if (partial) return partial.name

  // Levenshtein distance for typos
  const closest = customers
    .map(c => ({
      name: c.name,
      distance: levenshteinDistance(inputLower, c.name.toLowerCase()),
    }))
    .filter(c => c.distance <= 2)
    .sort((a, b) => a.distance - b.distance)[0]

  return closest ? closest.name : null
}

/**
 * Calculate Levenshtein distance (for typo detection)
 */
function levenshteinDistance(a, b) {
  const matrix = []

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i]
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }

  return matrix[b.length][a.length]
}
