import { useState } from 'react'
import { X, Pencil, Save, XCircle } from 'lucide-react'
import { useApp } from '../context/AppContext'

export default function CustomerDetailsModal({ customer, onClose }) {
  const { customers, setCustomers, showToast } = useApp()
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    name: customer?.name || '',
    email: customer?.email || '',
    phone: customer?.phone || '',
    country: customer?.country || '',
    type: customer?.type || 'individual',
  })
  const [errors, setErrors] = useState({})

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setErrors(prev => ({ ...prev, [field]: '' }))
  }

  const validateForm = () => {
    const newErrors = {}
    if (!formData.name.trim()) newErrors.name = 'Emri është i detyrueshëm'
    if (formData.email && !formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      newErrors.email = 'Email i pavlefshëm'
    }
    return newErrors
  }

  const handleSave = () => {
    const newErrors = validateForm()
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    const updatedCustomers = customers.map(c =>
      c.name === customer.name
        ? {
            ...c,
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            country: formData.country,
            type: formData.type,
          }
        : c
    )

    setCustomers(updatedCustomers)
    showToast(`✓ ${formData.name} u përditësua!`)
    setIsEditing(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
            {isEditing ? 'Ndrysho klientin' : 'Detalet e klientit'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Emri */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Emri *
            </label>
            {isEditing ? (
              <>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => handleChange('name', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg outline-none transition-colors ${
                    errors.name
                      ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                      : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
                  } text-gray-800 dark:text-gray-100`}
                  placeholder="Emri i klientit"
                />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
              </>
            ) : (
              <p className="text-gray-800 dark:text-gray-200 font-semibold">{customer?.name}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Email
            </label>
            {isEditing ? (
              <>
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => handleChange('email', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg outline-none transition-colors ${
                    errors.email
                      ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                      : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
                  } text-gray-800 dark:text-gray-100`}
                  placeholder="email@example.com"
                />
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
              </>
            ) : (
              <p className="text-gray-600 dark:text-gray-400">{customer?.email || '—'}</p>
            )}
          </div>

          {/* Telefon */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              📞 Telefon
            </label>
            {isEditing ? (
              <input
                type="text"
                value={formData.phone}
                onChange={e => handleChange('phone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg outline-none bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
                placeholder="+355 691234567"
              />
            ) : (
              <p className="text-gray-600 dark:text-gray-400">{customer?.phone || '—'}</p>
            )}
          </div>

          {/* Vendi */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              🌍 Vendi
            </label>
            {isEditing ? (
              <input
                type="text"
                value={formData.country}
                onChange={e => handleChange('country', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg outline-none bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
                placeholder="Shqipëri"
              />
            ) : (
              <p className="text-gray-600 dark:text-gray-400">{customer?.country || '—'}</p>
            )}
          </div>

          {/* Lloji */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Lloji
            </label>
            {isEditing ? (
              <select
                value={formData.type}
                onChange={e => handleChange('type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg outline-none bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
              >
                <option value="individual">Individ</option>
                <option value="reseller">Reseller</option>
              </select>
            ) : (
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                customer?.type === 'reseller'
                  ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                  : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
              }`}>
                {customer?.type === 'reseller' ? '🔄 Reseller' : '👤 Individ'}
              </span>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-gray-700 sticky bottom-0 bg-gray-50 dark:bg-gray-700/50">
          {isEditing ? (
            <>
              <button
                onClick={() => {
                  setFormData({
                    name: customer?.name || '',
                    email: customer?.email || '',
                    phone: customer?.phone || '',
                    country: customer?.country || '',
                    type: customer?.type || 'individual',
                  })
                  setErrors({})
                  setIsEditing(false)
                }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
              >
                <XCircle size={16} />
                Anulo
              </button>
              <button
                onClick={handleSave}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors font-semibold"
              >
                <Save size={16} />
                Ruaj
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors font-semibold"
            >
              <Pencil size={16} />
              Ndrysho
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
