/**
 * ContactImportButton Component
 * Modern, mobile-friendly button for importing contacts
 * Handles loading, errors, and fallback gracefully
 */

import { useState } from 'react'
import { Smartphone, AlertCircle, Loader } from 'lucide-react'
import { useContactPicker } from './useContactPicker'
import type { ImportedContact } from './contactService'

export interface ContactImportButtonProps {
  onSelect: (contact: ImportedContact) => void
  onError?: (error: string) => void
  className?: string
  variant?: 'primary' | 'secondary' | 'outline'
}

export function ContactImportButton({
  onSelect,
  onError,
  className = '',
  variant = 'primary',
}: ContactImportButtonProps) {
  const { isSupported, loading, error, importContact, clearError } = useContactPicker()
  const [showError, setShowError] = useState(false)

  const handleClick = async () => {
    clearError()
    setShowError(false)

    const contact = await importContact()

    if (contact) {
      // Success - pass to parent
      onSelect(contact)
      setShowError(false)
    } else if (error) {
      // Error occurred
      setShowError(true)
      onError?.(error)
    }
    // If contact is null and no error, user cancelled
  }

  // Determine button appearance
  const baseStyles = 'flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-all text-sm whitespace-nowrap'

  const variantStyles = {
    primary: 'bg-blue-500 text-white hover:bg-blue-600 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed',
    secondary: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed',
    outline: 'border border-blue-500 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed',
  }

  // Show tooltip if not supported
  if (!isSupported) {
    return (
      <div className="flex items-center gap-2">
        <button
          disabled
          title="Pajisja juaj nuk suporton kontaktet direkte"
          className={`${baseStyles} ${variantStyles[variant]} opacity-40 cursor-help`}
        >
          <Smartphone size={16} />
          Importo Kontakte
        </button>
        <span className="text-xs text-gray-400 hidden sm:inline">
          (Jo i disponueshëm)
        </span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleClick}
        disabled={loading}
        className={`${baseStyles} ${variantStyles[variant]} ${className}`}
        title={loading ? 'Duke ngarku...' : 'Kliko për të zgjedhur kontakt'}
      >
        {loading ? (
          <>
            <Loader size={16} className="animate-spin" />
            Duke ngarku...
          </>
        ) : (
          <>
            <Smartphone size={16} />
            Importo Kontakte
          </>
        )}
      </button>

      {/* Error message */}
      {showError && error && (
        <div className="flex items-start gap-2 p-2.5 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-red-700 dark:text-red-300">{error}</p>
          </div>
          <button
            onClick={() => {
              setShowError(false)
              clearError()
            }}
            className="text-red-500 hover:text-red-600 dark:hover:text-red-400 flex-shrink-0"
            title="Mbyll"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}
