import { useState } from 'react'
import { UserCog, Eye, EyeOff, CheckCircle, XCircle, Shield, Edit3, Package } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Modal, FormGroup } from './UI'

export const ROLE_META = {
  admin:  { label: 'Admin',  cls: 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50',       icon: Shield },
  editor: { label: 'Editor', cls: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50', icon: Edit3 },
  viewer: { label: 'Viewer', cls: 'bg-gray-100 text-gray-600 border border-gray-200 dark:bg-gray-700/50 dark:text-gray-300 dark:border-gray-700',      icon: Eye },
  tester: { label: 'Tester', cls: 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/50', icon: Package },
}

const COLORS = ['#2563eb','#7c3aed','#059669','#d97706','#dc2626','#0891b2','#be185d','#0f766e']

/* ══════════════════════════════════════════════════════════
   Modal — shto / edito përdorues
   Në komponent të vetin (jo brenda Users.jsx) që Header.jsx ta
   përdorë pa tërhequr krejt Users.jsx në bundle-in kryesor
   (Users ngarkohet lazy, Header jo).
══════════════════════════════════════════════════════════ */
export function UserModal({ user, onClose }) {
  const { setUsers, showToast, currentUser, currentOrgId, logActivity } = useApp()
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
      ...(isEdit ? user : {}),
      id:        isEdit ? user.id : `USR-${Date.now()}`,
      name:      form.name.trim(),
      username:  form.username.trim().toLowerCase(),
      password:  form.password.trim(),
      role:      form.role,
      active:    form.active,
      color:     form.color,
      createdAt: isEdit ? user.createdAt : new Date().toISOString().slice(0, 10),
      orgId:     isEdit ? user.orgId : currentOrgId,
    }

    if (isEdit) {
      setUsers(prev => prev.map(u => u.id === user.id ? payload : u))
      logActivity(`Përditësoi të dhënat e përdoruesit "${payload.name}"`, 'Përdoruesit')
      showToast('Përdoruesi u përditësua! ✓')
    } else {
      setUsers(prev => [...prev, payload])
      logActivity(`Shtoi përdoruesin e ri "${payload.name}" (${ROLE_META[payload.role]?.label || payload.role})`, 'Përdoruesit')
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
      {err && <div className="text-xs text-blue-500 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 mb-4">{err}</div>}

      {/* Roli */}
      <FormGroup label="Roli *">
        <div className="flex gap-2">
          {Object.entries(ROLE_META).filter(([key]) => key !== 'viewer').map(([key, meta]) => {
            const Icon = meta.icon
            return (
              <button key={key} type="button" onClick={() => set('role', key)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold border-2 transition-all ${
                  form.role === key
                    ? key === 'admin'  ? 'border-blue-500 bg-blue-500 text-white'
                    : key === 'editor' ? 'border-emerald-600 bg-emerald-600 text-white'
                    :                   'border-gray-500 bg-gray-500 text-white'
                    : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400'
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
          <button className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
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
                form.active ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-gray-200 bg-white text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400'
              }`}>
              <CheckCircle size={12} /> Aktiv
            </button>
            <button type="button" onClick={() => set('active', false)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold border-2 transition-all ${
                !form.active ? 'border-blue-500 bg-blue-500 text-white' : 'border-gray-200 bg-white text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400'
              }`}>
              <XCircle size={12} /> Joaktiv
            </button>
          </div>
        </FormGroup>
      )}
    </Modal>
  )
}
