import { useState } from 'react'
import { Eye, EyeOff, AlertCircle, User, Lock, Sun, Moon, ArrowRight } from 'lucide-react'
import { useApp } from '../context/AppContext'

export default function Login({ users = [], onLogin }) {
  const { darkMode, setDarkMode } = useApp()
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
      const user = users.find(u => u.username === username && u.password === password)
      if (!user) throw new Error('Kredencialet janë të pasakta')
      onLogin(user)
    } catch (err) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden bg-slate-50 dark:bg-dk-side">
      {/* Shkëlqim ambienti */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(59,130,246,0.07),transparent_70%)] dark:bg-[radial-gradient(circle_at_50%_40%,rgba(59,130,246,0.10),transparent_70%)]"
      />

      {/* Ndërrimi i temës */}
      <div className="relative z-10 flex items-center justify-end px-6 py-5">
        <button
          type="button"
          onClick={() => setDarkMode(d => !d)}
          aria-label="Ndrysho temën"
          title="Ndrysho temën"
          className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-blue-500 hover:border-blue-300 dark:border-white/[0.08] dark:bg-dk-low dark:text-amber-400 dark:hover:border-accent/50 transition-all active:scale-95"
        >
          {darkMode ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>

      <main className="relative z-10 flex-1 flex items-center justify-center px-4 pb-12">
        <div className="w-full max-w-[430px] rounded-2xl border border-slate-200 bg-white p-8 sm:p-9 shadow-xl shadow-slate-200/60 dark:border-white/[0.08] dark:bg-dk-low dark:shadow-2xl dark:shadow-black/60">
          {/* Logo */}
          <div className="flex flex-col items-center mb-6">
            <img src="/aflow-logo.svg" alt="A Flow" className="w-20 h-20 object-contain mb-2" />
            <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">A Flow</h1>
            <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400 dark:text-[#8b8e99] mt-0.5">Menaxhimi Financiar</p>
          </div>

          {/* Titulli */}
          <div className="text-center mb-7">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Kyçu</h2>
            <p className="text-sm text-gray-500 dark:text-[#8b8e99] mt-1">Hyr në llogarinë tuaj</p>
          </div>

          <form onSubmit={submit} autoComplete="on" className="space-y-4">
            {/* Përdoruesi */}
            <div className="space-y-1.5">
              <label htmlFor="login-username" className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-[#8b8e99]">Emri i përdoruesit</label>
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500 pointer-events-none" />
                <input
                  id="login-username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={e => { setUsername(e.target.value); setError('') }}
                  placeholder="username"
                  autoFocus
                  className="w-full py-3 rounded-xl border border-slate-300 bg-white text-sm font-medium text-slate-900 placeholder-slate-400 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-white/10 dark:bg-dk-card dark:text-gray-100 dark:placeholder-gray-500 dark:focus:border-accent dark:focus:ring-accent/30 pl-10 pr-4"
                />
              </div>
            </div>

            {/* Fjalëkalimi */}
            <div className="space-y-1.5">
              <label htmlFor="login-password" className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-[#8b8e99]">Fjalëkalimi</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500 pointer-events-none" />
                <input
                  id="login-password"
                  name="password"
                  type={showPw ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError('') }}
                  placeholder="••••••••"
                  className="w-full py-3 rounded-xl border border-slate-300 bg-white text-sm font-medium text-slate-900 placeholder-slate-400 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-white/10 dark:bg-dk-card dark:text-gray-100 dark:placeholder-gray-500 dark:focus:border-accent dark:focus:ring-accent/30 pl-10 pr-11"
                />
                <button
                  type="button"
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
                  onClick={() => setShowPw(v => !v)}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Gabimi */}
            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 dark:bg-[#93000a]/30 dark:border-transparent dark:text-[#ffb4ab] text-xs font-medium rounded-lg px-3 py-2">
                <AlertCircle size={14} className="flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Hyrja */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 dark:bg-accent dark:hover:bg-accent/90 text-white dark:text-accent-on font-semibold text-sm shadow-lg shadow-blue-500/25 dark:shadow-accent/30 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Duke u kyçur...
                </>
              ) : (
                <>
                  {'Kyçu'}
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
