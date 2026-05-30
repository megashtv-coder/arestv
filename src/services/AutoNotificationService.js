/**
 * Auto Notification Service
 * Handles automatic WhatsApp notifications for subscription expiration
 */

// Message template for subscription expiry notifications
function buildSubscriptionExpiryMessage(customer, subscriptionExpiry, daysLeft) {
  const firstName = customer.split(' ')[0]
  const organizationName = 'PREDATOR - MEGA SH TV'

  if (daysLeft <= 0) {
    return `Përshëndetje ${firstName}!\nAbonimit juaj ka skaduar më ${subscriptionExpiry}.\nJu lutem rinovoni abonimin për të vazhduar shërbimin.\nFaleminderit!\nMe respekt, ${organizationName}`
  } else if (daysLeft === 1) {
    return `Përshëndetje ${firstName}!\nAbonimit juaj do të skadojë NESËR (${subscriptionExpiry}).\nJu lutem rinovoni abonimin në kohë për të vazhduar shërbimin.\nFaleminderit!\nMe respekt, ${organizationName}`
  } else {
    return `Përshëndetje ${firstName}!\nAbonimit juaj do të skadojë në ${daysLeft} ditë (${subscriptionExpiry}).\nJu lutem rinovoni abonimin në kohë.\nFaleminderit!\nMe respekt, ${organizationName}`
  }
}

// Calculate days remaining until subscription expiry
function daysUntilExpiry(subscriptionExpiry) {
  const today = new Date()
  const today_str = today.toISOString().slice(0, 10)
  const expiryDate = new Date(subscriptionExpiry)
  const daysMs = expiryDate - new Date(today_str)
  return Math.floor(daysMs / 86400000)
}

// Check if a subscription needs an automatic notification
// Returns days left until expiry, or null if no notification needed
function shouldSendNotification(invoice, advanceDays = 7) {
  // Must have subscription expiry date
  if (!invoice.subscriptionExpiry) return null

  // Must have customer with phone
  if (!invoice.customerPhone) return null

  // Check if notification has already been sent today
  const today = new Date().toISOString().slice(0, 10)
  const lastSentKey = `notif_sent_${invoice.id}`
  const lastSent = localStorage.getItem(lastSentKey)
  if (lastSent === today) return null

  // Calculate days until expiry
  const daysLeft = daysUntilExpiry(invoice.subscriptionExpiry)

  // Send if within the advance notification period or if already expired
  if (daysLeft <= advanceDays) {
    return daysLeft
  }

  return null
}

// Open WhatsApp with pre-formatted message
function openWhatsAppMessage(phoneNumber, message) {
  const encodedMessage = encodeURIComponent(message)
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`

  // Open in new tab/window
  window.open(whatsappUrl, '_blank')
}

// Send WhatsApp notification for an invoice
export function sendSubscriptionExpiryNotification(invoice, customers) {
  // Find customer object
  const customer = customers.find(c => c.name === invoice.customer)
  if (!customer || !customer.phone) return false

  // Clean phone number (remove spaces, dashes, parentheses)
  const phoneNumber = (customer.phone || '')
    .replace(/[\s+\-()]/g, '')

  if (!phoneNumber) return false

  // Check if notification should be sent
  const daysLeft = shouldSendNotification(invoice)
  if (daysLeft === null) return false

  // Build message
  const message = buildSubscriptionExpiryMessage(
    invoice.customer,
    invoice.subscriptionExpiry,
    daysLeft
  )

  // Send WhatsApp message
  openWhatsAppMessage(phoneNumber, message)

  // Mark as sent today
  const today = new Date().toISOString().slice(0, 10)
  localStorage.setItem(`notif_sent_${invoice.id}`, today)

  return true
}

// Check all invoices and send notifications for those that need it
export function checkAndSendNotifications(invoices, customers, advanceDays = 7) {
  if (!invoices || !customers) return 0

  let sentCount = 0

  for (const invoice of invoices) {
    // Must have subscription expiry
    if (!invoice.subscriptionExpiry) continue

    // Find customer and check for phone
    const customer = customers.find(c => c.name === invoice.customer)
    if (!customer || !customer.phone) continue

    // Check if this notification needs to be sent
    const daysLeft = shouldSendNotification(invoice, advanceDays)
    if (daysLeft !== null) {
      // Prepare invoice with customer phone for sending
      const invoiceWithPhone = { ...invoice, customerPhone: customer.phone }

      if (sendSubscriptionExpiryNotification(invoiceWithPhone, customers)) {
        sentCount++
      }
    }
  }

  return sentCount
}

// Get list of notifications that will be sent today
export function getPendingNotifications(invoices, customers, advanceDays = 7) {
  const pending = []
  const today = new Date().toISOString().slice(0, 10)

  for (const invoice of invoices) {
    if (!invoice.subscriptionExpiry) continue

    const customer = customers.find(c => c.name === invoice.customer)
    if (!customer || !customer.phone) continue

    const lastSentKey = `notif_sent_${invoice.id}`
    const lastSent = localStorage.getItem(lastSentKey)

    // Skip if already sent today
    if (lastSent === today) continue

    const daysLeft = daysUntilExpiry(invoice.subscriptionExpiry)

    // Check if within notification period
    if (daysLeft <= advanceDays) {
      pending.push({
        id: invoice.id,
        customer: invoice.customer,
        subscriptionExpiry: invoice.subscriptionExpiry,
        daysLeft,
        phone: customer.phone,
      })
    }
  }

  return pending
}

export default {
  sendSubscriptionExpiryNotification,
  checkAndSendNotifications,
  getPendingNotifications,
  daysUntilExpiry,
  buildSubscriptionExpiryMessage,
}
