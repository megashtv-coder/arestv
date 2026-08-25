/**
 * AIChat.jsx
 * React component for AI chat interface
 * Provides natural language command input with real-time feedback
 */

import React, { useState, useEffect, useRef } from 'react'
import { Send, Loader, AlertCircle, CheckCircle, HelpCircle, Sparkles, Bot, User, Lightbulb, BarChart3, RotateCcw } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { createAICommandProcessor } from '../services/ai/AICommandProcessor'
import { executeAction } from '../services/ai/ActionExecutor'

const QUICK_PROMPTS = [
  { cmd: '@Viktor Shemshiri @12 muaj 100 eur', desc: 'Krijon faturë të re për klientin' },
  { cmd: 'Pagese @Viktor Shemshiri Kesh 100 Enndy', desc: 'Regjistron pagesë të marrë' },
  { cmd: 'Shpenzim Server 56 PayPal Enndy', desc: 'Regjistron shpenzim të ri' },
]

const WELCOME_MSG = {
  id: 'welcome',
  type: 'system',
  content: 'Përshëndetje! Jam AI asistenti juaj. Mund të më japni komandat në shqip.',
  timestamp: new Date(),
  examples: true,
}

export default function AIChat() {
  const appContext = useApp()
  const processorRef = useRef(null)

  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([WELCOME_MSG])
  const [loading, setLoading] = useState(false)
  const [currentResult, setCurrentResult] = useState(null)
  const messagesEndRef = useRef(null)

  const invoices = appContext?.invoices || []
  const pendingInvoices = invoices.filter(i => i.status === 'pending')
  const pendingValue = pendingInvoices.reduce((s, i) => s + (i.amount || 0), 0)

  // Initialize AI processor
  useEffect(() => {
    if (!processorRef.current && appContext) {
      processorRef.current = createAICommandProcessor(appContext)
    }
  }, [appContext])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  /**
   * Handle user input submission
   */
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!input.trim() || !processorRef.current) return

    const userMessage = input.trim()
    setInput('')

    // Add user message
    const userMsg = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: userMessage,
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, userMsg])

    setLoading(true)

    try {
      // Process command
      const result = await processorRef.current.processCommand(userMessage)
      setCurrentResult(result)

      // Generate response message
      let responseMsg

      if (!result.success) {
        if (result.error?.code === 'MISSING_FIELDS' && result.error?.followUpQuestion) {
          // Follow-up question needed
          responseMsg = {
            id: `ai-${Date.now()}`,
            type: 'question',
            content: result.error.followUpQuestion,
            missingFields: result.error.fields,
            previousResult: result,
            timestamp: new Date(),
          }
        } else if (result.error?.code === 'CUSTOMER_TYPO' && result.error?.suggestion) {
          // Customer typo suggestion
          responseMsg = {
            id: `ai-${Date.now()}`,
            type: 'suggestion',
            content: result.error.suggestion,
            error: result.error,
            timestamp: new Date(),
          }
        } else if (result.error?.code === 'NO_INTENT_DETECTED') {
          // No intent detected
          responseMsg = {
            id: `ai-${Date.now()}`,
            type: 'error',
            title: 'Komandë e panjohur',
            content: result.error.message,
            examples: result.error.examples,
            timestamp: new Date(),
          }
        } else {
          // Other error
          responseMsg = {
            id: `ai-${Date.now()}`,
            type: 'error',
            title: 'Gabim',
            content: result.error?.message || 'Pati një gabim të panjohur',
            timestamp: new Date(),
          }
        }
      } else {
        // Success
        responseMsg = {
          id: `ai-${Date.now()}`,
          type: 'success',
          title: 'Komanda pranuar',
          content: `${result.intentLabel}: ${formatAction(result.action)}`,
          action: result.action,
          entities: result.entities,
          timestamp: new Date(),
        }
      }

      setMessages(prev => [...prev, responseMsg])
    } catch (err) {
      console.error('AI Chat error:', err)
      setMessages(prev => [...prev, {
        id: `ai-error-${Date.now()}`,
        type: 'error',
        title: 'Sistem Error',
        content: err.message,
        timestamp: new Date(),
      }])
    }

    setLoading(false)
  }

  /**
   * Continue conversation with follow-up answer
   */
  const handleFollowUp = async (answer) => {
    if (!answer.trim() || !processorRef.current || !currentResult) return

    const userMessage = answer.trim()
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
      const result = await processorRef.current.continueConversation(
        userMessage,
        currentResult
      )
      setCurrentResult(result)

      // Generate response
      let responseMsg

      if (!result.success) {
        if (result.error?.followUpQuestion) {
          responseMsg = {
            id: `ai-${Date.now()}`,
            type: 'question',
            content: result.error.followUpQuestion,
            missingFields: result.error.fields,
            previousResult: result,
            timestamp: new Date(),
          }
        } else {
          responseMsg = {
            id: `ai-${Date.now()}`,
            type: 'error',
            title: 'Gabim',
            content: result.error?.message,
            timestamp: new Date(),
          }
        }
      } else {
        responseMsg = {
          id: `ai-${Date.now()}`,
          type: 'success',
          title: 'Veprim i gatshëm',
          content: `${result.intentLabel}: ${formatAction(result.action)}`,
          action: result.action,
          timestamp: new Date(),
        }
      }

      setMessages(prev => [...prev, responseMsg])
    } catch (err) {
      console.error('Follow-up error:', err)
    }

    setLoading(false)
  }

  /**
   * Accept and execute action
   */
  const handleAcceptAction = () => {
    if (!currentResult?.action) return

    const execResult = executeAction(currentResult.action, appContext)

    setMessages(prev => [...prev, {
      id: `ai-executed-${Date.now()}`,
      type: execResult.success ? 'executed' : 'error',
      content: execResult.success
        ? (execResult.message || '✓ Veprimi u ekzekutua me sukses')
        : (execResult.error || 'Veprimi dështoi.'),
      action: currentResult.action,
      timestamp: new Date(),
    }])

    setCurrentResult(null)
  }

  /**
   * Format action for display
   */
  function formatAction(action) {
    if (!action) return ''
    const params = action.parameters || {}
    const parts = []

    if (params.customer) parts.push(`${params.customer}`)
    if (params.amount) parts.push(`€${params.amount}`)
    if (params.invoiceId) parts.push(`${params.invoiceId}`)
    if (params.category) parts.push(`${params.category}`)

    return parts.join(' • ')
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-5">
      {/* Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-blue-500 to-amber-500 p-6 text-white shadow-lg shadow-blue-500/15">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/30">
              <Sparkles size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight">AI Asistenti A Flow</h1>
                <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-bold border border-white/30">
                  Motor Komandash Lokal
                </span>
              </div>
              <p className="text-xs sm:text-sm text-blue-100 font-medium mt-0.5">
                Komanda me @mention për krijim faturash, pagesash dhe shpenzimesh.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-black/15 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/20">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold">Sistemi Aktiv</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/90 dark:border-gray-700 shadow-sm p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
              <Lightbulb size={14} className="text-amber-500" />
              Komanda të Shpejta
            </h3>
            <div className="space-y-2">
              {QUICK_PROMPTS.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => setInput(p.cmd)}
                  className="w-full text-left p-2.5 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-900/40 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-200 dark:hover:border-blue-900/40 transition-all"
                >
                  <span className="font-mono text-[11px] font-bold text-gray-900 dark:text-white block truncate">{p.cmd}</span>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">{p.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Business context */}
          <div className="bg-gray-900 text-white rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between border-b border-gray-800 pb-2 mb-1">
              <span className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                <BarChart3 size={14} className="text-blue-400" />
                Konteksti i të Dhënave
              </span>
              <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full font-bold">A Flow</span>
            </div>
            <div className="flex justify-between items-center text-xs text-gray-300">
              <span>Gjithsej Fatura:</span>
              <span className="font-bold font-mono text-white">{invoices.length}</span>
            </div>
            <div className="flex justify-between items-center text-xs text-gray-300">
              <span>Fatura në Pritje:</span>
              <span className="font-bold font-mono text-amber-400">{pendingInvoices.length}</span>
            </div>
            <div className="flex justify-between items-center text-xs text-gray-300">
              <span>Vlera në Pritje:</span>
              <span className="font-bold font-mono text-emerald-400">{appContext?.fmt ? appContext.fmt(pendingValue) : `€${pendingValue}`}</span>
            </div>
          </div>
        </div>

        {/* Chat */}
        <div className="lg:col-span-3 flex flex-col h-[620px] bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/90 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-500 text-white flex items-center justify-center">
                <Bot size={16} />
              </div>
              <div>
                <h3 className="text-xs font-bold text-gray-900 dark:text-white">Kanal Bisede — Komanda Shqip</h3>
                <p className="text-[10px] text-gray-500 dark:text-gray-400">Kërkon konfirmim para se t'i ekzekutojë veprimet</p>
              </div>
            </div>
            <button
              onClick={() => setMessages([WELCOME_MSG])}
              className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-xs font-medium flex items-center gap-1"
              title="Pastro bisedën"
            >
              <RotateCcw size={13} />
              <span className="hidden sm:inline">Pastro</span>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map(msg => (
              <ChatMessage
                key={msg.id}
                message={msg}
                onFollowUp={handleFollowUp}
                onAccept={handleAcceptAction}
              />
            ))}

            {loading && (
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-blue-500 text-white flex items-center justify-center shrink-0 text-[10px] font-bold">AI</div>
                <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded-xl text-gray-500 dark:text-gray-400 text-xs">
                  <Loader size={14} className="animate-spin" />
                  Po përpunon komandën...
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={handleSubmit}
            className="border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-3"
          >
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder='P.sh: "@Viktor Shemshiri @12 muaj 100 eur"'
                className="flex-1 px-4 py-2.5 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-50 dark:focus:ring-blue-900/20 focus:border-blue-400"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="px-4 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 transition-colors flex-shrink-0"
              >
                <span>Dërgo</span>
                <Send size={14} />
              </button>
            </div>

            {/* Help text */}
            <div className="mt-2 text-[10px] text-gray-400 dark:text-gray-500">
              💡 Shembuj: "@Klienti @Paketa Shuma" për faturë · "Pagese @Klienti Kesh Shuma Partneri" · "Shpenzim lloji shuma llogaria partneri"
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

/**
 * Individual chat message component
 */
function ChatMessage({ message, onFollowUp, onAccept }) {
  switch (message.type) {
    case 'user':
      return (
        <div className="flex gap-2.5 justify-end">
          <div className="max-w-[74%] px-3.5 py-2.5 rounded-2xl rounded-tr-sm text-xs bg-blue-500 text-white font-medium">
            {message.content}
          </div>
          <div className="w-7 h-7 rounded-xl bg-gray-800 text-white flex items-center justify-center shrink-0 mt-0.5">
            <User size={13} />
          </div>
        </div>
      )

    case 'system':
      return (
        <div className="flex gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-blue-500 text-white flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold">AI</div>
          <div className="max-w-[74%] px-3.5 py-2.5 rounded-2xl rounded-tl-sm text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
            {message.content}
            {message.examples && (
              <div className="mt-3 space-y-1 text-[11px] font-mono text-gray-500 dark:text-gray-400">
                <div className="font-sans font-semibold text-gray-600 dark:text-gray-300">📝 Provo:</div>
                <div>"@Viktor Shemshiri @12 muaj 100 eur"</div>
                <div>"Pagese @Viktor Kesh 100 Enndy"</div>
                <div>"Shpenzim Server 56 PayPal Enndy"</div>
              </div>
            )}
          </div>
        </div>
      )

    case 'question':
      return (
        <div className="flex gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-blue-500 text-white flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold">AI</div>
          <div className="max-w-[74%] px-3.5 py-2.5 rounded-2xl rounded-tl-sm bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-900/50">
            <div className="flex items-start gap-2">
              <HelpCircle size={16} className="text-sky-600 dark:text-sky-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-semibold text-sky-900 dark:text-sky-200">{message.content}</p>
                <input
                  type="text"
                  placeholder="Përgjigja..."
                  className="mt-2 w-full px-3 py-1.5 text-xs rounded-lg border border-sky-200 dark:border-sky-800 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:border-sky-500"
                  onKeyPress={e => {
                    if (e.key === 'Enter') {
                      onFollowUp(e.target.value)
                      e.target.value = ''
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )

    case 'error':
      return (
        <div className="flex gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-blue-500 text-white flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold">AI</div>
          <div className="max-w-[74%] px-3.5 py-2.5 rounded-2xl rounded-tl-sm bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50">
            <div className="flex items-start gap-2">
              <AlertCircle size={16} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                {message.title && <p className="text-xs font-bold text-red-900 dark:text-red-200">{message.title}</p>}
                <p className="text-red-700 dark:text-red-300 text-xs">{message.content}</p>
                {message.examples && (
                  <div className="mt-2 text-[11px] font-mono text-red-600 dark:text-red-400">
                    <div className="font-sans font-semibold">Shembuj:</div>
                    {message.examples.map((ex, i) => <div key={i}>• {ex}</div>)}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )

    case 'success':
      return (
        <div className="flex gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-blue-500 text-white flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold">AI</div>
          <div className="max-w-[74%] px-3.5 py-2.5 rounded-2xl rounded-tl-sm bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200/80 dark:border-emerald-900/50">
            <div className="flex items-start gap-2">
              <CheckCircle size={16} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                {message.title && <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200">{message.title}</p>}
                <p className="text-emerald-700 dark:text-emerald-300 text-xs">{message.content}</p>
                {message.action && (
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={onAccept}
                      className="px-3 py-1.5 bg-emerald-600 text-white text-[11px] font-bold rounded-lg hover:bg-emerald-700"
                    >
                      ✓ Pranohe
                    </button>
                    <button className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-[11px] font-bold rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600">
                      ✗ Anulo
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )

    case 'executed':
      return (
        <div className="flex gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-blue-500 text-white flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold">AI</div>
          <div className="max-w-[74%] px-3.5 py-2.5 rounded-2xl rounded-tl-sm bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
            {message.content}
          </div>
        </div>
      )

    default:
      return null
  }
}
