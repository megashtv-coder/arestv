/**
 * Contact Service
 * Handles Contact Picker API integration for modern browsers
 * Supports: Android, iPhone (via PWA), Chrome mobile
 */

export interface ImportedContact {
  firstName: string
  lastName: string
  phone: string
}

export interface ContactPickerOptions {
  multiple?: boolean
}

/**
 * Check if device supports Contact Picker API
 */
export function isContactPickerSupported(): boolean {
  return 'contacts' in navigator && 'ContactsManager' in window
}

/**
 * Request contact picker permissions and select contact
 * Uses navigator.contacts.select() API
 */
export async function selectContact(): Promise<ImportedContact | null> {
  try {
    if (!isContactPickerSupported()) {
      throw new Error('Contact Picker API not supported on this device')
    }

    // Request permission to access contacts
    const contacts = await (navigator as any).contacts.select(
      ['name', 'tel'],
      { multiple: false }
    )

    if (!contacts || contacts.length === 0) {
      return null
    }

    // Map first contact to our interface
    return mapContactData(contacts[0])
  } catch (error) {
    if ((error as any)?.name === 'AbortError') {
      // User cancelled the picker
      return null
    }
    throw error
  }
}

/**
 * Map Contact Picker API response to our ImportedContact interface
 */
export function mapContactData(contact: any): ImportedContact {
  const names = contact.name || []
  const phones = contact.tel || []

  // Extract first and last names
  let firstName = ''
  let lastName = ''

  if (names.length > 0) {
    const fullName = names[0].trim()
    const nameParts = fullName.split(/\s+/)

    firstName = nameParts[0] || ''
    lastName = nameParts.slice(1).join(' ') || ''
  }

  // Extract first phone number and clean it
  const phone = phones.length > 0 ? cleanPhoneNumber(phones[0]) : ''

  return {
    firstName,
    lastName,
    phone,
  }
}

/**
 * Clean phone number - remove spaces, dashes, parentheses
 * Keep only digits and +
 */
export function cleanPhoneNumber(phone: string): string {
  return phone.replace(/[\s\-()]/g, '')
}

/**
 * Validate imported contact data
 */
export function validateContact(contact: ImportedContact): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (!contact.firstName?.trim()) {
    errors.push('Emri nuk mund të jetë bosh')
  }

  if (!contact.phone?.trim()) {
    errors.push('Numri i telefonit nuk mund të jetë bosh')
  } else if (!/^\+?[\d\s\-()]{6,}$/.test(contact.phone)) {
    errors.push('Numri i telefonit nuk është valid')
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}
