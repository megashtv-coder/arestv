/**
 * AIChatFloat.jsx
 * Floating AI Chat widget that appears in bottom-right corner
 * Accessible from any page in the application
 *
 * NOTE: this is the version WITHOUT the Claude API Q&A fallback (no
 * AIQueryService / api/ai-query.js needed). Structured commands (create
 * invoice/customer, register payment/expense) still work exactly the same;
 * anything that doesn't match a known command gets a plain "s'e kuptova"
 * message instead of being answered by Claude.
 */

import React, { useState, useEffect, useRef } from 'react'
import { Send, X, Loader, AlertCircle, CheckCircle, MessageCircle, Minimize2, Users, Package, HelpCircle, CreditCard, Wallet } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { createAICommandProcessor } from '../services/ai/AICommandProcessor'
import { extractCustomerMentions, extractProductMentions, getReferentCandidates } from '../services/ai/EntityExtractor'
import { executeAction } from '../services/ai/ActionExecutor'
import { depositedToOptions } from '../data/mockData'

// Action types ActionExecutor actually knows how to run. A rule-based intent
// can match (e.g. "sa fitim kam" -> PROFIT_REPORT) without ever being wired
// up to a real executor — those fall back to the "not understood" message.
const SUPPORTED_ACTIONS = ['create_invoice', 'create_customer', 'register_payment', 'register_expense']

const NOT_UNDERSTOOD_MSG = 'Nuk e kuptova komandën. Provo diçka si:\n"@Emri i Klientit @Paketa Shuma"\n"Pagese @Klienti @FormaPageses Shuma"\n"Shpenzim lloji, shuma, llogaria"'

export default function AIChatFloat() {
  const appContext = useApp()
  const processorRef = useRef(null)

  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      type: 'system',
      content: 'Përshëndetje! 👋\n\nTips:\n\n1. Regjistro faturë, shkruaj:\n@Emer_Klientit @Paketa Shuma\nP.sh: @Viktor Shemshiri @12 muaj 100 eur\nMe referent: @Klienti @Referenti @Paketa Shuma DataSkadimit(ddmmyyyy)\n\n2. Regjistro pagesë, shkruaj:\nPagese @Klienti @FormaPageses Shuma Fee @Enndy/Samki\n\n3. Regjistro shpenzim, shkruaj:\nShpenzim lloji i shpenzimit, shuma, llogaria, Enndy/Samki',
      timestamp: new Date(),
    },
  ])
  const [loading, setLoading] = useState(false)
  const [currentResult, setCurrentResult] = useState(null)
  const [customerSuggestions, setCustomerSuggestions] = useState([])
  const [referentSuggestions, setReferentSuggestions] = useState([])
  const [productSuggestions, setProductSuggestions] = useState([])
  const [paymentModeSuggestions, setPaymentModeSuggestions] = useState([])
  const [depositedToSuggestions, setDepositedToSuggestions] = useState([])
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  // Initialize AI processor - only when customers are loaded
  useEffect(() => {
    if (!processorRef.current && appContext && appContext.customers?.length > 0) {
      processorRef.current = createAICommandProcessor(appContext)
    }
  }, [appContext])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Handle @ mentions for customers and products
  const handleInputChange = (e) => {
    const value = e.target.value
    setInput(value)

    const mentions = value.match(/@([\w\s]+)/g) || []

    // First @ is for customer
    if (mentions.length >= 1 && appContext?.customers) {
      const customerMention = mentions[0].substring(1).toLowerCase().trim()
      if (customerMention.length > 0) {
        const matches = appContext.customers.filter(c =>
          c.name.toLowerCase().includes(customerMention)
        )
        setCustomerSuggestions(matches)
      } else {
        setCustomerSuggestions([])
      }
    } else {
      setCustomerSuggestions([])
    }

    setReferentSuggestions([])
    setProductSuggestions([])
    setPaymentModeSuggestions([])
    setDepositedToSuggestions([])

    // "Pagese @Klienti @FormaPageses Shuma Fee @Enndy" — 2nd @ is the payment
    // mode, 3rd @ is who received it (Enndy/Samki), both from fixed lists.
    if (/^pagese\b/i.test(value.trim())) {
      if (mentions.length === 2) {
        const modeMention = mentions[1].substring(1).toLowerCase().trim()
        if (modeMention.length > 0 && appContext?.paymentModes) {
          setPaymentModeSuggestions(
            appContext.paymentModes.filter(m => m.toLowerCase().includes(modeMention))
          )
        }
      } else if (mentions.length >= 3) {
        const lastMention = mentions[mentions.length - 1].substring(1).toLowerCase().trim()
        if (lastMention.length > 0) {
          setDepositedToSuggestions(
            depositedToOptions.filter(d => d.toLowerCase().includes(lastMention))
          )
        }
      }
      return
    }

    // Second @ can be a referent (only if it matches a known referent — the
    // persistent representatives list plus every customer's "Referuar nga")
    // or, when no referent is intended, the product. Third @ (once a
    // referent is present) is always the product.
    if (mentions.length === 2) {
      const secondMention = mentions[1].substring(1).toLowerCase().trim()
      if (secondMention.length > 0) {
        const repMatches = getReferentCandidates(appContext).filter(rep =>
          rep.toLowerCase().includes(secondMention)
        )
        if (repMatches.length > 0) {
          setReferentSuggestions(repMatches)
        } else if (appContext?.items) {
          const matches = appContext.items.filter(item =>
            item.name.toLowerCase().includes(secondMention)
          )
          setProductSuggestions(matches)
        }
      }
    } else if (mentions.length >= 3 && appContext?.items) {
      const lastMention = mentions[mentions.length - 1].substring(1).toLowerCase().trim()
      if (lastMention.length > 0) {
        const matches = appContext.items.filter(item =>
          item.name.toLowerCase().includes(lastMention)
        )
        setProductSuggestions(matches)
      }
    }
  }

  const selectCustomer = (customerName) => {
    const mentions = input.match(/@([\w\s]+)/g) || []
    let newInput = input
    if (mentions.length > 0) {
      newInput = input.replace(mentions[0], `@${customerName}`)
    }
    const finalInput = newInput + ' '
    setInput(finalInput)
    setCustomerSuggestions([])
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus()
        inputRef.current.setSelectionRange(finalInput.length, finalInput.length)
      }
    }, 0)
  }

  const selectReferent = (name) => {
    const mentions = input.match(/@([\w\s]+)/g) || []
    let newInput = input
    if (mentions.length > 0) {
      newInput = input.replace(mentions[mentions.length - 1], `@${name}`)
    }
    const finalInput = newInput + ' '
    setInput(finalInput)
    setReferentSuggestions([])
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus()
        inputRef.current.setSelectionRange(finalInput.length, finalInput.length)
      }
    }, 0)
  }

  const selectPaymentMode = (mode) => {
    const mentions = input.match(/@([\w\s]+)/g) || []
    let newInput = input
    if (mentions.length > 0) {
      newInput = input.replace(mentions[mentions.length - 1], `@${mode}`)
    }
    const finalInput = newInput + ' '
    setInput(finalInput)
    setPaymentModeSuggestions([])
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus()
        inputRef.current.setSelectionRange(finalInput.length, finalInput.length)
      }
    }, 0)
  }

  const selectDepositedTo = (name) => {
    const mentions = input.match(/@([\w\s]+)/g) || []
    let newInput = input
    if (mentions.length > 0) {
      newInput = input.replace(mentions[mentions.length - 1], `@${name}`)
    }
    const finalInput = newInput + ' '
    setInput(finalInput)
    setDepositedToSuggestions([])
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus()
        inputRef.current.setSelectionRange(finalInput.length, finalInput.length)
      }
    }, 0)
  }

  const selectProduct = (productName) => {
    const mentions = input.match(/@([\w\s]+)/g) || []
    let newInput = input
    if (mentions.length >= 2) {
      // Replace whichever @mention is currently being typed (product is
      // always the last one — 2nd with no referent, 3rd with a referent)
      newInput = input.replace(mentions[mentions.length - 1], `@${productName}`)
    } else if (mentions.length === 1) {
      newInput = input + ` @${productName}`
    }
    const finalInput = newInput + ' '
    setInput(finalInput)
    setProductSuggestions([])
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus()
        inputRef.current.setSelectionRange(finalInput.length, finalInput.length)
      }
    }, 0)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!input.trim() || !processorRef.current) return

    const userMessage = input.trim()
    setInput('')

    const userMsg = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: userMessage,
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    try {
      let result

      // Check if this is a response to a follow-up question
      if (currentResult?.error?.code === 'MISSING_FIELDS') {
        result = await processorRef.current.continueConversation(userMessage, currentResult)
      } else {
        result = await processorRef.current.processCommand(userMessage)
      }

      setCurrentResult(result)

      // Auto-accept quick invoice commands
      if (result.autoAccept && result.action) {
        const execResult = executeAction(result.action, appContext)
        const successMsg = {
          id: `ai-${Date.now()}`,
          type: execResult.success ? 'success' : 'error',
          content: execResult.success
            ? (execResult.message || '✓ Veprimi u krye me sukses!')
            : (execResult.error || 'Veprimi dështoi.'),
          timestamp: new Date(),
        }
        setMessages(prev => [...prev, successMsg])
        setCurrentResult(null)
        setLoading(false)
        return
      }

      let responseMsg

      const notUnderstood = () => ({
        id: `ai-${Date.now()}`,
        type: 'answer',
        content: NOT_UNDERSTOOD_MSG,
        timestamp: new Date(),
      })

      if (!result.success) {
        if (result.error?.code === 'MISSING_FIELDS' && result.error?.followUpQuestion) {
          responseMsg = {
            id: `ai-${Date.now()}`,
            type: 'question',
            content: result.error.followUpQuestion,
            missingFields: result.error.fields,
            previousResult: result,
            timestamp: new Date(),
          }
        } else if (result.error?.code === 'NO_INTENT_DETECTED') {
          responseMsg = notUnderstood()
        } else {
          responseMsg = {
            id: `ai-${Date.now()}`,
            type: 'error',
            content: result.error?.message || 'Pati një gabim në përpunimin e komandës.',
            error: result.error,
            timestamp: new Date(),
          }
        }
      } else if (result.action && SUPPORTED_ACTIONS.includes(result.action.action)) {
        responseMsg = {
          id: `ai-${Date.now()}`,
          type: 'action',
          content: result.intent ? `${getIntentLabel(result.intent)}:` : 'Komanda pranuar',
          action: result.action,
          timestamp: new Date(),
        }
      } else {
        // A rule-based intent matched (e.g. a report/list command) but isn't
        // actually wired up to a real executor.
        responseMsg = notUnderstood()
      }

      setMessages(prev => [...prev, responseMsg])
    } catch (err) {
      const errorMsg = {
        id: `ai-${Date.now()}`,
        type: 'error',
        content: 'Gabim në procesim: ' + err.message,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMsg])
    } finally {
      setLoading(false)
    }
  }

  const getIntentLabel = (intent) => {
    const labels = {
      CREATE_INVOICE: 'Krijo Faturë',
      EDIT_INVOICE: 'Ndrysho Faturë',
      DELETE_INVOICE: 'Fshi Faturë',
      LIST_INVOICES: 'Listo Faturat',
      REGISTER_PAYMENT: 'Regjistro Pagese',
      REGISTER_EXPENSE: 'Regjistro Shpenzim',
      MONTHLY_SUMMARY: 'Përmbledhje Mujore',
    }
    return labels[intent] || 'Veprim'
  }

  const handleAcceptAction = async () => {
    if (!currentResult?.action) return

    try {
      const execResult = executeAction(currentResult.action, appContext)
      const resultMsg = {
        id: `ai-${Date.now()}`,
        type: execResult.success ? 'success' : 'error',
        content: execResult.success
          ? (execResult.message || '✓ Veprimi u krye me sukses!')
          : (execResult.error || 'Veprimi dështoi.'),
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, resultMsg])
      setCurrentResult(null)
    } catch (err) {
      const errorMsg = {
        id: `ai-${Date.now()}`,
        type: 'error',
        content: 'Gabim në ekzekutim: ' + err.message,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMsg])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Float Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 z-40"
          title="Hap AI Chat"
        >
          <MessageCircle size={24} />
        </button>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-white dark:bg-gray-800 rounded-lg shadow-2xl flex flex-col z-50 border border-gray-200 dark:border-gray-700">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <MessageCircle size={20} className="text-red-500" />
              <h3 className="font-bold text-gray-900 dark:text-white dark:text-gray-50">🤖 AI Asistenti</h3>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors dark:text-gray-500"
              title="Mbyll"
            >
              <X size={20} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map(msg => (
              <div key={msg.id}>
                {msg.type === 'user' && (
                  <div className="flex justify-end">
                    <div className="bg-red-500 text-white px-4 py-2 rounded-lg max-w-xs break-words">
                      {msg.content}
                    </div>
                  </div>
                )}

                {msg.type === 'system' && (
                  <div className="text-left text-sm text-gray-600 dark:text-gray-400 py-2 whitespace-pre-line dark:text-gray-300">
                    {msg.content}
                  </div>
                )}

                {msg.type === 'question' && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                    <div className="flex gap-2 items-start">
                      <HelpCircle size={18} className="text-blue-500 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-gray-800 dark:text-gray-200 dark:text-gray-100">{msg.content}</p>
                    </div>
                  </div>
                )}

                {msg.type === 'error' && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                    <div className="flex gap-2 items-start">
                      <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-gray-800 dark:text-gray-200 dark:text-gray-100">{msg.content}</p>
                    </div>
                  </div>
                )}

                {msg.type === 'answer' && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white px-4 py-2 rounded-lg max-w-[85%] whitespace-pre-line text-sm dark:text-gray-50">
                      {msg.content}
                    </div>
                  </div>
                )}

                {msg.type === 'action' && msg.action && (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 space-y-2">
                    <p className="font-semibold text-sm text-gray-900 dark:text-white dark:text-gray-50">{msg.content}</p>
                    <div className="flex gap-2">
                      <button
                        onClick={handleAcceptAction}
                        className="flex-1 bg-green-500 hover:bg-green-600 text-white text-sm py-1.5 rounded transition-colors"
                      >
                        ✓ Pranohe
                      </button>
                      <button
                        onClick={() => setCurrentResult(null)}
                        className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 text-sm py-1.5 rounded transition-colors dark:text-gray-200"
                      >
                        ✗ Anulo
                      </button>
                    </div>
                  </div>
                )}

                {msg.type === 'success' && (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                    <div className="flex gap-2 items-start">
                      <CheckCircle size={18} className="text-green-500 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-gray-800 dark:text-gray-200 dark:text-gray-100">{msg.content}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex justify-center py-2">
                <Loader size={18} className="animate-spin text-red-500" />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Form with Customer & Product Suggestions */}
          <form onSubmit={handleSubmit} className="border-t border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-b-lg space-y-2">
            {/* Customer Picker */}
            {customerSuggestions.length > 0 && (
              <div className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg max-h-32 overflow-y-auto dark:bg-gray-800">
                {customerSuggestions.map(customer => (
                  <button
                    key={customer.id}
                    type="button"
                    onClick={() => selectCustomer(customer.name)}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 text-sm text-gray-900 dark:text-white flex items-center gap-2 border-b border-gray-200 dark:border-gray-600 last:border-0 dark:text-gray-50 dark:border-gray-700"
                  >
                    <Users size={14} className="text-red-500" />
                    {customer.name}
                  </button>
                ))}
              </div>
            )}

            {/* Referent Picker */}
            {referentSuggestions.length > 0 && (
              <div className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg max-h-32 overflow-y-auto dark:bg-gray-800">
                {referentSuggestions.map(rep => (
                  <button
                    key={rep}
                    type="button"
                    onClick={() => selectReferent(rep)}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 text-sm text-gray-900 dark:text-white flex items-center gap-2 border-b border-gray-200 dark:border-gray-600 last:border-0 dark:text-gray-50 dark:border-gray-700"
                  >
                    <Users size={14} className="text-yellow-500" />
                    {rep}
                  </button>
                ))}
              </div>
            )}

            {/* Product Picker */}
            {productSuggestions.length > 0 && (
              <div className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg max-h-32 overflow-y-auto dark:bg-gray-800">
                {productSuggestions.map(product => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => selectProduct(product.name)}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 text-sm text-gray-900 dark:text-white flex items-center gap-2 border-b border-gray-200 dark:border-gray-600 last:border-0 dark:text-gray-50 dark:border-gray-700"
                  >
                    <Package size={14} className="text-blue-500" />
                    {product.name} - €{product.salePrice}
                  </button>
                ))}
              </div>
            )}

            {/* Payment Mode Picker */}
            {paymentModeSuggestions.length > 0 && (
              <div className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg max-h-32 overflow-y-auto dark:bg-gray-800">
                {paymentModeSuggestions.map(mode => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => selectPaymentMode(mode)}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 text-sm text-gray-900 dark:text-white flex items-center gap-2 border-b border-gray-200 dark:border-gray-600 last:border-0 dark:text-gray-50 dark:border-gray-700"
                  >
                    <CreditCard size={14} className="text-purple-500" />
                    {mode}
                  </button>
                ))}
              </div>
            )}

            {/* Deposited To Picker */}
            {depositedToSuggestions.length > 0 && (
              <div className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg max-h-32 overflow-y-auto dark:bg-gray-800">
                {depositedToSuggestions.map(name => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => selectDepositedTo(name)}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 text-sm text-gray-900 dark:text-white flex items-center gap-2 border-b border-gray-200 dark:border-gray-600 last:border-0 dark:text-gray-50 dark:border-gray-700"
                  >
                    <Wallet size={14} className="text-green-500" />
                    {name}
                  </button>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={handleInputChange}
                placeholder="Shkruaj komandë (@Emri, shto klient, etj)..."
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500 dark:text-gray-50"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="bg-red-500 hover:bg-red-600 disabled:bg-gray-300 text-white p-2 rounded-lg transition-colors flex-shrink-0"
              >
                <Send size={18} />
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}
