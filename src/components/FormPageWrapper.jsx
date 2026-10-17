import { X } from 'lucide-react'
import { useApp } from '../context/AppContext'

/**
 * Full-page form wrapper (like Zoho)
 * Displays form as full page with header, sidebar remains visible
 */
export default function FormPageWrapper({ title, subtitle, children, onBack }) {
  const { darkMode } = useApp()

  return (
    <div className={`h-full w-full flex flex-col relative ${
      darkMode ? 'bg-dk-bg' : 'bg-gray-50 dark:bg-gray-900/50'
    }`}>
      {/* Content - Full page */}
      <div className={`flex-1 overflow-y-auto p-0 ${
        darkMode ? 'bg-dk-bg' : 'bg-gray-50 dark:bg-gray-900/50'
      }`}>
        <div className={`max-w-2xl ${darkMode ? 'bg-dk-low' : 'bg-white dark:bg-dk-low'} border-0 shadow-none min-h-full`}>
          {/* Close button - top-right corner of the form panel (sticky) */}
          <div className="sticky top-0 z-20 h-0">
            <button
              onClick={onBack}
              className={`absolute top-4 right-4 flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${
                darkMode
                  ? 'text-gray-400 hover:bg-dk-card dark:text-gray-500'
                  : 'text-gray-400 hover:bg-gray-100 dark:text-gray-500'
              }`}
              title="Kthehu"
            >
              <X size={18} />
            </button>
          </div>
          <div className="p-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
