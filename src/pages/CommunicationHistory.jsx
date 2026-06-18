import { useState, useEffect } from 'react'
import { Search, Download, Trash2, MessageCircle, Send, Mail, Phone } from 'lucide-react'
import MessageLogService from '../services/MessageLogService'

const MESSAGE_TYPES = {
  whatsapp: { label: '💬 WhatsApp', color: 'bg-green-100 text-green-700', icon: MessageCircle },
  telegram: { label: '✈️ Telegram', color: 'bg-blue-100 text-blue-600', icon: Send },
  email: { label: '📧 Email', color: 'bg-purple-100 text-purple-700', icon: Mail },
  sms: { label: '📱 SMS', color: 'bg-orange-100 text-orange-700', icon: Phone },
}

export default function CommunicationHistory() {
  const [messages, setMessages] = useState([])
  const [filtered, setFiltered] = useState([])
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [stats, setStats] = useState(null)
  const [showConfirmClear, setShowConfirmClear] = useState(false)

  const perPage = 25

  // Load messages on mount
  useEffect(() => {
    loadMessages()
  }, [])

  // Filter messages
  useEffect(() => {
    let result = messages

    // Filter by type
    if (typeFilter !== 'all') {
      result = result.filter(m => m.type === typeFilter)
    }

    // Filter by status
    if (statusFilter !== 'all') {
      result = result.filter(m => m.status === statusFilter)
    }

    // Filter by search
    if (search) {
      const searchLower = search.toLowerCase()
      result = result.filter(m =>
        (m.customerName || '').toLowerCase().includes(searchLower) ||
        (m.phoneNumber || '').toLowerCase().includes(searchLower) ||
        (m.email || '').toLowerCase().includes(searchLower) ||
        (m.message || '').toLowerCase().includes(searchLower)
      )
    }

    setFiltered(result)
    setPage(1)
  }, [messages, typeFilter, statusFilter, search])

  const loadMessages = () => {
    const logs = MessageLogService.getMessageLogs()
    setMessages(logs)

    const statistics = MessageLogService.getMessageStatistics()
    setStats(statistics)
  }

  const handleClearAll = () => {
    MessageLogService.clearMessageLogs()
    loadMessages()
    setShowConfirmClear(false)
  }

  const handleDownloadCSV = () => {
    MessageLogService.downloadAsCSV()
  }

  const paged = filtered.slice((page - 1) * perPage, page * perPage)
  const totalPages = Math.ceil(filtered.length / perPage)

  const formatDate = (timestamp) => {
    const date = new Date(timestamp)
    return date.toLocaleString('sq-AL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  const formatMessage = (msg) => {
    return msg.length > 100 ? msg.substring(0, 100) + '...' : msg
  }

  const getStatusBadge = (status) => {
    const statusMap = {
      prepared: { icon: '⏳', label: 'Gati për dërgim', color: 'bg-amber-100 text-amber-700' },
      sent: { icon: '✓', label: 'Dërguar', color: 'bg-emerald-100 text-emerald-700' },
      failed: { icon: '✕', label: 'Dështoi', color: 'bg-blue-100 text-blue-700' },
      read: { icon: '✓✓', label: 'Lexuar', color: 'bg-blue-100 text-blue-600' },
    }
    const s = statusMap[status] || { icon: '•', label: status || 'Dërguar', color: 'bg-gray-100 text-gray-700' }
    return s
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Përgjagjimi i Komunikimeve</h2>
          <p className="text-sm text-gray-400 mt-0.5">Historia e të gjitha mesazheve të dërguar tek klientët</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleDownloadCSV}
            className="btn btn-outline flex items-center gap-2"
            title="Shkarko si CSV"
          >
            <Download size={16} />
            Shkarko
          </button>
          {messages.length > 0 && (
            <button
              onClick={() => setShowConfirmClear(true)}
              className="btn btn-danger flex items-center gap-2"
              title="Fshi të gjithë"
            >
              <Trash2 size={16} />
              Fshi të gjitha
            </button>
          )}
        </div>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          <div className="bg-white rounded-lg p-3 border border-gray-100">
            <p className="text-xs text-gray-500 font-semibold uppercase">Totali</p>
            <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
          </div>
          <div className="bg-green-50 rounded-lg p-3 border border-green-100">
            <p className="text-xs text-green-600 font-semibold uppercase">WhatsApp</p>
            <p className="text-2xl font-bold text-green-700">{stats.byType.whatsapp || 0}</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
            <p className="text-xs text-blue-500 font-semibold uppercase">Telegram</p>
            <p className="text-2xl font-bold text-blue-600">{stats.byType.telegram || 0}</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
            <p className="text-xs text-purple-600 font-semibold uppercase">Email</p>
            <p className="text-2xl font-bold text-purple-700">{stats.byType.email || 0}</p>
          </div>
          <div className="bg-orange-50 rounded-lg p-3 border border-orange-100">
            <p className="text-xs text-orange-600 font-semibold uppercase">SMS</p>
            <p className="text-2xl font-bold text-orange-700">{stats.byType.sms || 0}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-100 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="flex-1 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
            <Search size={16} className="text-gray-400" />
            <input
              type="text"
              placeholder="Kërko sipas emrit, numrit ose mesazhit..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent border-none outline-none text-sm flex-1 text-gray-600"
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-gray-300 hover:text-gray-500">
                ✕
              </button>
            )}
          </div>

          {/* Type filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm font-semibold text-gray-600 outline-none focus:border-blue-400"
          >
            <option value="all">Të gjitha tipet</option>
            <option value="whatsapp">💬 WhatsApp</option>
            <option value="telegram">✈️ Telegram</option>
            <option value="email">📧 Email</option>
            <option value="sms">📱 SMS</option>
          </select>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm font-semibold text-gray-600 outline-none focus:border-blue-400"
          >
            <option value="all">Të gjitha statuset</option>
            <option value="prepared">⏳ Gati për dërgim</option>
            <option value="sent">✓ Dërguar</option>
            <option value="read">✓✓ Lexuar</option>
            <option value="failed">✕ Dështoi</option>
          </select>
        </div>
      </div>

      {/* Clear confirmation */}
      {showConfirmClear && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-blue-700">Dëshiron të fshish të gjithë mesazhet?</p>
            <p className="text-xs text-blue-600 mt-1">Kjo nuk mund të rikthehej.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowConfirmClear(false)}
              className="btn btn-outline btn-sm text-xs"
            >
              Anulo
            </button>
            <button
              onClick={handleClearAll}
              className="btn btn-danger btn-sm text-xs"
            >
              Po, fshi të gjitha
            </button>
          </div>
        </div>
      )}

      {/* Messages table */}
      <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
        {paged.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm text-gray-500">Nuk ka mesazhe në këtë filtrim</p>
          </div>
        ) : (
          <>
            {/* Desktop view */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Koha</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Lloji</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Klienti</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Numri/Email</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Mesazhi</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Statusi</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((msg) => (
                    <tr key={msg.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {formatDate(msg.timestamp)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold ${MESSAGE_TYPES[msg.type]?.color || 'bg-gray-100 text-gray-700'}`}>
                          {MESSAGE_TYPES[msg.type]?.label || msg.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-800">{msg.customerName}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs font-mono">
                        {msg.phoneNumber || msg.email || '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-600 max-w-xs truncate" title={msg.message}>
                        {formatMessage(msg.message)}
                      </td>
                      <td className="px-4 py-3">
                        {(() => {
                          const badge = getStatusBadge(msg.status)
                          return (
                            <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold ${badge.color}`}>
                              {badge.icon} {badge.label}
                            </span>
                          )
                        })()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile view */}
            <div className="sm:hidden divide-y divide-gray-100">
              {paged.map((msg) => (
                <div key={msg.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-gray-800">{msg.customerName}</p>
                      <p className="text-xs text-gray-500">{formatDate(msg.timestamp)}</p>
                    </div>
                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold ${MESSAGE_TYPES[msg.type]?.color || 'bg-gray-100 text-gray-700'}`}>
                      {MESSAGE_TYPES[msg.type]?.label || msg.type}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">
                    {msg.phoneNumber || msg.email || '—'}
                  </p>
                  <p className="text-xs text-gray-700 mb-2">
                    {formatMessage(msg.message)}
                  </p>
                  <div className="mt-2">
                    {(() => {
                      const badge = getStatusBadge(msg.status)
                      return (
                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold ${badge.color}`}>
                          {badge.icon} {badge.label}
                        </span>
                      )
                    })()}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
                <p className="text-xs text-gray-500">
                  Faqja {page} nga {totalPages} · {filtered.length} rezultate
                </p>
                <div className="flex gap-1">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-2 py-1 border border-gray-200 rounded text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ← Mbrapa
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`px-2 py-1 rounded text-xs font-semibold ${
                        p === page
                          ? 'bg-blue-500 text-white'
                          : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-2 py-1 border border-gray-200 rounded text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Përpara →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
