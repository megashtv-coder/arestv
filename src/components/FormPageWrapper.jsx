import { X } from 'lucide-react'
import { useApp } from '../context/AppContext'

/**
 * Full-page form wrapper (like Zoho)
 * Displays form as full page with header, sidebar remains visible
 */
export default function FormPageWrapper({ title, subtitle, children, onBack }) {
  const { darkMode } = useApp()

  return (
    <div className={`h-full w-full flex flex-col ${
      darkMode ? 'bg-gray-900' : 'bg-gray-50'
    }`}>
      {/* Header */}
      <div className={`border-b ${
        darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-100 bg-white'
      } px-6 py-4 shadow-sm`}>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <button
                onClick={onBack}
                className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors flex-shrink-0 ${
                  darkMode
                    ? 'text-gray-400 hover:bg-gray-700'
                    : 'text-gray-400 hover:bg-gray-100'
                }`}
                title="Kthehu"
              >
                <X size={18} />
              </button>
              <div>
                <h2 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {title}
                </h2>
                {subtitle && (
                  <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {subtitle}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content - Full page */}
      <div className={`flex-1 overflow-y-auto p-6 ${
        darkMode ? 'bg-gray-900' : 'bg-gray-50'
      }`}>
        <div className={`max-w-4xl ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl border ${
          darkMode ? 'border-gray-700' : 'border-gray-100'
        } shadow-sm p-6`}>
          {children}
        </div>
      </div>
    </div>
  )
}
