import { createContext, useState } from 'react'
import { X } from 'lucide-react'
import { useApp } from '../context/AppContext'

// Forma mund të vendosë përmbajtje anash (vetëm ekrane të mëdha) përmes këtij konteksti:
// createPortal(<Paneli />, useContext(FormAsideContext)) — p.sh. transaksionet e fundit të klientit te fatura e re.
export const FormAsideContext = createContext(null)

/**
 * Full-page form wrapper (like Zoho)
 * Displays form as full page with header, sidebar remains visible
 */
export default function FormPageWrapper({ title, subtitle, children, onBack, framed = false }) {
  const { darkMode } = useApp()
  const [asideEl, setAsideEl] = useState(null)

  return (
    <div className={`h-full w-full flex flex-col relative ${
      darkMode ? 'bg-dk-bg' : 'bg-gray-50 dark:bg-gray-900/50'
    }`}>
      {/* Content - Full page */}
      <div className={`flex-1 overflow-y-auto ${framed ? 'p-3 sm:p-4' : 'p-0'} ${
        darkMode ? 'bg-dk-bg' : 'bg-gray-50 dark:bg-gray-900/50'
      }`}>
        <FormAsideContext.Provider value={asideEl}>
          <div className="flex min-h-full">
            {/* framed: kornizë e hollë me ngjyrën e sidebar-it rreth formës (në telefon me më pak padding) */}
            <div className={`flex-1 min-w-0 max-w-2xl ${darkMode ? 'bg-dk-low' : 'bg-white dark:bg-dk-low'} shadow-none ${
              framed ? 'border border-blue-200 dark:border-accent/40 rounded-2xl self-start' : 'border-0 min-h-full'
            }`}>
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
              <div className={framed ? 'p-4 sm:p-6' : 'p-6'}>
                {children}
              </div>
            </div>
            {/* Paneli anash — shfaqet vetëm në ekrane të mëdha (xl+), bosh kur forma s'ka çfarë të shfaqë */}
            <div ref={setAsideEl} className="hidden xl:block w-[360px] shrink-0 p-6 pl-8" />
          </div>
        </FormAsideContext.Provider>
      </div>
    </div>
  )
}
