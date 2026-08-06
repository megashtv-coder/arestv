/**
 * AIChat.jsx
 * React component for AI chat interface
 * Provides natural language command input with real-time feedback
 */

import React, { useState, useEffect, useRef } from 'react'
import { Send, Loader, AlertCircle, CheckCircle, HelpCircle } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { createAICommandProcessor } from '../services/ai/AICommandProcessor'
import { executeAction } from '../services/ai/ActionExecutor'

export default function AIChat() {
  const appContext = useApp()
  const processorRef = useRef(null)

  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      type: 'system',
      content: 'Përshëndetje! Jam AI asistenti juaj. Mund të më japni komandat në shqip.',
      timestamp: new Date(),
      examples: true,
    },
  ])
  const [loading, setLoading] = useState(false)
  const [currentResult, setCurrentResult] = useState(null)
  const messagesEndRef = useRef(null)

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
    <div className="flex flex-col h-screen bg-white dark:bg-gray-800">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-4 shadow-lg">
        <h1 className="text-2xl font-bold">🤖 AI Asistenti</h1>
        <p className="text-blue-100 text-sm">Komandat në shqip për menaxhimin e faturave</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map(msg => (
          <ChatMessage
            key={msg.id}
            message={msg}
            onFollowUp={handleFollowUp}
            onAccept={handleAcceptAction}
          />
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
            <Loader size={16} className="animate-spin" />
            Po përpunon komandën...
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="border-t border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/50"
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="P.sh: Krijo faturë për Viktor 12 muaj..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
          >
            <Send size={18} />
          </button>
        </div>

        {/* Help text */}
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          💡 Shembuj: "Arditi pagoi", "Shfaq faturat e papaguara", "Sa fitim kam këtë muaj"
        </div>
      </form>
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
        <div className="flex justify-end">
          <div className="bg-blue-500 text-white px-4 py-2 rounded-lg max-w-xs">
            {message.content}
          </div>
        </div>
      )

    case 'system':
      return (
        <div className="text-center text-gray-500 text-sm py-4 dark:text-gray-400">
          {message.content}
          {message.examples && (
            <div className="mt-3 space-y-1 text-xs">
              <div>📝 Provo:</div>
              <div>"Krijo faturë për Viktor 12 muaj"</div>
              <div>"Regjistro pagesë 100 euro"</div>
              <div>"Shfaq faturat e papaguara"</div>
            </div>
          )}
        </div>
      )

    case 'question':
      return (
        <div className="flex justify-start">
          <div className="bg-blue-50 border border-blue-200 px-4 py-3 rounded-lg max-w-md">
            <div className="flex items-start gap-2">
              <HelpCircle size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-blue-900 font-medium">{message.content}</p>
                <input
                  type="text"
                  placeholder="Përgjigja..."
                  className="mt-2 w-full px-3 py-1 border border-blue-300 rounded text-sm"
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
        <div className="flex justify-start">
          <div className="bg-red-50 border border-red-200 px-4 py-3 rounded-lg max-w-md">
            <div className="flex items-start gap-2">
              <AlertCircle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                {message.title && <p className="text-red-900 font-medium">{message.title}</p>}
                <p className="text-red-700 text-sm">{message.content}</p>
                {message.examples && (
                  <div className="mt-2 text-xs text-red-600">
                    <div>Shembuj:</div>
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
        <div className="flex justify-start">
          <div className="bg-green-50 border border-green-200 px-4 py-3 rounded-lg max-w-md">
            <div className="flex items-start gap-2">
              <CheckCircle size={18} className="text-green-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                {message.title && <p className="text-green-900 font-medium">{message.title}</p>}
                <p className="text-green-700 text-sm">{message.content}</p>
                {message.action && (
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={onAccept}
                      className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                    >
                      ✓ Pranohe
                    </button>
                    <button className="px-3 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300 dark:text-gray-200">
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
        <div className="flex justify-start">
          <div className="bg-green-100 border border-green-300 px-4 py-2 rounded-lg text-green-700 text-sm">
            {message.content}
          </div>
        </div>
      )

    default:
      return null
  }
}
