import { useState } from 'react'
import { Eye, EyeOff, AlertCircle, Zap } from 'lucide-react'

export default function Login({ users = [], onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const submit = () => {
    if (!username || !password) { setError('Plotëso të gjitha fushat.'); return }
    setLoading(true); setError('')
    setTimeout(() => {
      setLoading(false)
      const user = users.find(
        u => u.username === username.trim().toLowerCase() &&
             u.password === password &&
             u.active !== false
      )
      if (user) { onLogin(user) }
      else { setError('Username ose fjalëkalim i gabuar.') }
    }, 800)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      {/* Grid pattern */}
      <div className="absolute inset-0 opacity-[0.04]"
        style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '28px 28px' }}
      />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl flex items-center justify-center text-white shadow-md">
            <Zap size={20} strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-lg font-black text-gray-900 leading-none tracking-tight">X-Flow</p>
            <p className="text-[10px] text-gray-400 tracking-widest uppercase mt-0.5">Menaxhimi Financiar</p>
          </div>
        </div>

        <h2 className="text-xl font-bold text-gray-800 mb-1">Mirë se erdhe!</h2>
        <p className="text-sm text-gray-400 mb-6">Kyçu me llogarinë tënde</p>

        {/* Username */}
        <div className="mb-4">
          <label className="form-label">Username</label>
          <input
            className="form-control"
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="username..."
            autoFocus
            onKeyDown={e => e.key === 'Enter' && submit()}
          />
        </div>

        {/* Password */}
        <div className="mb-5">
          <label className="form-label">Fjalëkalimi</label>
          <div className="relative">
            <input
              className="form-control pr-10"
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              onKeyDown={e => e.key === 'Enter' && submit()}
            />
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              onClick={() => setShowPw(v => !v)}
            >
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 text-xs font-medium rounded-lg px-3 py-2.5 mb-4">
            <AlertCircle size={14} className="flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          className="btn btn-primary w-full justify-center py-2.5"
          onClick={submit}
          disabled={loading}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity=".25" strokeWidth="4"/>
                <path d="M22 12a10 10 0 01-10 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/>
              </svg>
              Duke u kyçur...
            </span>
          ) : 'Kyçu në sistem'}
        </button>

        {/* Demo users */}
        <div className="mt-5 p-3 bg-blue-50 rounded-xl">
          <p className="text-xs text-blue-700 font-bold mb-2">Kredencialet demo:</p>
          {users.map(u => (
            <button
              key={u.id}
              className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-blue-100 transition-colors text-left"
              onClick={() => { setUsername(u.username); setPassword(u.password) }}
            >
              <span className="text-xs text-blue-800 font-semibold">{u.name}</span>
              <span className="text-[10px] text-blue-500 font-mono">{u.username} / {u.password}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
