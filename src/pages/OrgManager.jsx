import { useState } from 'react'
import {
  Building2, Plus, Pencil, Trash2, Users, X,
  CheckCircle2, Clock, Crown, ChevronRight, UserPlus,
  Shield, Edit3,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Modal, FormGroup, EmptyState } from '../components/UI'

const STATUS_COLORS = {
  active:   'bg-green-50 text-green-700 border border-green-100',
  inactive: 'bg-gray-50 text-gray-500 border border-gray-200',
  trial:    'bg-amber-50 text-amber-700 border border-amber-100',
}
const PLAN_COLORS = {
  pro:   'bg-blue-50 text-blue-600',
  basic: 'bg-gray-50 text-gray-600',
  free:  'bg-slate-50 text-slate-500',
}
const ORG_COLORS = ['#7c3aed','#2563eb','#059669','#d97706','#dc2626','#0891b2','#be185d','#0f766e']
const ROLE_META = {
  admin:  { label: 'Admin',  cls: 'bg-purple-50 text-purple-700 border border-purple-100' },
  editor: { label: 'Editor', cls: 'bg-blue-50 text-blue-600 border border-blue-100' },
  viewer: { label: 'Viewer', cls: 'bg-gray-50 text-gray-500 border border-gray-200' },
  tester: { label: 'Tester', cls: 'bg-orange-50 text-orange-700 border border-orange-100' },
}

/* ── Modal Org ── */
function OrgModal({ org, onClose }) {
  const { setOrganizations, showToast } = useApp()
  const isEdit = !!org
  const empty  = { name: '', shortName: '', description: '', plan: 'pro', status: 'active', color: ORG_COLORS[0], createdAt: new Date().toISOString().slice(0,10) }
  const [form, setForm] = useState(isEdit ? { ...org } : empty)
  const [err,  setErr]  = useState('')

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const save = () => {
    if (!form.name.trim()) { setErr('Emri i organizatës është i detyrueshëm.'); return }
    if (!form.shortName.trim()) { setErr('Emri i shkurtër është i detyrueshëm.'); return }
    if (isEdit) {
      setOrganizations(prev => prev.map(o => o.id === org.id ? { ...form } : o))
      showToast('Organizata u përditësua! ✓')
    } else {
      setOrganizations(prev => [...prev, { ...form, id: `ORG-${Date.now()}` }])
      showToast('Organizata u krijua! ✓')
    }
    onClose()
  }

  return (
    <Modal
      title={
        <span className="flex items-center gap-2">
          <Building2 size={18} className="text-blue-500" />
          {isEdit ? 'Edito organizatën' : 'Organizatë e re'}
        </span>
      }
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-outline" onClick={onClose}>Anulo</button>
          <button className="btn btn-primary" onClick={save}>{isEdit ? 'Ruaj' : 'Krijo'}</button>
        </>
      }
    >
      {err && <div className="text-xs text-blue-500 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 mb-4">{err}</div>}

      <div className="grid grid-cols-2 gap-4">
        <FormGroup label="Emri i plotë *">
          <input className="form-control" value={form.name} onChange={e => set('name', e.target.value)}
            placeholder="p.sh. MEGA SH TV" autoFocus />
        </FormGroup>
        <FormGroup label="Emri i shkurtër *">
          <input className="form-control" value={form.shortName} onChange={e => set('shortName', e.target.value.toUpperCase())}
            placeholder="p.sh. MEGA" maxLength={10} />
        </FormGroup>
      </div>

      <FormGroup label="Përshkrimi">
        <input className="form-control" value={form.description} onChange={e => set('description', e.target.value)}
          placeholder="Shënime rreth organizatës..." />
      </FormGroup>

      <div className="grid grid-cols-2 gap-4">
        <FormGroup label="Plani">
          <select className="form-control" value={form.plan} onChange={e => set('plan', e.target.value)}>
            <option value="pro">Pro</option>
            <option value="basic">Basic</option>
            <option value="free">Free</option>
          </select>
        </FormGroup>
        <FormGroup label="Statusi">
          <select className="form-control" value={form.status} onChange={e => set('status', e.target.value)}>
            <option value="active">Aktiv</option>
            <option value="inactive">Joaktiv</option>
            <option value="trial">Trial</option>
          </select>
        </FormGroup>
      </div>

      <FormGroup label="Ngjyra">
        <div className="flex gap-2 flex-wrap">
          {ORG_COLORS.map(c => (
            <button key={c} type="button"
              onClick={() => set('color', c)}
              className={`w-7 h-7 rounded-full transition-all ${form.color === c ? 'ring-2 ring-offset-2 ring-blue-500 scale-110' : 'opacity-60 hover:opacity-100'}`}
              style={{ background: c }}
            />
          ))}
        </div>
      </FormGroup>
    </Modal>
  )
}

/* ── Modal Fshi Org ── */
function DeleteOrgModal({ org, onClose }) {
  const { setOrganizations, users, setUsers, showToast } = useApp()
  const orgUsers = users.filter(u => u.orgId === org.id)

  const del = () => {
    setOrganizations(prev => prev.filter(o => o.id !== org.id))
    if (orgUsers.length) setUsers(prev => prev.filter(u => u.orgId !== org.id))
    showToast(`Organizata "${org.name}" u fshi.`, 'error')
    onClose()
  }

  return (
    <Modal
      title={<span className="flex items-center gap-2 text-blue-500"><Trash2 size={16}/>Fshi organizatën</span>}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-outline" onClick={onClose}>Anulo</button>
          <button className="btn bg-blue-500 hover:bg-blue-600 text-white" onClick={del}>Fshi</button>
        </>
      }
    >
      <p className="text-sm text-gray-600">
        A jeni i sigurt që dëshironi të fshini <span className="font-bold text-gray-800">"{org.name}"</span>?
      </p>
      {orgUsers.length > 0 && (
        <p className="text-xs text-blue-500 mt-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
          Kjo do të fshijë edhe <strong>{orgUsers.length} përdorues</strong> të kësaj organizate.
        </p>
      )}
    </Modal>
  )
}

/* ── Modal Shto User te Org ── */
function AddUserToOrgModal({ org, onClose }) {
  const { users, setUsers, showToast } = useApp()
  const COLORS = ['#2563eb','#7c3aed','#059669','#d97706','#dc2626','#0891b2','#be185d','#0f766e']
  const empty = { name: '', username: '', password: '', role: 'editor' }
  const [form, setForm] = useState(empty)
  const [err,  setErr]  = useState('')

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const save = () => {
    if (!form.name.trim())     { setErr('Emri është i detyrueshëm.'); return }
    if (!form.username.trim()) { setErr('Username është i detyrueshëm.'); return }
    if (!form.password.trim()) { setErr('Fjalëkalimi është i detyrueshëm.'); return }
    if (users.find(u => u.username === form.username)) { setErr('Ky username ekziston tashmë.'); return }

    const newUser = {
      ...form,
      id:        `USR-${Date.now()}`,
      orgId:     org.id,
      active:    true,
      createdAt: new Date().toISOString().slice(0, 10),
      color:     COLORS[users.length % COLORS.length],
    }
    setUsers(prev => [...prev, newUser])
    showToast(`Përdoruesi "${form.name}" u shtua te ${org.shortName}! ✓`)
    onClose()
  }

  return (
    <Modal
      title={
        <span className="flex items-center gap-2">
          <UserPlus size={18} className="text-blue-500"/>
          Shto përdorues — {org.shortName}
        </span>
      }
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-outline" onClick={onClose}>Anulo</button>
          <button className="btn btn-primary" onClick={save}>Shto</button>
        </>
      }
    >
      {err && <div className="text-xs text-blue-500 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 mb-4">{err}</div>}
      <FormGroup label="Emri i plotë *">
        <input className="form-control" value={form.name} onChange={e => set('name', e.target.value)} autoFocus />
      </FormGroup>
      <div className="grid grid-cols-2 gap-4">
        <FormGroup label="Username *">
          <input className="form-control" value={form.username} onChange={e => set('username', e.target.value)} />
        </FormGroup>
        <FormGroup label="Fjalëkalimi *">
          <input className="form-control" type="password" value={form.password} onChange={e => set('password', e.target.value)} />
        </FormGroup>
      </div>
      <FormGroup label="Roli">
        <select className="form-control" value={form.role} onChange={e => set('role', e.target.value)}>
          <option value="admin">Admin</option>
          <option value="editor">Editor</option>
          <option value="viewer">Viewer</option>
          <option value="tester">Tester</option>
        </select>
      </FormGroup>
    </Modal>
  )
}

/* ── Panel i detajeve të org ── */
function OrgDetailPanel({ org, onClose }) {
  const { users, setUsers, setModal, closeModal, showToast } = useApp()
  const orgUsers = users.filter(u => u.orgId === org.id)

  const removeUser = (userId) => {
    setUsers(prev => prev.filter(u => u.id !== userId))
    showToast('Përdoruesi u hoq nga organizata.', 'error')
  }

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-end">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 w-full max-w-sm h-full shadow-2xl flex flex-col overflow-hidden">
        {/* Header - responsive */}
        <div className="flex items-center justify-between p-3 sm:p-5 border-b border-gray-100 dark:border-gray-800 gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center text-white font-bold text-xs sm:text-sm flex-shrink-0"
              style={{ background: org.color }}>
              {org.shortName?.slice(0,2)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-gray-900 dark:text-white text-sm truncate">{org.name}</p>
              <p className="text-xs text-gray-400">{orgUsers.length} përdorues</p>
            </div>
          </div>
          <button onClick={onClose} className="icon-btn flex-shrink-0"><X size={18}/></button>
        </div>

        {/* Users list - responsive */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 mb-4">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Përdoruesit</p>
            <button
              className="btn btn-primary btn-sm text-xs self-start"
              onClick={() => setModal(<AddUserToOrgModal org={org} onClose={closeModal}/>)}
            >
              <UserPlus size={13}/> <span className="hidden xs:inline">Shto</span>
            </button>
          </div>

          {orgUsers.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Users size={28} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nuk ka përdorues</p>
            </div>
          ) : (
            <div className="space-y-2">
              {orgUsers.map(u => (
                <div key={u.id} className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-gray-50 dark:bg-gray-800 rounded-lg sm:rounded-xl">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ background: u.color || '#2563eb' }}>
                    {u.name?.slice(0,2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 sm:gap-2">
                      <p className="text-xs sm:text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{u.name}</p>
                      {u.isSuperAdmin && <Crown size={10} className="text-amber-500 flex-shrink-0" title="Super Admin"/>}
                    </div>
                    <p className="text-xs text-gray-400 truncate">@{u.username}</p>
                  </div>
                  <span className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full font-medium flex-shrink-0 whitespace-nowrap ${ROLE_META[u.role]?.cls || ''}`}>
                    {ROLE_META[u.role]?.label || u.role}
                  </span>
                  {!u.isSuperAdmin && (
                    <button
                      className="icon-btn text-blue-400 hover:bg-blue-50 flex-shrink-0 p-1"
                      title="Hiq nga org"
                      onClick={() => removeUser(u.id)}
                    >
                      <X size={13}/>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════
   Faqja kryesore OrgManager
══════════════════════════════════════════════════════════ */
export default function OrgManager() {
  const { organizations, users, setModal, closeModal } = useApp()
  const [detailOrg, setDetailOrg] = useState(null)

  const openCreate = () => setModal(<OrgModal onClose={closeModal} />)
  const openEdit   = org => setModal(<OrgModal org={org} onClose={closeModal} />)
  const openDelete = org => setModal(<DeleteOrgModal org={org} onClose={closeModal} />)

  const totalUsers = users.filter(u => !u.isSuperAdmin || u.orgId).length

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2 truncate">
            <Building2 size={20} className="text-blue-500 flex-shrink-0" />
            <span className="truncate">Menaxhimi i Organizatave</span>
          </h2>
          <p className="text-xs sm:text-sm text-gray-400 mt-0.5 truncate">{organizations.length} organizata · {totalUsers} përdorues gjithsej</p>
        </div>
        <button
          type="button"
          className="btn btn-primary btn-sm self-start sm:self-auto flex-shrink-0 cursor-pointer hover:opacity-90 active:scale-95 transition-all"
          onClick={() => {
            console.log('Opening create org modal')
            openCreate()
          }}
        >
          <Plus size={16}/> <span className="hidden xs:inline">Organizatë e re</span><span className="inline xs:hidden">E re</span>
        </button>
      </div>

      {/* Stat strip - responsive */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4 mb-6 sm:mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl border border-gray-100 dark:border-gray-700 px-3 sm:px-5 py-3 sm:py-4">
          <p className="text-lg sm:text-2xl font-bold text-gray-800 dark:text-white">{organizations.length}</p>
          <p className="text-xs text-gray-400 mt-0.5">Organizata</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl border border-gray-100 dark:border-gray-700 px-3 sm:px-5 py-3 sm:py-4">
          <p className="text-lg sm:text-2xl font-bold text-green-600">{organizations.filter(o => o.status === 'active').length}</p>
          <p className="text-xs text-gray-400 mt-0.5">Aktive</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl border border-gray-100 dark:border-gray-700 px-3 sm:px-5 py-3 sm:py-4 col-span-2 sm:col-span-1">
          <p className="text-lg sm:text-2xl font-bold text-blue-500">{totalUsers}</p>
          <p className="text-xs text-gray-400 mt-0.5">Përdorues</p>
        </div>
      </div>

      {/* Orgs grid - fully responsive */}
      {organizations.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Nuk ka organizata"
          sub="Krijo organizatën e parë"
          action={<button className="btn btn-primary mt-2" onClick={openCreate}><Plus size={14}/> Krijo</button>}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {organizations.map(org => {
            const orgUsers = users.filter(u => u.orgId === org.id)
            return (
              <div key={org.id}
                className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col overflow-hidden"
              >
                {/* Color bar */}
                <div className="h-1 sm:h-1.5 w-full" style={{ background: org.color }} />

                <div className="p-3 sm:p-5 flex-1">
                  {/* Top row - responsive */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-3 mb-3">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl flex items-center justify-center text-white font-black text-xs sm:text-sm shadow-sm flex-shrink-0"
                        style={{ background: org.color }}>
                        {org.shortName?.slice(0,2) || org.name?.slice(0,2)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-gray-900 dark:text-white text-sm leading-tight truncate">{org.name}</p>
                        <p className="text-xs text-gray-400 truncate">{org.shortName}</p>
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <span className={`text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full font-semibold whitespace-nowrap ${STATUS_COLORS[org.status] || ''}`}>
                        {org.status === 'active' ? 'Aktiv' : org.status === 'trial' ? 'Trial' : 'Joaktiv'}
                      </span>
                      <span className={`text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full font-semibold whitespace-nowrap ${PLAN_COLORS[org.plan] || ''}`}>
                        {org.plan?.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {org.description && (
                    <p className="text-xs text-gray-400 mb-2 line-clamp-2">{org.description}</p>
                  )}

                  {/* Users avatars - responsive */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex -space-x-2">
                      {orgUsers.slice(0, 5).map(u => (
                        <div key={u.id}
                          className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 border-white flex items-center justify-center text-white text-[8px] sm:text-[9px] font-bold"
                          style={{ background: u.color || '#2563eb' }}
                          title={u.name}
                        >
                          {u.name?.slice(0,1)}
                        </div>
                      ))}
                      {orgUsers.length > 5 && (
                        <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center text-[8px] sm:text-[9px] font-bold text-gray-500">
                          +{orgUsers.length - 5}
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 whitespace-nowrap">{orgUsers.length} përdorues</span>
                  </div>

                  {/* Stats row */}
                  <div className="text-xs text-gray-400 flex items-center gap-1">
                    <Clock size={10} className="flex-shrink-0" />
                    <span className="truncate">Krijuar {org.createdAt}</span>
                  </div>
                </div>

                {/* Actions footer - responsive */}
                <div className="border-t border-gray-50 dark:border-gray-700 px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between gap-2">
                  <button
                    className="flex items-center gap-1 text-xs sm:text-sm text-blue-500 hover:text-blue-600 font-semibold transition-colors min-w-0"
                    onClick={() => setDetailOrg(org)}
                  >
                    <Users size={12} className="flex-shrink-0"/>
                    <span className="hidden sm:inline">Shiko përdoruesit</span>
                    <span className="inline sm:hidden">Përdoruesit</span>
                    <ChevronRight size={11} className="flex-shrink-0 hidden sm:inline"/>
                  </button>
                  <div className="flex gap-0.5 sm:gap-1 flex-shrink-0">
                    <button
                      className="icon-btn text-blue-400 hover:bg-blue-50 hover:text-blue-500 p-1.5 sm:p-2"
                      title="Edito"
                      onClick={() => openEdit(org)}
                    >
                      <Edit3 size={13}/>
                    </button>
                    <button
                      className="icon-btn text-blue-400 hover:bg-blue-50 hover:text-blue-500 p-1.5 sm:p-2"
                      title="Fshi"
                      onClick={() => openDelete(org)}
                    >
                      <Trash2 size={13}/>
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Detail panel */}
      {detailOrg && (
        <OrgDetailPanel org={detailOrg} onClose={() => setDetailOrg(null)} />
      )}
    </div>
  )
}
