import { useState } from 'react'
import { Eye, EyeOff, AlertCircle, Zap } from 'lucide-react'

export default function Login({ users = [], onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const submit = async (e) => {
  e?.preventDefault()
  if (!username || !password) { setError('Plotëso të gjitha fushat.'); return }

  setLoading(true)
  setError('')

  try {
    console.log('🔐 Logging in with username:', username)

    // Find user in local users list
    const user = users.find(u => u.username === username && u.password === password)

    if (!user) {
      throw new Error('Emri i përdoruesit ose fjalëkalimi i pasaktë')
    }

    console.log('✅ Login successful:', user.username)
    onLogin(user)

  } catch (err) {
    console.error('❌ Login error:', err)
    setError(err.message || 'Login failed')
  } finally {
    setLoading(false)
  }
}

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 opacity-[0.04]"
        style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '28px 28px' }}
      />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center text-white shadow-md">
            <Zap size={20} strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-lg font-black text-gray-900 leading-none tracking-tight">AresTV Flow</p>
            <p className="text-[10px] text-gray-400 tracking-widest uppercase mt-0.5">Menaxhimi Financiar</p>
          </div>
        </div>

        <h2 className="text-xl font-bold text-gray-800 mb-1">Mirë se erdhe!</h2>
        <p className="text-sm text-gray-400 mb-6">Kyçu me llogarinë tënde</p>

        <form onSubmit={submit} autoComplete="on">
          {/* Username */}
          <div className="mb-4">
            <label className="form-label" htmlFor="login-username">Emri i përdoruesit</label>
            <input
              id="login-username"
              name="username"
              className="form-control"
              type="text"
              autoComplete="username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="p.sh. xpmx"
              autoFocus
            />
          </div>

          {/* Password */}
          <div className="mb-5">
            <label className="form-label" htmlFor="login-password">Fjalëkalimi</label>
            <div className="relative">
              <input
                id="login-password"
                name="password"
                className="form-control pr-10"
                type={showPw ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                onClick={() => setShowPw(v => !v)}
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 text-blue-600 text-xs font-medium rounded-lg px-3 py-2.5 mb-4">
              <AlertCircle size={14} className="flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            className="btn btn-primary w-full justify-center py-2.5"
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
        </form>
      </div>
    </div>
  )
}
