/**
 * examples.js
 * Practical examples of using the AI Command Processor
 */

import { createAICommandProcessor } from './AICommandProcessor'

// Mock app context for examples
const mockContext = {
  customers: [
    { id: 'C1', name: 'Viktor Shemshiri', phone: '+355694123456', email: 'viktor@example.com' },
    { id: 'C2', name: 'Ardit Rama', phone: '+355695123456', email: 'ardit@example.com' },
    { id: 'C3', name: 'Shpend Gashi', phone: '+355696123456', email: 'shpend@example.com' },
  ],
  invoices: [
    { id: 'INV-001', customer: 'Viktor Shemshiri', amount: 100, status: 'pending', date: '2026-08-01', due: '2026-08-08' },
    { id: 'INV-002', customer: 'Ardit Rama', amount: 200, status: 'paid', date: '2026-07-15', due: '2026-07-22' },
  ],
  items: [
    { id: 'ITM-1', name: '1 muaj abonim', salePrice: 10 },
    { id: 'ITM-2', name: '3 muaj abonim', salePrice: 30 },
    { id: 'ITM-3', name: '6 muaj abonim', salePrice: 50 },
    { id: 'ITM-4', name: '12 muaj abonim', salePrice: 100 },
  ],
  payments: [],
  expenses: [],
  vendors: [
    { id: 'V1', name: 'Predator', phone: '' },
    { id: 'V2', name: 'Ibosol', phone: '' },
  ],
  expenseCategories: ['Qira', 'Software', 'Internet', 'Ushqim', 'Transporti'],
  paymentModes: ['PayPal', 'Transfer Bankar', 'Kesh', 'Crypto'],
}

// ════════════════════════════════════════
// EXAMPLE 1: Create Invoice
// ════════════════════════════════════════

export async function example_createInvoice() {
  const processor = createAICommandProcessor(mockContext)

  console.log('\n═══ EXAMPLE 1: Create Invoice ═══')
  console.log('User: "Krijo faturë për Viktor 12 muaj"')

  const result = await processor.processCommand("Krijo faturë për Viktor 12 muaj")

  console.log('Result:', {
    success: result.success,
    intent: result.intent,
    action: result.action,
    entities: result.entities,
  })

  return result
}

// ════════════════════════════════════════
// EXAMPLE 2: Missing Fields & Follow-up
// ════════════════════════════════════════

export async function example_followUp() {
  const processor = createAICommandProcessor(mockContext)

  console.log('\n═══ EXAMPLE 2: Missing Fields & Follow-up ═══')
  console.log('User: "Krijo faturë për Viktor"')

  // First command - missing amount
  let result = await processor.processCommand("Krijo faturë për Viktor")

  console.log('Step 1 - Missing fields:', {
    success: result.success,
    missingFields: result.error?.fields,
    followUpQuestion: result.error?.followUpQuestion,
  })

  // Follow-up answer
  console.log('\nUser: "100"')
  result = await processor.continueConversation("100", result)

  console.log('Step 2 - After follow-up:', {
    success: result.success,
    action: result.success ? result.action : null,
  })

  return result
}

// ════════════════════════════════════════
// EXAMPLE 3: Payment Registration
// ════════════════════════════════════════

export async function example_registerPayment() {
  const processor = createAICommandProcessor(mockContext)

  console.log('\n═══ EXAMPLE 3: Register Payment ═══')
  console.log('User: "Arditi pagoi 200 euro"')

  const result = await processor.processCommand("Arditi pagoi 200 euro")

  console.log('Result:', {
    success: result.success,
    intent: result.intent,
    entities: result.entities,
    action: result.action,
  })

  return result
}

// ════════════════════════════════════════
// EXAMPLE 4: Customer Typo Suggestion
// ════════════════════════════════════════

export async function example_typoSuggestion() {
  const processor = createAICommandProcessor(mockContext)

  console.log('\n═══ EXAMPLE 4: Customer Typo Suggestion ═══')
  console.log('User: "Krijo faturë për Vikto"')

  const result = await processor.processCommand("Krijo faturë për Vikto 12 muaj")

  console.log('Result:', {
    success: result.success,
    error: result.error,
  })

  return result
}

// ════════════════════════════════════════
// EXAMPLE 5: Expense Registration
// ════════════════════════════════════════

export async function example_registerExpense() {
  const processor = createAICommandProcessor(mockContext)

  console.log('\n═══ EXAMPLE 5: Register Expense ═══')
  console.log('User: "Shto shpenzim 40 euro internet"')

  const result = await processor.processCommand("Shto shpenzim 40 euro internet")

  console.log('Result:', {
    success: result.success,
    intent: result.intent,
    entities: result.entities,
    action: result.action,
  })

  return result
}

// ════════════════════════════════════════
// EXAMPLE 6: List Unpaid Invoices
// ════════════════════════════════════════

export async function example_listUnpaid() {
  const processor = createAICommandProcessor(mockContext)

  console.log('\n═══ EXAMPLE 6: List Unpaid Invoices ═══')
  console.log('User: "Shfaq faturat e papaguara"')

  const result = await processor.processCommand("Shfaq faturat e papaguara")

  console.log('Result:', {
    success: result.success,
    intent: result.intent,
    action: result.action,
  })

  return result
}

// ════════════════════════════════════════
// EXAMPLE 7: Monthly Summary
// ════════════════════════════════════════

export async function example_monthlySummary() {
  const processor = createAICommandProcessor(mockContext)

  console.log('\n═══ EXAMPLE 7: Monthly Summary ═══')
  console.log('User: "Sa fitim kam këtë muaj?"')

  const result = await processor.processCommand("Sa fitim kam këtë muaj?")

  console.log('Result:', {
    success: result.success,
    intent: result.intent,
    action: result.action,
  })

  return result
}

// ════════════════════════════════════════
// EXAMPLE 8: Create Customer
// ════════════════════════════════════════

export async function example_createCustomer() {
  const processor = createAICommandProcessor(mockContext)

  console.log('\n═══ EXAMPLE 8: Create Customer ═══')
  console.log('User: "Krijo klient të ri Luiza Ahmeti"')

  const result = await processor.processCommand("Krijo klient të ri Luiza Ahmeti")

  console.log('Result:', {
    success: result.success,
    intent: result.intent,
    entities: result.entities,
    action: result.action,
  })

  return result
}

// ════════════════════════════════════════
// EXAMPLE 9: Invalid Command
// ════════════════════════════════════════

export async function example_invalidCommand() {
  const processor = createAICommandProcessor(mockContext)

  console.log('\n═══ EXAMPLE 9: Invalid Command ═══')
  console.log('User: "Bla bla bla"')

  const result = await processor.processCommand("Bla bla bla")

  console.log('Result:', {
    success: result.success,
    error: result.error,
  })

  return result
}

// ════════════════════════════════════════
// EXAMPLE 10: Get Command History
// ════════════════════════════════════════

export async function example_commandHistory() {
  const processor = createAICommandProcessor(mockContext)

  console.log('\n═══ EXAMPLE 10: Command History ═══')

  // Process several commands
  await processor.processCommand("Krijo faturë për Viktor 12 muaj")
  await processor.processCommand("Arditi pagoi")
  await processor.processCommand("Shfaq faturat e papaguara")

  const history = processor.getHistory()

  console.log('History (last 3 commands):', history.map(h => ({
    input: h.input,
    intent: h.intent,
    timestamp: h.timestamp,
  })))

  return history
}

// ════════════════════════════════════════
// RUN ALL EXAMPLES
// ════════════════════════════════════════

export async function runAllExamples() {
  console.log('╔════════════════════════════════════════╗')
  console.log('║  AI COMMAND PROCESSOR - EXAMPLES       ║')
  console.log('╚════════════════════════════════════════╝')

  try {
    await example_createInvoice()
    await example_followUp()
    await example_registerPayment()
    await example_typoSuggestion()
    await example_registerExpense()
    await example_listUnpaid()
    await example_monthlySummary()
    await example_createCustomer()
    await example_invalidCommand()
    await example_commandHistory()

    console.log('\n✅ All examples completed successfully!')
  } catch (err) {
    console.error('❌ Error running examples:', err)
  }
}

// Usage:
// import { runAllExamples } from './examples'
// runAllExamples()
