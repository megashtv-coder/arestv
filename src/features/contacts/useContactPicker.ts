/**
 * useContactPicker Hook
 * React hook for Contact Picker API with error handling
 */

import { useState, useCallback } from 'react'
import {
  selectContact,
  isContactPickerSupported,
  validateContact,
  type ImportedContact,
} from './contactService'

export interface UseContactPickerResult {
  isSupported: boolean
  loading: boolean
  error: string | null
  importContact: () => Promise<ImportedContact | null>
  clearError: () => void
}

export function useContactPicker(): UseContactPickerResult {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isSupported = isContactPickerSupported()

  const importContact = useCallback(async (): Promise<ImportedContact | null> => {
    // Clear previous error
    setError(null)

    // Check support
    if (!isSupported) {
      setError('Pajisja juaj nuk suporton importimin e kontakteve direkte.')
      return null
    }

    try {
      setLoading(true)

      // Select contact from device
      const contact = await selectContact()

      if (!contact) {
        // User cancelled
        return null
      }

      // Validate contact data
      const validation = validateContact(contact)
      if (!validation.isValid) {
        setError(validation.errors.join(', '))
        return null
      }

      return contact
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ndodhi një gabim'
      setError(`Gabim: ${errorMessage}`)
      return null
    } finally {
      setLoading(false)
    }
  }, [isSupported])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    isSupported,
    loading,
    error,
    importContact,
    clearError,
  }
}
