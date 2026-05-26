import { X, CheckCircle, AlertCircle, TrendingUp, TrendingDown } from 'lucide-react'

export function StatusBadge({ status }) {
  const map = {
    paid:    { cls: 'badge-paid',    label: 'Paguar' },
    partial: { cls: 'badge-pending', label: 'Pjesërisht e paguar' },
    pending: { cls: 'badge-pending', label: 'Në pritje' },
    overdue: { cls: 'badge-overdue', label: 'Vonuar' },
    draft:   { cls: 'badge-draft',   label: 'Draft' },
    void:    { cls: 'badge-draft',   label: 'Void' },
  }
  const { cls, label } = map[status] || map.draft
  return (
    <span className={`badge ${cls}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {label}
    </span>
  )
}

export function Toast({ msg, type, onClose }) {
  const isSuccess = type === 'success'
  return (
    <div className={`fixed bottom-6 right-6 z-[9999] flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-semibold toast-enter ${isSuccess ? 'bg-emerald-600' : 'bg-red-500'}`}>
      {isSuccess ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
      {msg}
      <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100"><X size={14} /></button>
    </div>
  )
}

export function Skeleton({ h = 16, className = '' }) {
  return <div className={`skeleton ${className}`} style={{ height: h }} />
}

export function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <div key={i} className="stat-card"><Skeleton h={80} /></div>)}
      </div>
      <div className="card p-6 space-y-3">
        {[1,2,3,4,5].map(i => <Skeleton key={i} h={20} />)}
      </div>
    </div>
  )
}

export function EmptyState({ icon: Icon, title, sub, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
        <Icon size={28} className="text-gray-300" />
      </div>
      <p className="text-base font-semibold text-gray-500 mb-1">{title}</p>
      {sub && <p className="text-sm text-gray-400 mb-4">{sub}</p>}
      {action}
    </div>
  )
}

export function StatCard({ icon: Icon, iconBg, iconColor, val, label, badge, badgeUp, sub }) {
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: iconBg }}>
          <Icon size={20} style={{ color: iconColor }} />
        </div>
        {badge && (
          <span className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${badgeUp ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
            {badgeUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            {badge}
          </span>
        )}
      </div>
      <div className="text-2xl font-bold text-gray-800 tracking-tight">{val}</div>
      <div className="text-xs text-gray-400 mt-1 font-medium">{label}</div>
      {sub && <div className="text-xs text-gray-400 mt-3 pt-3 border-t border-gray-50">{sub}</div>}
    </div>
  )
}

export function Modal({ title, children, footer, onClose, userColor, userInitials }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-800">{title}</h2>
          <div className="flex items-center gap-3">
            {/* 🆕 User Icon */}
            {userInitials && (
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                style={{ background: userColor || '#2563eb' }}
                title="Përdoruesi i loguar"
              >
                {userInitials}
              </div>
            )}
            <button className="icon-btn" onClick={onClose}><X size={18} /></button>
          </div>
        </div>
        <div className="px-6 py-5">{children}</div>
        {footer && <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">{footer}</div>}
      </div>
    </div>
  )
}

export function Pagination({ page, total, perPage, onChange }) {
  const pages = Math.ceil(total / perPage)
  if (pages <= 1) return null

  const getWindow = () => {
    const delta = 2
    const range = []
    for (let i = Math.max(2, page - delta); i <= Math.min(pages - 1, page + delta); i++) range.push(i)
    const result = [1]
    if (range[0] > 2) result.push('...')
    range.forEach(p => result.push(p))
    if (range[range.length - 1] < pages - 1) result.push('...')
    if (pages > 1) result.push(pages)
    return result
  }

  const btn = active =>
    `min-w-[2rem] h-8 px-2 flex items-center justify-center rounded-lg text-sm font-medium transition-all ${
      active ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100'
    }`

  return (
    <div className="flex items-center gap-1 px-4 py-3 border-t border-gray-50 flex-wrap">
      <button className="w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-100 disabled:opacity-30"
        onClick={() => onChange(1)} disabled={page === 1} title="E para">«</button>
      <button className="w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-100 disabled:opacity-30"
        onClick={() => onChange(page - 1)} disabled={page === 1}>‹</button>
      {getWindow().map((p, i) =>
        p === '...'
          ? <span key={`e${i}`} className="w-8 h-8 flex items-center justify-center text-gray-400 text-sm select-none">…</span>
          : <button key={p} onClick={() => onChange(p)} className={btn(page === p)}>{p}</button>
      )}
      <button className="w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-100 disabled:opacity-30"
        onClick={() => onChange(page + 1)} disabled={page === pages}>›</button>
      <button className="w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-100 disabled:opacity-30"
        onClick={() => onChange(pages)} disabled={page === pages} title="E fundit">»</button>
      <span className="ml-auto text-xs text-gray-400">{total} rezultate · faqja {page}/{pages}</span>
    </div>
  )
}

export function Toggle({ on, onToggle }) {
  return (
    <div className={`toggle ${on ? 'bg-blue-600' : 'bg-gray-200'}`} onClick={onToggle}>
      <div className={`toggle-knob ${on ? 'translate-x-[18px]' : ''}`} />
    </div>
  )
}

export function FormGroup({ label, children }) {
  return (
    <div className="mb-4">
      <label className="form-label">{label}</label>
      {children}
    </div>
  )
}

export function Avatar({ name, color, size = 40 }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div
      className="flex items-center justify-center rounded-xl font-bold text-white flex-shrink-0"
      style={{ width: size, height: size, background: color || '#2563eb', fontSize: size * 0.35 }}
    >
      {initials}
    </div>
  )
}
