import { useState, useMemo } from 'react'
import {
  UserCog, Plus, Pencil, Trash2, Shield, Edit3,
  Eye, EyeOff, CheckCircle, XCircle, Clock, Package,
  Search, X, Filter,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Modal, FormGroup, EmptyState } from '../components/UI'

const ROLE_META = {
  admin:  { label: 'Admin',  cls: 'bg-blue-50 text-blue-700 border border-blue-100',   icon: Shield },
  editor: { label: 'Editor', cls: 'bg-emerald-50 text-emerald-700 border border-emerald-100', icon: Edit3 },
  viewer: { label: 'Viewer', cls: 'bg-gray-100 text-gray-600 border border-gray-200',  icon: Eye },
}

const COLORS = ['#2563eb','#7c3aed','#059669','#d97706','#dc2626','#0891b2','#be185d','#0f766e']

const MODULE_COLORS = {
  'Faturat':    'bg-blue-50 text-blue-600',
  'Klientët':   'bg-emerald-50 text-emerald-600',
  'Shpenzimet': 'bg-red-50 text-red-600',
  'Pagesat':    'bg-amber-50 text-amber-600',
  'Furnitorët': 'bg-purple-50 text-purple-600',
  'Sistemi':    'bg-gray-100 text-gray-500',
}

function fmtTime(ts) {
  const d = new Date(ts)
  return d.toLocaleDateString('sq-AL', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' })
}

/* ══════════════════════════════════════════════════════════
   User Modal
══════════════════════════════════════════════════════════ */
function UserModal({ user, onClose }) {
  const { setUsers, showToast, currentUser } = useApp()
  const isEdit = !!user

  const [form, setForm] = useState({
    name:     user?.name     || '',
    username: user?.username || '',
    password: user?.password || '',
    role:     user?.role     || 'editor',
    active:   user?.active   !== false,
    color:    user?.color    || COLORS[0],
  })
  const [showPw, setShowPw] = useState(false)
  const [err,    setErr]    = useState('')
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const save = () => {
    if (!form.name.trim())     { setErr('Emri është i detyrueshëm.'); return }
    if (!form.username.trim()) { setErr('Username-i është i detyrueshëm.'); return }
    if (!form.password.trim()) { setErr('Fjalëkalimi është i detyrueshëm.'); return }

    const payload = {
      id:        isEdit ? user.id : `USR-${Date.now()}`,
      name:      form.name.trim(),
      username:  form.username.trim().toLowerCase(),
      password:  form.password.trim(),
      role:      form.role,
      active:    form.active,
      color:     form.color,
      createdAt: isEdit ? user.createdAt : new Date().toISOString().slice(0, 10),
    }

    if (isEdit) {
      setUsers(prev => prev.map(u => u.id === user.id ? payload : u))
      showToast('Përdoruesi u përditësua! ✓')
    } else {
      setUsers(prev => [...prev, payload])
      showToast('Përdoruesi u shtua! ✓')
    }
    onClose()
  }

  const isProtected = isEdit && user.id === currentUser?.id

  return (
    <Modal
      title={
        <span className="flex items-center gap-2">
          <UserCog size={18} className="text-blue-500" />
          {isEdit ? `Edito — ${user.name}` : 'Përdorues i ri'}
        </span>
      }
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-outline" onClick={onClose}>Anulo</button>
          <button className="btn btn-primary" onClick={save}>
            {isEdit ? 'Ruaj ndryshimet' : 'Shto përdoruesin'}
          </button>
        </>
      }
    >
      {err && <div className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4">{err}</div>}

      {/* Roli */}
      <FormGroup label="Roli *">
        <div className="flex gap-2">
          {Object.entries(ROLE_META).map(([key, meta]) => {
            const Icon = meta.icon
            return (
              <button key={key} type="button" onClick={() => set('role', key)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold border-2 transition-all ${
                  form.role === key
                    ? key === 'admin'  ? 'border-blue-600 bg-blue-600 text-white'
                    : key === 'editor' ? 'border-emerald-600 bg-emerald-600 text-white'
                    :                   'border-gray-500 bg-gray-500 text-white'
                    : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                }`}>
                <Icon size={12} /> {meta.label}
              </button>
            )
          })}
        </div>
      </FormGroup>

      {/* Emri */}
      <FormGroup label="Emri i plotë *">
        <input className="form-control" value={form.name} onChange={e => set('name', e.target.value)}
          placeholder="p.sh. Ardit Krasniqi" autoFocus />
      </FormGroup>

      {/* Username */}
      <FormGroup label="Username *">
        <input className="form-control" value={form.username} onChange={e => set('username', e.target.value)}
          placeholder="p.sh. ardit" />
      </FormGroup>

      {/* Password */}
      <FormGroup label="Fjalëkalimi *">
        <div className="relative">
          <input className="form-control pr-10" type={showPw ? 'text' : 'password'}
            value={form.password} onChange={e => set('password', e.target.value)}
            placeholder="min. 6 karaktere" />
          <button className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            onClick={() => setShowPw(v => !v)}>
            {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
      </FormGroup>

      {/* Ngjyra */}
      <FormGroup label="Ngjyra e avatit">
        <div className="flex gap-2 mt-1">
          {COLORS.map(c => (
            <button key={c} type="button" onClick={() => set('color', c)}
              className="w-7 h-7 rounded-lg transition-all flex-shrink-0"
              style={{ background: c, outline: form.color === c ? `3px solid ${c}` : 'none', outlineOffset: 2 }} />
          ))}
        </div>
      </FormGroup>

      {/* Aktiv/Joaktiv */}
      {!isProtected && (
        <FormGroup label="Statusi">
          <div className="flex gap-2">
            <button type="button" onClick={() => set('active', true)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold border-2 transition-all ${
                form.active ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-gray-200 bg-white text-gray-500'
              }`}>
              <CheckCircle size={12} /> Aktiv
            </button>
            <button type="button" onClick={() => set('active', false)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold border-2 transition-all ${
                !form.active ? 'border-red-500 bg-red-500 text-white' : 'border-gray-200 bg-white text-gray-500'
              }`}>
              <XCircle size={12} /> Joaktiv
            </button>
          </div>
        </FormGroup>
      )}
    </Modal>
  )
}

/* ══════════════════════════════════════════════════════════
   Faqja kryesore
══════════════════════════════════════════════════════════ */
export default function UsersPage() {
  const { users, setUsers, setModal, closeModal, showToast, currentUser, activityLog } = useApp()

  /* ── Activity log filter state ── */
  const [logSearch,     setLogSearch]     = useState('')
  const [logUserFilter, setLogUserFilter] = useState('all')

  const openAdd  = ()  => setModal(<UserModal onClose={closeModal} />)
  const openEdit = (u) => setModal(<UserModal user={u} onClose={closeModal} />)

  const handleDelete = (u) => {
    if (u.id === currentUser?.id) { showToast('Nuk mund të fshish llogarinë tënde aktuale.', 'error'); return }
    if (!window.confirm(`A je i sigurt që dëshiron ta fshish "${u.name}"?`)) return
    setUsers(prev => prev.filter(x => x.id !== u.id))
    showToast(`"${u.name}" u fshi. ✓`)
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
    return logs.slice(0, 50)
  }, [activityLog, logUserFilter, logSearch])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Përdoruesit</h2>
          <p className="text-sm text-gray-400 mt-0.5">{users.length} përdorues të regjistruar</p>
        </div>
        {currentUser?.role === 'admin' && (
          <button className="btn btn-primary" onClick={openAdd}>
            <Plus size={16} /> Shto përdorues
          </button>
        )}
      </div>

      {/* User cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map(u => {
          const role = ROLE_META[u.role] || ROLE_META.editor
          const RoleIcon = role.icon
          const initials = u.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
          const isMe = u.id === currentUser?.id

          return (
            <div key={u.id}
              className={`bg-white dark:bg-gray-800 rounded-xl border p-5 transition-all duration-200 group ${
                isMe ? 'border-blue-200 dark:border-blue-800 shadow-sm' : 'border-gray-100 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-700 hover:shadow-md'
              }`}>
              <div className="flex items-start gap-3 mb-4">
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-base"
                    style={{ background: u.color }}>
                    {initials}
                  </div>
                  {isMe && (
                    <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white" title="Tu (aktiv)" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-gray-800 dark:text-gray-100 text-sm truncate">{u.name}</p>
                    {isMe && <span className="text-[10px] bg-blue-50 text-blue-600 font-bold px-1.5 py-0.5 rounded-full">Unë</span>}
                  </div>
                  <p className="text-xs text-gray-400 font-mono mt-0.5">@{u.username}</p>
                </div>

                {/* Actions */}
                {currentUser?.role === 'admin' && (
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"
                      onClick={() => openEdit(u)}>
                      <Pencil size={13} />
                    </button>
                    {!isMe && (
                      <button className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                        onClick={() => handleDelete(u)}>
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Role + Status */}
              <div className="flex items-center justify-between">
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${role.cls}`}>
                  <RoleIcon size={10} /> {role.label}
                </span>
                <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                  u.active !== false ? 'text-emerald-600' : 'text-red-500'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${u.active !== false ? 'bg-emerald-500' : 'bg-red-400'}`} />
                  {u.active !== false ? 'Aktiv' : 'Joaktiv'}
                </span>
              </div>

              <p className="text-[10px] text-gray-400 mt-2">
                Regjistruar: {new Date(u.createdAt).toLocaleDateString('sq-AL')}
              </p>
            </div>
          )
        })}
      </div>

      {/* Activity Log */}
      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-gray-400" />
            <p className="text-sm font-bold text-gray-800 dark:text-gray-100">Historia e aktivitetit</p>
            <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
              {filteredLog.length} / {activityLog.length}
            </span>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Searchbar */}
            <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-2.5 py-1.5
                            focus-within:border-blue-400 focus-within:bg-white dark:focus-within:bg-gray-800 transition-all">
              <Search size={12} className="text-gray-400 flex-shrink-0" />
              <input
                className="bg-transparent border-none outline-none text-xs text-gray-600 dark:text-gray-300 w-36 placeholder-gray-400"
                placeholder="Kërko veprim..."
                value={logSearch}
                onChange={e => setLogSearch(e.target.value)}
              />
              {logSearch && (
                <button onClick={() => setLogSearch('')} className="text-gray-300 hover:text-gray-500">
                  <X size={11} />
                </button>
              )}
            </div>

            {/* User filter dropdown */}
            <div className="flex items-center gap-1.5">
              <Filter size={11} className="text-gray-400" />
              <select
                className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-2.5 py-1.5 text-xs text-gray-600 dark:text-gray-300 outline-none focus:border-blue-400 cursor-pointer"
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
                className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 transition-colors"
                onClick={() => { setLogSearch(''); setLogUserFilter('all') }}
              >
                <X size={11}/> Pastro
              </button>
            )}
          </div>
        </div>

        {filteredLog.length === 0 ? (
          <div className="py-12 text-center">
            <Package size={32} className="text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">
              {activityLog.length === 0
                ? 'Nuk ka aktivitet të regjistruar ende.'
                : 'Nuk u gjet asnjë veprim për këtë filtër.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {filteredLog.map(log => {
              const u = users.find(x => x.id === log.userId)
              const initials = (log.userName || '').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
              const modCls = MODULE_COLORS[log.module] || MODULE_COLORS['Sistemi']

              return (
                <div key={log.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ background: u?.color || '#6b7280' }}>
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 dark:text-gray-200 truncate">{log.action}</p>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">{log.userName}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${modCls}`}>
                      {log.module}
                    </span>
                    <span className="text-[11px] text-gray-400 dark:text-gray-500 whitespace-nowrap hidden sm:block">
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
