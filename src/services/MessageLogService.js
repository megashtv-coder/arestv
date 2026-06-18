/**
 * Message Log Service
 * Tracks all messages sent to customers (WhatsApp, Telegram, Email, SMS, etc.)
 */

const STORAGE_KEY = 'arestv_message_logs'

/**
 * Add a message to the log
 */
export function logMessage(message) {
  try {
    const logs = getMessageLogs()
    const newLog = {
      id: `msg_${Date.now()}`,
      timestamp: new Date().toISOString(),
      ...message,
    }
    logs.push(newLog)
    // Keep only last 1000 messages
    if (logs.length > 1000) {
      logs.shift()
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs))
    return newLog
  } catch (error) {
    console.error('Error logging message:', error)
    return null
  }
}

/**
 * Get all message logs
 */
export function getMessageLogs() {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
  } catch (error) {
    console.error('Error reading message logs:', error)
    return []
  }
}

/**
 * Filter message logs
 */
export function filterMessageLogs(filters = {}) {
  let logs = getMessageLogs()

  // Filter by customer name
  if (filters.customer) {
    logs = logs.filter(log =>
      log.customerName?.toLowerCase().includes(filters.customer.toLowerCase())
    )
  }

  // Filter by message type (whatsapp, telegram, email, sms)
  if (filters.type) {
    logs = logs.filter(log => log.type === filters.type)
  }

  // Filter by date range
  if (filters.dateFrom) {
    logs = logs.filter(log => log.timestamp >= filters.dateFrom)
  }

  if (filters.dateTo) {
    logs = logs.filter(log => log.timestamp <= filters.dateTo)
  }

  // Sort by timestamp descending (newest first)
  logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))

  return logs
}

/**
 * Log WhatsApp message
 */
export function logWhatsAppMessage(customerName, phoneNumber, message, invoiceId = null, status = 'prepared') {
  return logMessage({
    type: 'whatsapp',
    customerName,
    phoneNumber,
    message,
    invoiceId,
    status: status, // 'prepared' (ready to send), 'sent' (actually sent), 'failed'
  })
}

/**
 * Log Telegram message
 */
export function logTelegramMessage(customerName, phoneNumber, message, invoiceId = null) {
  return logMessage({
    type: 'telegram',
    customerName,
    phoneNumber,
    message,
    invoiceId,
    status: 'sent',
  })
}

/**
 * Log Email
 */
export function logEmail(customerName, email, subject, message, invoiceId = null) {
  return logMessage({
    type: 'email',
    customerName,
    email,
    subject,
    message,
    invoiceId,
    status: 'sent',
  })
}

/**
 * Log SMS
 */
export function logSMS(customerName, phoneNumber, message, invoiceId = null) {
  return logMessage({
    type: 'sms',
    customerName,
    phoneNumber,
    message,
    invoiceId,
    status: 'sent',
  })
}

/**
 * Get statistics
 */
export function getMessageStatistics() {
  const logs = getMessageLogs()
  const stats = {
    total: logs.length,
    byType: {},
    byCustomer: {},
    today: 0,
    thisWeek: 0,
    thisMonth: 0,
  }

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()

  logs.forEach(log => {
    // By type
    stats.byType[log.type] = (stats.byType[log.type] || 0) + 1

    // By customer
    stats.byCustomer[log.customerName] = (stats.byCustomer[log.customerName] || 0) + 1

    // Time periods
    if (log.timestamp >= today) stats.today++
    if (log.timestamp >= weekAgo) stats.thisWeek++
    if (log.timestamp >= monthAgo) stats.thisMonth++
  })

  return stats
}

/**
 * Update message status (e.g., from 'prepared' to 'sent')
 */
export function updateMessageStatus(messageId, newStatus) {
  try {
    const logs = getMessageLogs()
    const messageIndex = logs.findIndex(log => log.id === messageId)

    if (messageIndex === -1) {
      console.warn('Message not found:', messageId)
      return false
    }

    logs[messageIndex].status = newStatus
    logs[messageIndex].statusUpdatedAt = new Date().toISOString()
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs))
    return true
  } catch (error) {
    console.error('Error updating message status:', error)
    return false
  }
}

/**
 * Clear all message logs
 */
export function clearMessageLogs() {
  try {
    localStorage.removeItem(STORAGE_KEY)
    return true
  } catch (error) {
    console.error('Error clearing message logs:', error)
    return false
  }
}

/**
 * Export message logs as CSV
 */
export function exportAsCSV() {
  const logs = getMessageLogs()
  if (logs.length === 0) return ''

  const headers = ['Koha', 'Lloji', 'Klienti', 'Numri/Email', 'Mesazhi', 'Statusi']
  const rows = logs.map(log => [
    new Date(log.timestamp).toLocaleString('sq-AL'),
    log.type.toUpperCase(),
    log.customerName,
    log.phoneNumber || log.email || '',
    log.message.substring(0, 50) + (log.message.length > 50 ? '...' : ''),
    log.status || 'sent',
  ])

  const csv = [headers, ...rows]
    .map(row => row.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(','))
    .join('\n')

  return csv
}

/**
 * Download message logs as CSV file
 */
export function downloadAsCSV() {
  const csv = exportAsCSV()
  if (!csv) {
    console.warn('No data to export')
    return
  }

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  link.setAttribute('href', url)
  link.setAttribute('download', `message_logs_${new Date().toISOString().slice(0, 10)}.csv`)
  link.style.visibility = 'hidden'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export default {
  logMessage,
  getMessageLogs,
  filterMessageLogs,
  logWhatsAppMessage,
  logTelegramMessage,
  logEmail,
  logSMS,
  getMessageStatistics,
  clearMessageLogs,
  exportAsCSV,
  downloadAsCSV,
}
