/**
 * IntentDetector.js
 * Detects the user's intent from Albanian natural language input
 */

const INTENT_PATTERNS = {
  // Invoice Creation
  CREATE_INVOICE: [
    /krijo\s+faturë/i,
    /faturë\s+e\s+re/i,
    /shto\s+faturë/i,
    /fatura\s+për/i,
  ],
  EDIT_INVOICE: [
    /ndrysho\s+faturë/i,
    /përditëso\s+faturë/i,
    /edit\s+faturë/i,
  ],
  DELETE_INVOICE: [
    /fshi\s+faturë/i,
    /anulo\s+faturë/i,
    /hiq\s+faturë/i,
  ],
  LIST_INVOICES: [
    /shfaq\s+faturat/i,
    /lista\s+e\s+faturave/i,
    /cilat\s+faturat/i,
    /faturat\s+e\s+papaguara/i,
    /faturat\s+e\s+vonuara/i,
    /faturat\s+e\s+paguara/i,
    /raporti.*fatura/i,
  ],
  GET_INVOICE: [
    /shfaq\s+faturën/i,
    /hap\s+faturë/i,
    /detalet\s+e\s+faturës/i,
    /fatura\s+INV-/i,
  ],
  MARK_PAID: [
    /marke\s+si\s+paguar/i,
    /pagoi/i,
    /shëno\s+si\s+paguar/i,
    /regjistro\s+pagesë/i,
  ],
  VOID_INVOICE: [
    /anulo\s+faturën/i,
    /mbylle\s+faturën/i,
    /void/i,
  ],

  // Customer Operations
  CREATE_CUSTOMER: [
    /krijo\s+klient/i,
    /klient\s+i\s+ri/i,
    /shto\s+klient/i,
    /klient\s+për/i,
    /^shto\s*,/i, // "Shto, Emri Mbiemri, telefoni, shteti, referenti, aplikacioni, mac"
  ],

  // Task Operations
  CREATE_TASK: [
    /^detyr[eë]\b/i, // "Detyre @Klienti ddmmyyyy Përshkrimi i punës"
  ],
  EDIT_CUSTOMER: [
    /ndrysho\s+klient/i,
    /përditëso\s+klient/i,
  ],
  DELETE_CUSTOMER: [
    /fshi\s+klient/i,
    /anulo\s+klient/i,
  ],
  LIST_CUSTOMERS: [
    /shfaq\s+klientët/i,
    /lista\s+e\s+klientëve/i,
    /cilat\s+klientë/i,
  ],
  RENEW_CUSTOMER: [
    /rinovo\s+klient/i,
    /renew/i,
  ],

  // Payment Operations
  REGISTER_PAYMENT: [
    /regjistro\s+pagesë/i,
    /pagesa\s+për/i,
    /pagoi\s+/i,
    /marke.*paguar/i,
    // "Pagese @Klienti @FormaPageses Shuma Fee @Enndy" — two patterns so this
    // reliably outscores QUICK_INVOICE_CUSTOMER's generic @+@ mention pattern
    /^pagese\b/i,
    /^pagese\s+@/i,
  ],
  DELETE_PAYMENT: [
    /fshi\s+pagesë/i,
    /anulo\s+pagesë/i,
  ],
  LIST_PAYMENTS: [
    /shfaq\s+pagesat/i,
    /lista\s+e\s+pagesave/i,
  ],

  // Expense Operations
  REGISTER_EXPENSE: [
    /shto\s+shpenzim/i,
    /regjistro\s+shpenzim/i,
    /shpenzim\s+/i,
  ],
  DELETE_EXPENSE: [
    /fshi\s+shpenzim/i,
    /anulo\s+shpenzim/i,
  ],
  LIST_EXPENSES: [
    /shfaq\s+shpenzimet/i,
    /lista\s+e\s+shpenzimeve/i,
  ],

  // Reporting
  MONTHLY_SUMMARY: [
    /përmbledhje.*mujore/i,
    /summary\s+këtë\s+muaj/i,
    /sa\s+kam\s+këtë\s+muaj/i,
    /statistika.*muaj/i,
  ],
  PROFIT_REPORT: [
    /sa\s+fitim/i,
    /fitim\s+këtë\s+muaj/i,
    /profit/i,
  ],
  PARTNER_BALANCE: [
    /bilanci\s+i\s+partnerit/i,
    /borxh.*partner/i,
  ],
  INCOME_REPORT: [
    /të\s+ardhura/i,
    /income/i,
    /gjithë\s+pagesat/i,
  ],
  OVERDUE_REPORT: [
    /fatura.*vonuar/i,
    /faturat\s+e\s+vonuara/i,
    /kush\s+duhet/i,
  ],

  // Organization
  SWITCH_ORGANIZATION: [
    /ndërro\s+organizatë/i,
    /switch\s+org/i,
  ],
  UNDO_ACTION: [
    /anulo\s+veprimin\s+e\s+fundit/i,
    /undo/i,
    /kthe\s+pas/i,
  ],

  // Search/Filter
  SEARCH: [
    /kërko\s+/i,
    /gjej\s+/i,
    /kush\s+/i,
    /kur\s+/i,
    /ku\s+/i,
  ],

  // Quick Commands (Shortcuts)
  QUICK_INVOICE_CUSTOMER: [
    /@[\w\s]+\s+@[\w\s]+/i, // @Emri @Produkt format - auto-generate invoice
  ],
  ADD_CUSTOMER_QUICK: [
    /shto\s+klient\s+/i,
  ],
}

/**
 * Detect intent from user input
 * @param {string} text - User input text
 * @returns {Object} - {intent, confidence, matches}
 */
export function detectIntent(text) {
  if (!text || typeof text !== 'string') {
    return {
      intent: null,
      confidence: 0,
      matches: [],
    }
  }

  const matches = []

  // Check each intent pattern
  for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        matches.push({
          intent,
          pattern: pattern.toString(),
        })
      }
    }
  }

  // If no matches found, return null intent
  if (matches.length === 0) {
    return {
      intent: null,
      confidence: 0,
      matches: [],
      suggestion: 'Nuk e kuptova komandën. Provo: "Krijo faturë për Viktor 12 muaj"',
    }
  }

  // Group by intent and get the first (most likely)
  const intentCounts = {}
  matches.forEach(m => {
    intentCounts[m.intent] = (intentCounts[m.intent] || 0) + 1
  })

  const topIntent = Object.keys(intentCounts).sort(
    (a, b) => intentCounts[b] - intentCounts[a]
  )[0]

  // Calculate confidence based on pattern matches
  const confidence = Math.min(intentCounts[topIntent] / matches.length, 1.0)

  return {
    intent: topIntent,
    confidence: confidence > 0.5 ? confidence : 0.5, // minimum 50% if matched
    matches: matches.filter(m => m.intent === topIntent),
    text: text.trim(),
  }
}

/**
 * Get intent display name in Albanian
 */
export function getIntentLabel(intent) {
  const labels = {
    CREATE_INVOICE: 'Krijo Faturë',
    EDIT_INVOICE: 'Ndrysho Faturë',
    DELETE_INVOICE: 'Fshi Faturë',
    LIST_INVOICES: 'Listo Faturat',
    GET_INVOICE: 'Hap Faturën',
    MARK_PAID: 'Shëno si Paguar',
    VOID_INVOICE: 'Anulo Faturën',
    CREATE_CUSTOMER: 'Krijo Klient',
    EDIT_CUSTOMER: 'Ndrysho Klient',
    DELETE_CUSTOMER: 'Fshi Klient',
    LIST_CUSTOMERS: 'Listo Klientët',
    RENEW_CUSTOMER: 'Rinovo Klient',
    CREATE_TASK: 'Krijo Detyrë',
    REGISTER_PAYMENT: 'Regjistro Pagese',
    DELETE_PAYMENT: 'Fshi Pagese',
    LIST_PAYMENTS: 'Listo Pagesat',
    REGISTER_EXPENSE: 'Regjistro Shpenzim',
    DELETE_EXPENSE: 'Fshi Shpenzim',
    LIST_EXPENSES: 'Listo Shpenzimet',
    MONTHLY_SUMMARY: 'Përmbledhje Mujore',
    PROFIT_REPORT: 'Raport Fitimi',
    PARTNER_BALANCE: 'Bilanci i Partnerit',
    INCOME_REPORT: 'Raport Të Ardhurash',
    OVERDUE_REPORT: 'Faturat e Vonuara',
    SWITCH_ORGANIZATION: 'Ndërro Organizatë',
    UNDO_ACTION: 'Anulo Veprimin',
    SEARCH: 'Kërko',
  }

  return labels[intent] || intent
}

/**
 * Get example commands for an intent
 */
export function getIntentExamples(intent) {
  const examples = {
    CREATE_INVOICE: [
      'Krijo faturë për Viktor 12 muaj',
      'Shto faturë Ardit 100 euro',
      'Fatura e re për Shpend',
    ],
    REGISTER_PAYMENT: [
      'Arditi pagoi 100 euro',
      'Regjistro pagesë për faturën INV-001',
      'Marke INV-002 si paguar',
    ],
    REGISTER_EXPENSE: [
      'Shto shpenzim 40 euro internet',
      'Regjistro shpenzim Predator 200',
    ],
    LIST_INVOICES: [
      'Shfaq faturat e papaguara',
      'Cilat klientë kanë borxh',
      'Faturat e vonuara këtë muaj',
    ],
    MONTHLY_SUMMARY: [
      'Sa fitim kam këtë muaj',
      'Përmbledhje mujore',
    ],
  }

  return examples[intent] || []
}
