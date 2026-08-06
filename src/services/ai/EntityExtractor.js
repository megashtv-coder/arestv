/**
 * EntityExtractor.js
 * Extracts entities (customer name, amount, date, etc.) from user input
 */

import { depositedToOptions, expenseTypes } from '../../data/mockData'

/**
 * Extract entities from user text
 * @param {string} text - User input
 * @param {Object} context - Current app context (customers, items, etc.)
 * @returns {Object} - Extracted entities
 */
export function extractEntities(text, context = {}) {
  if (!text || typeof text !== 'string') {
    return {}
  }

  // Quick "add customer" comma command:
  // "Shto, Emri Mbiemri, telefoni, shteti, referenti, aplikacioni, mac adresa"
  // Positional fields after the leading "shto" keyword — handled entirely
  // separately since a phone number/MAC address would otherwise confuse the
  // amount/date/package extractors below.
  const quickCustomer = extractQuickCustomerFields(text)
  if (quickCustomer) {
    return Object.fromEntries(
      Object.entries(quickCustomer).filter(([_, v]) => v !== null && v !== undefined && v !== '')
    )
  }

  // "Pagese @Klienti @FormaPageses Shuma Fee @Enndy" (register payment)
  const paymentCommand = extractPaymentCommand(text, context)
  if (paymentCommand) {
    return Object.fromEntries(
      Object.entries(paymentCommand).filter(([_, v]) => v !== null && v !== undefined && v !== '')
    )
  }

  // "Shpenzim <lloji>, <shuma>, <llogaria>, <partneri>" (register expense)
  const expenseCommand = extractExpenseCommand(text, context)
  if (expenseCommand) {
    return Object.fromEntries(
      Object.entries(expenseCommand).filter(([_, v]) => v !== null && v !== undefined && v !== '')
    )
  }

  const entities = {}

  // Extract customer name
  entities.customer = extractCustomerName(text, context.customers || [])

  // Extract referent/representative (only when explicitly @mentioned)
  entities.referent = extractReferent(text, getReferentCandidates(context))

  // Extract amount/price
  entities.amount = extractAmount(text)

  // Extract duration/package
  entities.package = extractPackage(text, context.items || [])

  // Extract dates
  entities.date = extractDate(text, 'date')
  entities.dueDate = extractDate(text, 'due')
  entities.subscriptionExpiry = extractExpiryDate(text)

  // Extract category/vendor
  entities.category = extractCategory(text, context.expenseCategories || [])
  entities.vendor = extractVendor(text, context.vendors || [])

  // Extract payment mode
  entities.paymentMode = extractPaymentMode(text, context.paymentModes || [])

  // Extract invoice ID
  entities.invoiceId = extractInvoiceId(text)

  // Extract numbers (for quantities, etc.)
  entities.quantity = extractQuantity(text)

  // Extract month/year references
  entities.period = extractPeriod(text)

  // Clean up empty values
  return Object.fromEntries(
    Object.entries(entities).filter(([_, v]) => v !== null && v !== undefined && v !== '')
  )
}

/**
 * Parse the quick "add customer" comma command:
 * "Shto, Emri Mbiemri, telefoni, shteti, referenti, aplikacioni, mac adresa"
 * Fields after the leading "shto"/"shto klient" keyword are positional and
 * all optional except the name. Returns null if the text isn't this format.
 */
function extractQuickCustomerFields(text) {
  const trimmed = text.trim()
  if (!/^shto\b/i.test(trimmed)) return null
  if (!trimmed.includes(',')) return null

  const parts = trimmed.split(',').map(p => p.trim())
  // First segment is the "shto"/"shto klient" keyword itself, not a field
  const fields = parts.slice(1).filter(p => p.length > 0)
  if (fields.length === 0) return null

  const [customer, phone, country, referent, app, macAddress] = fields
  if (!customer) return null

  return { customer, phone, country, referent, app, macAddress }
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Parse the "register payment" command:
 * "Pagese @Klienti @FormaPageses ShumaEPranuar Fee @Enndy" (fee and the
 * @Enndy/@Samki "who received it" mention are optional).
 * Matches customer/mode/depositedTo by known-value substring (like
 * extractCustomerMentions/extractPackage), not by @mention position, since a
 * greedy @mention capture would otherwise swallow the trailing amount/fee
 * digits into the payment-mode text.
 */
function extractPaymentCommand(text, context = {}) {
  const trimmed = text.trim()
  if (!/^pagese\b/i.test(trimmed)) return null

  const customers = context.customers || []
  const customerMatch = customers
    .filter(c => trimmed.toLowerCase().includes(c.name.toLowerCase()))
    .sort((a, b) => b.name.length - a.name.length)[0]
  if (!customerMatch) return null

  const paymentMode = extractPaymentMode(trimmed, context.paymentModes || [])
  const depositedTo = depositedToOptions.find(d => new RegExp(`\\b${escapeRegex(d)}\\b`, 'i').test(trimmed)) || null

  // Strip the known matched substrings so only the amount/fee digits remain
  let cleaned = trimmed.replace(/^pagese\b/i, ' ').replace(/@/g, ' ')
  cleaned = cleaned.replace(new RegExp(escapeRegex(customerMatch.name), 'i'), ' ')
  if (paymentMode) {
    const knownModes = [...(context.paymentModes || []), 'PayPal', 'Transfer Bankar', 'Kesh', 'Cash',
      'Western Union', 'Ria', 'Money Gram', 'Crypto', 'Stripe', 'Wire', 'Bank']
    const literal = knownModes
      .filter(m => cleaned.toLowerCase().includes(m.toLowerCase()))
      .sort((a, b) => b.length - a.length)[0]
    if (literal) cleaned = cleaned.replace(new RegExp(escapeRegex(literal), 'i'), ' ')
  }
  if (depositedTo) {
    cleaned = cleaned.replace(new RegExp(`\\b${escapeRegex(depositedTo)}\\b`, 'i'), ' ')
  }

  const numbers = (cleaned.match(/\d+(?:[.,]\d+)?/g) || []).map(n => parseFloat(n.replace(',', '.')))
  const amount = numbers.length > 0 ? numbers[0] : null
  const fee = numbers.length > 1 ? numbers[1] : 0

  return {
    customer: customerMatch.name,
    paymentMode: paymentMode || null,
    depositedTo,
    amount,
    fee,
  }
}

/**
 * Find the best match for `text` among `candidates` (plain strings): an exact
 * case-insensitive substring match wins outright (longest candidate first);
 * otherwise fall back to word-overlap scoring so a typo'd or partial name
 * ("blerje predator") can still resolve to the real value
 * ("Blerje krediti Predator") — a plain .includes() check alone can't do that.
 */
function fuzzyMatchList(text, candidates = []) {
  const lowerText = text.toLowerCase()

  const substringMatches = candidates.filter(c => lowerText.includes(c.toLowerCase()))
  if (substringMatches.length > 0) {
    return substringMatches.sort((a, b) => b.length - a.length)[0]
  }

  let best = null
  let bestScore = 0
  for (const candidate of candidates) {
    const words = candidate.toLowerCase().split(/[\s-]+/).filter(w => w.length > 2)
    if (words.length === 0) continue
    const matchedWords = words.filter(w => lowerText.includes(w))
    const score = matchedWords.length / words.length
    if (score > bestScore && score >= 0.5) {
      bestScore = score
      best = candidate
    }
  }
  return best
}

/**
 * Parse the "register expense" command:
 * "Shpenzim <lloji i shpenzimit>, <shuma>, <llogaria>, <partneri>"
 * The type and account are fuzzy-matched (see fuzzyMatchList) against the
 * real expenseTypes/depositAccounts lists, so an inexact name ("blerje
 * krediti predator") still resolves to the real one ("Blerje krediti
 * Predator"). Commas are optional — matching is by known-value lookup
 * across the whole text, not by strict field position.
 */
function extractExpenseCommand(text, context = {}) {
  const trimmed = text.trim()
  if (!/^shpenzim\b/i.test(trimmed)) return null

  let cleaned = trimmed.replace(/^shpenzim\b/i, ' ').replace(/,/g, ' ')

  const type = fuzzyMatchList(cleaned, expenseTypes)
  if (type) cleaned = cleaned.replace(new RegExp(escapeRegex(type), 'i'), ' ')

  const account = fuzzyMatchList(cleaned, context.depositAccounts || [])
  if (account) cleaned = cleaned.replace(new RegExp(escapeRegex(account), 'i'), ' ')

  const paidBy = depositedToOptions.find(d => new RegExp(`\\b${escapeRegex(d)}\\b`, 'i').test(cleaned)) || null
  if (paidBy) cleaned = cleaned.replace(new RegExp(`\\b${escapeRegex(paidBy)}\\b`, 'i'), ' ')

  const numbers = (cleaned.match(/\d+(?:[.,]\d+)?/g) || []).map(n => parseFloat(n.replace(',', '.')))
  const amount = numbers.length > 0 ? numbers[0] : null

  return {
    category: type,
    paidFrom: account,
    paidBy,
    amount,
  }
}

/**
 * Extract mentions with @ prefix (customers or products)
 * @param {string} text - User input
 * @param {Array} items - List of items to match
 * @returns {Array} - Matching items
 */
export function extractMentions(text, items = []) {
  const mentionMatches = text.match(/@([\w\s]+)/g) || []
  if (mentionMatches.length === 0) return []

  const mentions = mentionMatches.map(m => m.substring(1).toLowerCase().trim())
  return items.filter(item =>
    mentions.some(mention => item.name.toLowerCase().includes(mention))
  )
}

/**
 * Extract customers mentioned with @ prefix
 * @param {string} text - User input
 * @param {Array} customers - List of customers
 * @returns {Array} - Matching customers
 */
export function extractCustomerMentions(text, customers = []) {
  const mentionMatches = text.match(/@([\w\s]+)/g) || []
  console.log('🔍 extractCustomerMentions - text:', text)
  console.log('🔍 all mentions found:', mentionMatches)

  if (mentionMatches.length === 0) return []

  const firstMention = mentionMatches[0].substring(1).toLowerCase().trim()
  console.log('🔍 first mention (customer):', firstMention)

  // Prefer an exact name match so a fully-typed name isn't treated as
  // ambiguous just because it's also a substring of another customer's name
  // (e.g. "Bekim Krasniqi" vs "Bekim Krasniqi SW").
  const exactMatch = customers.find(c => c.name.toLowerCase().trim() === firstMention)
  if (exactMatch) {
    console.log('🔍 exact customer match:', exactMatch.name)
    return [exactMatch]
  }

  // Match customer name case-insensitively and return exact customer object
  console.log('🔍 available customers:', customers.map(c => `"${c.name}"`))
  const matches = customers.filter(c => {
    const customerLower = c.name.toLowerCase().trim()
    const mentionLower = firstMention.toLowerCase().trim()
    // Match if mention is contained in customer name (case-insensitive)
    const isMatch = customerLower.includes(mentionLower)
    console.log(`🔍 checking "${customerLower}" includes "${mentionLower}" = ${isMatch}`)
    return isMatch
  })

  console.log('🔍 customer matches:', matches.map(c => c.name))
  // If we have matches, return them (they'll be used by extractCustomerName)
  return matches
}

/**
 * Extract products/items mentioned with @ prefix
 * @param {string} text - User input
 * @param {Array} items - List of products
 * @returns {Array} - Matching products
 */
export function extractProductMentions(text, items = []) {
  const mentionMatches = text.match(/@([\w\s]+)/g) || []
  if (mentionMatches.length < 2) return []

  // Get second mention (first is customer, second is product)
  const productMention = mentionMatches[1].substring(1).toLowerCase().trim()
  return items.filter(item =>
    item.name.toLowerCase().includes(productMention)
  )
}

/**
 * Extract customer name from text
 */
function extractCustomerName(text, customers = []) {
  // Check for @mention first
  const mentions = extractCustomerMentions(text, customers)
  if (mentions.length === 1) {
    return mentions[0].name
  }
  if (mentions.length > 1) {
    return null // Require user to select
  }

  // Check for known customers in text
  for (const customer of customers) {
    if (text.toLowerCase().includes(customer.name.toLowerCase())) {
      return customer.name
    }
  }

  // Extract potential customer name (usually after "për" or at end)
  const patterns = [
    /për\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
    /klient\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
    /faturë\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) {
      return match[1].trim()
    }
  }

  return null
}

/**
 * Extract amount from text
 */
function extractAmount(text) {
  // Match numbers with or without euro symbol
  const patterns = [
    /(\d+(?:[.,]\d{2})?)\s*€/i,
    /€\s*(\d+(?:[.,]\d{2})?)/i,
    /(\d+(?:[.,]\d{2})?)\s*euro/i,
    /euro\s+(\d+(?:[.,]\d{2})?)/i,
    /shuma\s+(\d+(?:[.,]\d{2})?)/i,
    /(\d+(?:[.,]\d{2})?)\s+euro/i,
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) {
      const amount = parseFloat(match[1].replace(',', '.'))
      return isNaN(amount) ? null : amount
    }
  }

  // Fallback for @mention quick-invoice commands ("@Klienti @Paketa Shuma"):
  // a bare number at the end of the text is the price, e.g. "@Viktor @12 muaj 100".
  // Must be its own whitespace-separated token, so a product code suffix like
  // "X2" or "8K" isn't mistaken for a trailing price.
  if (text.includes('@')) {
    // Strip a trailing ddmmyyyy expiry-date token first, so it isn't
    // mistaken for the price when both are present, e.g. "...100 25122026".
    const withoutExpiry = text.replace(/(?:^|\s)\d{8}\s*$/, '')
    const trailing = withoutExpiry.trim().match(/(?:^|\s)(\d+(?:[.,]\d{2})?)$/)
    if (trailing) {
      const amount = parseFloat(trailing[1].replace(',', '.'))
      return isNaN(amount) ? null : amount
    }
  }

  return null
}

/**
 * Full list of referent candidates, matching what the invoice form itself
 * offers: the persistent representatives list plus every unique
 * "Referuar nga" value already used on a customer.
 */
export function getReferentCandidates(context = {}) {
  const fromReps = context.representatives || []
  const fromCustomers = (context.customers || [])
    .filter(c => c.referredBy && c.referredBy.trim())
    .map(c => c.referredBy.trim())
  return Array.from(new Set([...fromReps, ...fromCustomers]))
}

/**
 * Extract a representative/referent, only when it was explicitly @mentioned
 * as the second mention in a 3+-mention command ("@Klienti @Referenti @Paketa")
 * and matches a known referent name exactly.
 */
function extractReferent(text, referents = []) {
  const mentionMatches = text.match(/@([\w\s]+)/g) || []
  if (mentionMatches.length < 3) return null

  const secondMention = mentionMatches[1].substring(1).toLowerCase().trim()
  const match = referents.find(rep => rep.toLowerCase().trim() === secondMention)
  return match || null
}

/**
 * Extract an explicit subscription expiry date in bare ddmmyyyy form
 * (e.g. "25122026" -> 2026-12-25), only as a standalone trailing token.
 */
function extractExpiryDate(text) {
  if (!text.includes('@')) return null

  const match = text.trim().match(/(?:^|\s)(\d{2})(\d{2})(\d{4})\s*$/)
  if (!match) return null

  const day = parseInt(match[1], 10)
  const month = parseInt(match[2], 10)
  const year = parseInt(match[3], 10)
  if (month < 1 || month > 12 || day < 1 || day > 31) return null

  // Validate it's a real calendar date (e.g. rejects 31/02/2026) without
  // going through toISOString(), which would shift the date by the local
  // UTC offset instead of preserving the literal day that was typed.
  const date = new Date(year, month - 1, day)
  if (date.getMonth() !== month - 1 || date.getDate() !== day) return null

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/**
 * Extract package/duration from text
 */
function extractPackage(text, items = []) {
  // Prefer an exact match against the real product catalogue first, so the
  // invoice shows exactly the product that was mentioned/selected (e.g.
  // "12 Muaj Abonim X2") instead of a generic duration guess. When more than
  // one item name appears in the text, prefer the longest (most specific) one.
  const matchedItems = items
    .filter(item => item.name && text.toLowerCase().includes(item.name.toLowerCase()))
    .sort((a, b) => b.name.length - a.name.length)

  if (matchedItems.length > 0) {
    const item = matchedItems[0]
    return {
      item: item.name,
      price: item.salePrice,
      display: item.name,
    }
  }

  const durations = [
    { text: /(\d+)\s*muaj/i, value: (n) => `${n} months`, display: (n) => `${n} muaj` },
    { text: /(\d+)\s*vit/i, value: (n) => `${n * 12} months`, display: (n) => `${n} vit` },
    { text: /12\s*muaj/i, value: () => '12 months', display: () => '12 muaj' },
    { text: /6\s*muaj/i, value: () => '6 months', display: () => '6 muaj' },
    { text: /3\s*muaj/i, value: () => '3 months', display: () => '3 muaj' },
    { text: /1\s*muaj/i, value: () => '1 month', display: () => '1 muaj' },
  ]

  for (const duration of durations) {
    const match = text.match(duration.text)
    if (match) {
      const num = match[1] ? parseInt(match[1]) : null
      return {
        duration: num ? duration.value(num) : duration.value(),
        display: num ? duration.display(num) : duration.display(),
        months: num ? (duration.text.toString().includes('vit') ? num * 12 : num) : null,
      }
    }
  }

  return null
}

/**
 * Extract date from text
 */
function extractDate(text, type = 'date') {
  // Date patterns
  const patterns = [
    /(\d{4}-\d{2}-\d{2})/,  // YYYY-MM-DD
    /(\d{2}\/\d{2}\/\d{4})/, // DD/MM/YYYY
    /(\d{2}\.\d{2}\.\d{4})/, // DD.MM.YYYY
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) {
      return normalizeDate(match[1])
    }
  }

  // Relative dates
  if (text.toLowerCase().includes('sot')) {
    return new Date().toISOString().slice(0, 10)
  }
  if (text.toLowerCase().includes('nesër')) {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toISOString().slice(0, 10)
  }

  return null
}

/**
 * Normalize date to YYYY-MM-DD format
 */
function normalizeDate(dateStr) {
  let date

  if (dateStr.includes('-')) {
    // Already YYYY-MM-DD
    date = new Date(dateStr)
  } else if (dateStr.includes('/')) {
    // DD/MM/YYYY
    const [d, m, y] = dateStr.split('/')
    date = new Date(`${y}-${m}-${d}`)
  } else if (dateStr.includes('.')) {
    // DD.MM.YYYY
    const [d, m, y] = dateStr.split('.')
    date = new Date(`${y}-${m}-${d}`)
  }

  if (date && !isNaN(date)) {
    return date.toISOString().slice(0, 10)
  }

  return null
}

/**
 * Extract category from text
 */
function extractCategory(text, categories = []) {
  const lowerText = text.toLowerCase()

  // Check against known categories
  for (const category of categories) {
    if (lowerText.includes(category.toLowerCase())) {
      return category
    }
  }

  // Common keywords
  const keywordMap = {
    'internet': 'Shërbime',
    'qira': 'Qira',
    'software': 'Software',
    'marketing': 'Marketing',
    'ushqim': 'Ushqim',
    'pajisje': 'Pajisje',
    'udhëtime': 'Udhëtime',
  }

  for (const [keyword, category] of Object.entries(keywordMap)) {
    if (lowerText.includes(keyword)) {
      return category
    }
  }

  return null
}

/**
 * Extract vendor from text
 */
function extractVendor(text, vendors = []) {
  const lowerText = text.toLowerCase()

  for (const vendor of vendors) {
    if (lowerText.includes(vendor.name.toLowerCase())) {
      return vendor.name
    }
  }

  return null
}

/**
 * Extract payment mode from text
 */
function extractPaymentMode(text, paymentModes = []) {
  const lowerText = text.toLowerCase()

  const modeMap = {
    'paypal': 'PayPal',
    'transfer': 'Transfer Bankar',
    'kesh': 'Kesh',
    'cash': 'Kesh',
    'western': 'Western Union',
    'ria': 'Ria',
    'money gram': 'Money Gram',
    'crypto': 'Crypto',
    'stripe': 'Stripe',
    'wire': 'Transfer Bankar',
    'bank': 'Transfer Bankar',
  }

  for (const [keyword, mode] of Object.entries(modeMap)) {
    if (lowerText.includes(keyword)) {
      return mode
    }
  }

  // Check against known modes
  for (const mode of paymentModes) {
    if (lowerText.includes(mode.toLowerCase())) {
      return mode
    }
  }

  return null
}

/**
 * Extract invoice ID from text
 */
function extractInvoiceId(text) {
  const match = text.match(/INV-(\d+)/i)
  return match ? `INV-${match[1]}` : null
}

/**
 * Extract quantity from text
 */
function extractQuantity(text) {
  const patterns = [
    /(\d+)\s*copje/i,
    /(\d+)\s*njesesi/i,
    /sasia\s+(\d+)/i,
    /qty\s+(\d+)/i,
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) {
      return parseInt(match[1])
    }
  }

  return null
}

/**
 * Extract time period references (month, year)
 */
function extractPeriod(text) {
  const lowerText = text.toLowerCase()
  const months = [
    'janar', 'shkurt', 'mars', 'prill', 'maj', 'qershor',
    'korrik', 'gusht', 'shtator', 'tetor', 'nëntor', 'dhjetor',
  ]

  const monthMap = {}
  months.forEach((m, i) => {
    monthMap[m] = i + 1
  })

  // Check for month names
  for (const [month, num] of Object.entries(monthMap)) {
    if (lowerText.includes(month)) {
      const yearMatch = text.match(/20\d{2}/)
      return {
        month: num,
        year: yearMatch ? parseInt(yearMatch[0]) : new Date().getFullYear(),
      }
    }
  }

  // Check for "këtë muaj", "muajin e kaluar", etc.
  if (lowerText.includes('këtë muaj')) {
    const now = new Date()
    return {
      month: now.getMonth() + 1,
      year: now.getFullYear(),
    }
  }

  if (lowerText.includes('muajin e kaluar')) {
    const now = new Date()
    const last = new Date(now.getFullYear(), now.getMonth() - 1)
    return {
      month: last.getMonth() + 1,
      year: last.getFullYear(),
    }
  }

  return null
}

/**
 * Get price from package/item
 */
export function getPriceFromPackage(pkg, items = []) {
  if (!pkg) return null

  // If a specific product/item was referenced by name
  if (pkg.item) {
    const item = items.find(i => i.name === pkg.item)
    return item ? item.salePrice : (pkg.price ?? null)
  }

  // Otherwise resolve the package's own price from the real product catalogue
  // (e.g. "12 months" → the "12 muaj abonim" item's actual salePrice)
  if (pkg.months) {
    const match = items.find(i => {
      const m = i.name.match(/(\d+)\s*muaj/i)
      return m && parseInt(m[1], 10) === pkg.months
    })
    if (match) return match.salePrice
  }

  // Last-resort defaults if no catalogue price is available
  const priceMap = {
    '1 month': 10,
    '3 months': 40,
    '6 months': 60,
    '12 months': 100,
  }

  return priceMap[pkg.duration] || null
}
