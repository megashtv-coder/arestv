import { useState } from 'react'
import { Eye, EyeOff, AlertCircle } from 'lucide-react'

export default function Login({ onLogin }) {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const submit = (e) => {
    if (e) e.preventDefault()
    if (!email || !password) { setError('Plotëso të gjitha fushat.'); return }
    setLoading(true); setError('')
    setTimeout(() => {
      setLoading(false)
      if (password === 'demo1234') {
        onLogin()
      } else {
        setError('Fjalëkalim i gabuar. Provo: demo1234')
      }
    }, 900)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-purple-700 flex items-center justify-center p-4">
      <div className="absolute inset-0 opacity-10"
        style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">₣</div>
          <div>
            <p className="text-lg font-bold text-gray-800 leading-none">XFlow</p>
            <p className="text-[10px] text-gray-400 tracking-widest uppercase mt-0.5">Menaxhimi Financiar</p>
          </div>
        </div>

        <h2 className="text-xl font-bold text-gray-800 mb-1">Mirë se erdhe!</h2>
        <p className="text-sm text-gray-400 mb-6">Kyçu për të hyrë në panel</p>

        {/* Form me autoComplete — Chrome ruan kredencialet */}
        <form onSubmit={submit} autoComplete="on">
          <div className="mb-4">
            <label className="form-label">Email</label>
            <input
              className="form-control"
              type="email"
              name="username"
              autoComplete="username"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="email@kompania.ks"
            />
          </div>

          <div className="mb-5">
            <label className="form-label">Fjalëkalimi</label>
            <div className="relative">
              <input
                className="form-control pr-10"
                type={showPw ? 'text' : 'password'}
                name="password"
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

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 text-xs font-medium rounded-lg px-3 py-2.5 mb-4">
              <AlertCircle size={14} className="flex-shrink-0" />
              {error}
            </div>
          )}

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

        <div className="mt-5 p-3 bg-blue-50 rounded-xl text-center">
          <p className="text-xs text-blue-600 font-medium">Kredencialet demo:</p>
          <p className="text-xs text-blue-500 mt-0.5 font-mono">demo@financeflow.ks / demo1234</p>
        </div>
      </div>
    </div>
  )
}
