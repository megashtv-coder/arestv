import { useState, useMemo } from 'react'
import {
  UserCog, Pencil, Trash2,
  CheckCircle, XCircle, Clock, Package,
  Search, X, Filter,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { EmptyState } from '../components/UI'
import { UserModal, ROLE_META } from '../components/UserModal'

const MODULE_COLORS = {
  'Faturat':      'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
  'Klientët':     'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
  'Shpenzimet':   'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
  'Pagesat':      'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
  'Furnitorët':   'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
  'Produktet':    'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
  'Detyrat':      'bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400',
  'Barazimet':    'bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400',
  'Përdoruesit':  'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
  'Sistemi':      'bg-gray-100 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400',
}

function fmtTime(ts) {
  const d = new Date(ts)
  return d.toLocaleDateString('sq-AL', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' })
}

/* ══════════════════════════════════════════════════════════
   Faqja kryesore
══════════════════════════════════════════════════════════ */
export default function UsersPage() {
  const { users, setUsers, setModal, closeModal, showToast, currentUser, activityLog, logActivity } = useApp()

  /* ── Activity log filter state ── */
  const [logSearch,     setLogSearch]     = useState('')
  const [logUserFilter, setLogUserFilter] = useState('all')

  const openEdit = (u) => setModal(<UserModal user={u} onClose={closeModal} />)

  const handleDelete = (u) => {
    if (u.id === currentUser?.id) { showToast('Nuk mund të fshish llogarinë tënde aktuale.', 'error'); return }
    if (!window.confirm(`A je i sigurt që dëshiron ta fshish "${u.name}"?`)) return
    setUsers(prev => prev.map(x => x.id === u.id ? { ...x, deleted: true } : x))
    logActivity(`Fshiu përdoruesin "${u.name}"`, 'Përdoruesit')
    showToast(`"${u.name}" u fshi. ✓`)
  }

  const handleToggleActive = (u) => {
    if (u.id === currentUser?.id) { showToast('Nuk mund të çaktivizosh llogarinë tënde aktuale.', 'error'); return }
    const nextActive = u.active === false
    setUsers(prev => prev.map(x => x.id === u.id ? { ...x, active: nextActive } : x))
    logActivity(`${nextActive ? 'Aktivizoi' : 'Çaktivizoi'} përdoruesin "${u.name}"`, 'Përdoruesit')
    showToast(`"${u.name}" u ${nextActive ? 'aktivizua' : 'çaktivizua'}. ✓`)
  }

  /* ── Filtered activity log ── */
  const filteredLog = useMemo(() => {
    let logs = activityLog
    if (logUserFilter !== 'all') logs = logs.filter(l => l.userId === logUserFilter)
    if (logSearch.trim()) {
      const q = logSearch.toLowerCase()
      logs = logs.filter(l =>
        (l.action     || '').toLowerCase().includes(q) ||
        (l.userName   || '').toLowerCase().includes(q) ||
        (l.module     || '').toLowerCase().includes(q)
      )
    }
    // Sort by timestamp descending (newest first)
    return logs.sort((a, b) => {
      const timeA = new Date(a.timestamp || 0).getTime()
      const timeB = new Date(b.timestamp || 0).getTime()
      return timeB - timeA
    })
  }, [activityLog, logUserFilter, logSearch])

  return (
    <div className="space-y-6">

      {/* User cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map(u => {
          const role = ROLE_META[u.role] || ROLE_META.editor
          const RoleIcon = role.icon
          const initials = u.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
          const isMe = u.id === currentUser?.id
          const isActive = u.active !== false

          return (
            <div key={u.id}
              className={`bg-white dark:bg-gray-800 rounded-2xl border shadow-sm p-4 transition-all duration-200 flex flex-col gap-4 ${
                !isActive ? 'opacity-75' : ''
              } ${
                isMe ? 'border-sky-300 dark:border-sky-700/80 ring-2 ring-sky-500/10 dark:ring-sky-400/10' : 'border-gray-200/90 dark:border-gray-700 hover:shadow-md'
              }`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-sm"
                      style={{ background: isActive ? u.color : '#94a3b8' }}>
                      {initials}
                    </div>
                    <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-gray-800 ${isActive ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="font-bold text-gray-900 dark:text-white text-base truncate">{u.name}</p>
                      {isMe && <span className="bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 text-[11px] font-bold px-2 py-0.5 rounded-full">Unë</span>}
                    </div>
                    <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 font-mono">@{u.username}</p>
                  </div>
                </div>

                {/* Actions */}
                {currentUser?.role === 'admin' && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      onClick={() => openEdit(u)} title="Edito përdoruesin">
                      <Pencil size={14} />
                    </button>
                    {!isMe && (
                      <button className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                        onClick={() => handleDelete(u)} title="Fshi përdoruesin">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Role + Status */}
              <div className="flex items-center justify-between">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${role.cls}`}>
                  <RoleIcon size={12} /> {role.label}
                </span>
                <span className={`inline-flex items-center gap-1.5 text-xs font-bold ${
                  isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-gray-500'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                  {isActive ? 'Aktiv' : 'Joaktiv'}
                </span>
              </div>

              {/* Footer: registration date + quick toggle */}
              <div className="pt-2.5 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between text-xs text-gray-400 dark:text-gray-500 font-medium">
                <span>Regjistruar: {new Date(u.createdAt).toLocaleDateString('sq-AL')}</span>
                {currentUser?.role === 'admin' && (
                  <button
                    onClick={() => handleToggleActive(u)}
                    disabled={isMe}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all flex items-center gap-1.5 active:scale-95 ${
                      isMe
                        ? 'opacity-40 cursor-not-allowed bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-400'
                        : isActive
                          ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-900/50 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50'
                          : 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-900/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50'
                    }`}
                    title={isMe ? 'Nuk mund të çaktivizosh vetveten' : isActive ? 'Çaktivizo përdoruesin' : 'Aktivizo përdoruesin'}
                  >
                    {isActive ? <><XCircle size={13}/> Çaktivizo</> : <><CheckCircle size={13}/> Aktivizo</>}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Activity Log */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/90 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-900/30 flex items-center justify-center flex-shrink-0">
              <Clock size={15} className="text-sky-600 dark:text-sky-400" />
            </span>
            <p className="text-sm font-bold text-gray-900 dark:text-white">Historia e aktivitetit</p>
            <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
              {filteredLog.length} / {activityLog.length}
            </span>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Searchbar */}
            <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-1.5 focus-within:border-blue-400 dark:focus-within:border-blue-500 transition-all">
              <Search size={13} className="text-gray-400 dark:text-gray-500 flex-shrink-0" />
              <input
                className="bg-transparent border-none outline-none text-xs font-medium text-gray-700 dark:text-gray-200 w-36 placeholder-gray-400 dark:placeholder-gray-500"
                placeholder="Kërko veprim..."
                value={logSearch}
                onChange={e => setLogSearch(e.target.value)}
              />
              {logSearch && (
                <button onClick={() => setLogSearch('')} className="text-gray-300 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-300">
                  <X size={11} />
                </button>
              )}
            </div>

            {/* User filter dropdown */}
            <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl px-2.5 py-1.5">
              <Filter size={12} className="text-gray-400 dark:text-gray-500" />
              <select
                className="bg-transparent border-none outline-none text-xs font-medium text-gray-700 dark:text-gray-200 cursor-pointer"
                value={logUserFilter}
                onChange={e => setLogUserFilter(e.target.value)}
              >
                <option value="all">Të gjithë</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>

            {/* Clear filters */}
            {(logSearch || logUserFilter !== 'all') && (
              <button
                className="text-xs font-bold text-gray-400 dark:text-gray-500 hover:text-blue-500 dark:hover:text-blue-400 flex items-center gap-1 transition-colors"
                onClick={() => { setLogSearch(''); setLogUserFilter('all') }}
              >
                <X size={11}/> Pastro
              </button>
            )}
          </div>
        </div>

        {filteredLog.length === 0 ? (
          <div className="py-14 text-center">
            <Package size={32} className="text-gray-200 dark:text-gray-700 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-400 dark:text-gray-500">
              {activityLog.length === 0
                ? 'Nuk ka aktivitet të regjistruar ende.'
                : 'Nuk u gjet asnjë veprim për këtë filtër.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-[420px] overflow-y-auto">
            {filteredLog.map(log => {
              const u = users.find(x => x.id === log.userId)
              const initials = (log.userName || '').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
              const modCls = MODULE_COLORS[log.module] || MODULE_COLORS['Sistemi']

              return (
                <div key={log.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50/80 dark:hover:bg-gray-700/40 transition-colors">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm"
                    style={{ background: u?.color || '#6b7280' }}>
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{log.action}</p>
                    <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 mt-0.5">{log.userName}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${modCls}`}>
                      {log.module}
                    </span>
                    <span className="text-[11px] font-mono font-medium text-gray-400 dark:text-gray-500 whitespace-nowrap hidden sm:block">
                      {fmtTime(log.timestamp)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
