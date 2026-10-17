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
      darkMode ? 'bg-dk-bg' : 'bg-gray-50'
    }`}>
      {/* Close button - Top right corner */}
      <button
        onClick={onBack}
        className={`absolute top-6 right-6 z-50 flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${
          darkMode
            ? 'text-gray-400 hover:bg-dk-card'
            : 'text-gray-400 hover:bg-gray-100'
        }`}
        title="Kthehu"
      >
        <X size={18} />
      </button>

      {/* Content - Full page */}
      <div className={`flex-1 overflow-y-auto p-0 ${
        darkMode ? 'bg-dk-bg' : 'bg-gray-50'
      }`}>
        <div className={`max-w-2xl ${darkMode ? 'bg-dk-low' : 'bg-white'} border-0 shadow-none p-6 min-h-full`}>
          {children}
        </div>
      </div>
    </div>
  )
}
