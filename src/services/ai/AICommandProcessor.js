/**
 * AICommandProcessor.js
 * Main orchestrator for AI commands - ties together intent detection, entity extraction, and validation
 */

import { detectIntent, getIntentLabel, getIntentExamples } from './IntentDetector'
import { extractEntities, getPriceFromPackage } from './EntityExtractor'
import { validateAction, ValidationError, autoCorrect, suggestCustomer } from './ValidationEngine'
import { generateAction } from './ActionRouter'

export class AICommandProcessor {
  constructor(appContext) {
    this.appContext = appContext
    this.actionHistory = []
    this.conversationContext = {}
  }

  /**
   * Process user input and return structured action
   * @param {string} userInput - Natural language command in Albanian
   * @returns {Promise<Object>} - {success, intent, action, entities, validation, followUpQuestion, error}
   */
  async processCommand(userInput) {
    try {
      // Auto-correct common typos
      const corrected = autoCorrect(userInput, this.appContext)

      // Step 1: Detect Intent
      const intentResult = detectIntent(corrected)

      if (!intentResult.intent) {
        return this.formatResponse({
          success: false,
          error: {
            code: 'NO_INTENT_DETECTED',
            message: intentResult.suggestion || 'Nuk e kuptova komandën.',
            examples: [
              'Krijo faturë për Viktor 12 muaj',
              'Arditi pagoi 100 euro',
              'Shfaq faturat e papaguara',
            ],
          },
        })
      }

      // Step 2: Extract Entities
      const entities = extractEntities(corrected, this.appContext)

      // Auto-suggest customer if typo detected
      if (entities.customer && intentResult.intent.includes('INVOICE')) {
        const suggestion = suggestCustomer(entities.customer, this.appContext.customers || [])
        if (suggestion && suggestion !== entities.customer) {
          this.conversationContext.suggestedCustomer = suggestion
          return this.formatResponse({
            success: false,
            error: {
              code: 'CUSTOMER_TYPO',
              message: `Klient i panjohur: "${entities.customer}"`,
              suggestion: `Pate mendim "${suggestion}"?`,
              field: 'customer',
            },
            entities,
          })
        }
      }

      // Step 3: Validate
      const validation = validateAction(intentResult.intent, entities, this.appContext)

      if (!validation.valid) {
        if (validation.followUpQuestion) {
          return this.formatResponse({
            success: false,
            intent: intentResult.intent,
            intentLabel: getIntentLabel(intentResult.intent),
            validation,
            error: {
              code: 'MISSING_FIELDS',
              message: `Të paktën: ${validation.missingFields.join(', ')}`,
              followUpQuestion: validation.followUpQuestion,
              fields: validation.missingFields,
            },
            entities,
          })
        }

        if (validation.errors.length > 0) {
          return this.formatResponse({
            success: false,
            intent: intentResult.intent,
            error: validation.errors[0],
            entities,
          })
        }
      }

      // Step 4: Generate Action
      const actionResult = generateAction(intentResult.intent, entities, this.appContext)

      if (!actionResult.success) {
        return this.formatResponse({
          success: false,
          error: actionResult.error,
          entities,
        })
      }

      // Step 5: Store in history
      this.actionHistory.push({
        timestamp: new Date().toISOString(),
        input: userInput,
        intent: intentResult.intent,
        action: actionResult.action,
        entities,
      })

      // Auto-accept quick invoice / add-customer commands — no confirm click needed
      const autoAccept = intentResult.intent === 'QUICK_INVOICE_CUSTOMER' || intentResult.intent === 'CREATE_CUSTOMER'

      return this.formatResponse({
        success: true,
        intent: intentResult.intent,
        intentLabel: getIntentLabel(intentResult.intent),
        action: actionResult.action,
        entities,
        validation,
        confidence: intentResult.confidence,
        autoAccept, // Flag for UI to auto-execute
      })
    } catch (err) {
      console.error('AICommandProcessor error:', err)
      return this.formatResponse({
        success: false,
        error: {
          code: 'PROCESSING_ERROR',
          message: 'Pati një gabim në përpunimin e komandës.',
          technical: err.message,
        },
      })
    }
  }

  /**
   * Continue conversation with follow-up information
   * @param {string} response - User's response to follow-up question
   * @param {Object} previousResult - Result from previous command
   * @returns {Promise<Object>} - Reprocessed command with new information
   */
  async continueConversation(response, previousResult) {
    // Extract what field was being asked for
    const missingField = previousResult.error?.fields?.[0]

    if (!missingField) {
      return previousResult
    }

    // Add extracted value to stored context
    const fieldValue = this.extractFollowUpValue(response, missingField)

    if (!fieldValue) {
      return this.formatResponse({
        success: false,
        error: {
          code: 'INVALID_RESPONSE',
          message: 'Nuk e kuptova përgjigjen. Provo përsëri.',
        },
      })
    }

    // Reconstruct command with new information
    const entities = {
      ...previousResult.entities,
      [missingField]: fieldValue,
    }

    // Re-validate with updated entities
    const validation = validateAction(previousResult.intent, entities, this.appContext)

    if (!validation.valid && validation.missingFields.length > 0) {
      return this.formatResponse({
        success: false,
        intent: previousResult.intent,
        validation,
        error: {
          code: 'MISSING_FIELDS',
          message: 'Akoma të paktën: ' + validation.missingFields.join(', '),
          followUpQuestion: validation.followUpQuestion,
          fields: validation.missingFields,
        },
        entities,
      })
    }

    // Generate action with complete data
    const actionResult = generateAction(previousResult.intent, entities, this.appContext)

    return this.formatResponse({
      success: actionResult.success,
      intent: previousResult.intent,
      intentLabel: getIntentLabel(previousResult.intent),
      action: actionResult.success ? actionResult.action : null,
      entities,
      validation,
      error: actionResult.error || null,
    })
  }

  /**
   * Extract value from follow-up response
   */
  extractFollowUpValue(response, field) {
    switch (field) {
      case 'customer':
        // If user suggested customer exists, use it
        if (this.conversationContext.suggestedCustomer) {
          const suggested = this.conversationContext.suggestedCustomer
          this.conversationContext.suggestedCustomer = null
          return suggested
        }
        // Otherwise extract from response
        return response.trim()

      case 'amount':
        const amount = parseFloat(response.replace(/[^0-9.,]/g, '').replace(',', '.'))
        return isNaN(amount) ? null : amount

      case 'package':
        if (response.toLowerCase().includes('12')) return { duration: '12 months', months: 12 }
        if (response.toLowerCase().includes('6')) return { duration: '6 months', months: 6 }
        if (response.toLowerCase().includes('3')) return { duration: '3 months', months: 3 }
        if (response.toLowerCase().includes('1')) return { duration: '1 month', months: 1 }
        return null

      case 'category':
        return response.trim()

      default:
        return response.trim()
    }
  }

  /**
   * Get conversation history
   */
  getHistory(limit = 10) {
    return this.actionHistory.slice(-limit)
  }

  /**
   * Clear history
   */
  clearHistory() {
    this.actionHistory = []
  }

  /**
   * Get help examples
   */
  getHelpExamples() {
    const examples = {}
    const intents = [
      'CREATE_INVOICE',
      'REGISTER_PAYMENT',
      'REGISTER_EXPENSE',
      'LIST_INVOICES',
      'MONTHLY_SUMMARY',
    ]

    for (const intent of intents) {
      examples[intent] = getIntentExamples(intent)
    }

    return examples
  }

  /**
   * Format final response
   */
  formatResponse(data) {
    return {
      timestamp: new Date().toISOString(),
      ...data,
    }
  }
}

/**
 * Create processor instance with app context
 */
export function createAICommandProcessor(appContext) {
  return new AICommandProcessor(appContext)
}
