import { useState, useMemo, useEffect } from 'react'
import { Plus, Trash2, Pencil, X, Calendar, CheckCircle2, ListTodo, Search, Clock, AlertTriangle, User } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { formatDate } from '../utils/dateFormat'
import { supabase } from '../lib/supabase'

const COMPLETED_RETENTION_DAYS = 5

function TaskModal({ task, onClose, onSave, customers }) {
  const [formData, setFormData] = useState(task || {
    id: `TSK-${Date.now()}`,
    customer: '',
    description: '',
    reminderDate: new Date().toISOString().slice(0, 10),
    completed: false,
  })

  const [customerSearch, setCustomerSearch] = useState('')
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)

  const filteredCustomers = useMemo(() =>
    (customers || []).filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase())),
    [customers, customerSearch]
  )

  const handleSelectCustomer = (customerName) => {
    setFormData({ ...formData, customer: customerName })
    setCustomerSearch('')
    setShowCustomerDropdown(false)
  }

  const handleSubmit = () => {
    if (!formData.customer.trim() || !formData.description.trim()) {
      alert('Plotëso customer dhe përshkrim!')
      return
    }
    onSave(formData)
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto dark:bg-dk-low dark:border dark:border-white/[0.07]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white dark:border-transparent dark:bg-dk-low">
          <h2 className="font-bold text-gray-800 dark:text-gray-100">{task ? 'Ndrysho Detyrën' : 'Detyrë e Re'}</h2>
          <button onClick={onClose} className="icon-btn"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-4">
          <div className="relative">
            <label className="block text-xs font-bold text-gray-600 mb-2 dark:text-gray-300">Emri i Klientit</label>
            <input
              type="text"
              placeholder="Kërko klient..."
              value={customerSearch || formData.customer}
              onChange={(e) => {
                setCustomerSearch(e.target.value)
                setShowCustomerDropdown(true)
              }}
              onFocus={() => setShowCustomerDropdown(true)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-transparent dark:bg-dk-card dark:text-gray-100 dark:placeholder:text-[#8b8e99] dark:focus:ring-accent/40"
            />

            {showCustomerDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto dark:bg-dk-high dark:border-white/10">
                {filteredCustomers.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-gray-400 dark:text-gray-500">Nuk ka klientë</div>
                ) : (
                  filteredCustomers.map((c, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSelectCustomer(c.name)}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 dark:hover:bg-dk-card border-b border-gray-100 last:border-b-0 transition-colors dark:text-gray-200 dark:border-transparent"
                    >
                      {c.name}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 mb-2 dark:text-gray-300">Data e Kujtesës</label>
            <input
              type="date"
              value={formData.reminderDate}
              onChange={(e) => setFormData({ ...formData, reminderDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-transparent dark:bg-dk-card dark:text-gray-100 dark:placeholder:text-[#8b8e99] dark:focus:ring-accent/40"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 mb-2 dark:text-gray-300">Përshkrimi i Punës</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Përshkruaj detyrën..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none dark:border-transparent dark:bg-dk-card dark:text-gray-100 dark:placeholder:text-[#8b8e99] dark:focus:ring-accent/40"
              rows="6"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <button
              onClick={handleSubmit}
              className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 dark:bg-accent dark:hover:bg-accent/90 text-white dark:text-accent-on font-bold rounded-lg transition-colors"
            >
              Ruaj
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 font-bold rounded-lg hover:bg-gray-50 transition-colors dark:border-transparent dark:bg-dk-card dark:text-gray-300 dark:hover:bg-dk-high"
            >
              Anulo
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function TaskCard({ task, customers, onEdit, onDelete, onToggle }) {
  const today = new Date().toISOString().slice(0, 10)
  const isOverdue = task.reminderDate < today && !task.completed
  const isToday = task.reminderDate === today

  let statusBadge, statusColor, railColor, darkAvatar, darkDateIcon
  if (task.completed) {
    statusBadge = 'Kompletuar'
    statusColor = 'bg-emerald-100 dark:bg-[#00a572]/30 text-emerald-700 dark:text-[#6ffbbe]'
    railColor = 'bg-emerald-500 dark:bg-[#00a572]'
    darkAvatar = 'dark:bg-[#00a572]/20 dark:text-[#6ffbbe]'
    darkDateIcon = 'dark:text-[#4edea3]'
  } else if (isOverdue) {
    statusBadge = 'Vonuar'
    statusColor = 'bg-blue-100 dark:bg-[#93000a] text-blue-700 dark:text-[#ffdad6]'
    railColor = 'bg-blue-500 dark:bg-accent dark:w-1.5'
    darkAvatar = 'dark:bg-accent/20 dark:text-accent-soft'
    darkDateIcon = 'dark:text-accent-soft'
  } else if (isToday) {
    statusBadge = 'Sot'
    statusColor = 'bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300'
    railColor = 'bg-amber-500'
    darkAvatar = 'dark:bg-amber-500/15 dark:text-amber-300'
    darkDateIcon = 'dark:text-amber-300'
  } else {
    statusBadge = 'Ardhshme'
    statusColor = 'bg-sky-100 dark:bg-dk-high text-sky-700 dark:text-[#c0c1ff]'
    railColor = 'bg-sky-500 dark:bg-[#8083ff]/60'
    darkAvatar = 'dark:bg-dk-high dark:text-[#c0c1ff]'
    darkDateIcon = 'dark:text-[#c0c1ff]'
  }

  return (
    <div className={`relative bg-white dark:bg-dk-low dark:hover:bg-dk-card rounded-2xl dark:rounded-xl border border-gray-200/90 dark:border-transparent shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden p-4 ${
      task.completed ? 'opacity-60 dark:opacity-80' : ''
    }`}>
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${railColor}`} />

      <div>
        <div className="flex items-start justify-between gap-2 mb-1 dark:mb-2 pl-1">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className={`hidden dark:flex w-8 h-8 rounded-full items-center justify-center shrink-0 ${darkAvatar}`}>
              {task.completed ? <CheckCircle2 size={16} /> : <User size={16} />}
            </div>
            <p className={`text-sm dark:text-base font-bold dark:font-semibold truncate ${
              task.completed ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-gray-100'
            }`}>
              {task.customer}
            </p>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${statusColor}`}>
            {statusBadge}
          </span>
        </div>
        <p className="text-xs dark:text-[13px] text-gray-500 dark:text-gray-300 pl-1 dark:pl-10 mb-3 dark:mb-4 line-clamp-2 dark:[-webkit-line-clamp:3] min-h-[32px] dark:min-h-[56px] dark:leading-relaxed">
          {task.description}
        </p>
      </div>

      <div className="pt-3 border-t border-gray-100 dark:border-transparent pl-1 space-y-2.5 dark:space-y-2 dark:bg-dk-side/40 dark:-mx-4 dark:-mb-4 dark:p-4 dark:rounded-b-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 font-mono dark:font-sans text-[11px] text-gray-400 dark:text-gray-300">
            {task.completed ? <CheckCircle2 size={13} className={darkDateIcon} /> : <Calendar size={13} className={darkDateIcon} />}
            <span>{formatDate(task.reminderDate)}</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onEdit(task)}
              className="p-1 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-dk-high transition-colors"
              title="Ndrysho"
            >
              <Pencil size={14} />
            </button>
            <button
              onClick={() => onDelete(task.id)}
              className="p-1 rounded-lg text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-[#ffdad6] hover:bg-blue-50 dark:hover:bg-[#93000a] transition-colors"
              title="Fshi"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        <button
          onClick={() => onToggle(task.id)}
          className={`w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-extrabold transition-colors ${
            task.completed
              ? 'bg-emerald-500 dark:bg-[#00a572] text-white dark:text-[#003824] hover:opacity-90'
              : 'bg-emerald-50 dark:bg-dk-high text-emerald-700 dark:text-[#4edea3] border border-emerald-100 dark:border-transparent hover:bg-emerald-100 dark:hover:bg-[#00a572] dark:hover:text-[#003824]'
          }`}
          title="Shëno si i plotësuar"
        >
          {task.completed ? <><CheckCircle2 size={13}/> Kryer ✓</> : 'Done ✅'}
        </button>
      </div>
    </div>
  )
}

export default function Tasks() {
  const appContext = useApp() || {}
  const { customers = [], showToast, logActivity, currentOrg, tasksAddOpen, setTasksAddOpen } = appContext

  const [tasks, setTasks] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [activeFilter, setActiveFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => { loadTasks() }, [currentOrg?.id])

  const loadTasks = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase.from('tasks').select('*').order('reminderdate', { ascending: true })
      if (error) throw error
      const formattedTasks = (data || []).map(t => ({ ...t, reminderDate: t.reminderdate, completedAt: t.completedat }))

      // Detyrat e kryera qëndrojnë 5 ditë, pastaj fshihen vetë — s'na duhen më.
      const cutoff = Date.now() - COMPLETED_RETENTION_DAYS * 24 * 60 * 60 * 1000
      const stale = formattedTasks.filter(t => t.completed && t.completedAt && new Date(t.completedAt).getTime() < cutoff)
      const fresh = stale.length ? formattedTasks.filter(t => !stale.includes(t)) : formattedTasks

      setTasks(fresh)

      if (stale.length > 0) {
        supabase.from('tasks').delete().in('id', stale.map(t => t.id)).then(({ error: delErr }) => {
          if (delErr) console.error('Error auto-deleting stale completed tasks:', delErr)
        })
      }
    } catch {
      try {
        const saved = localStorage.getItem('arestv_tasks')
        if (saved) setTasks(JSON.parse(saved))
      } catch {}
    } finally {
      setLoading(false)
    }
  }

  const syncTaskToSupabase = async (task) => {
    try {
      const taskData = { id: task.id, customer: task.customer, description: task.description, reminderdate: task.reminderDate, completed: task.completed || false, completedat: task.completedAt ?? null }
      const { data: existing } = await supabase.from('tasks').select('id').eq('id', task.id).single()
      if (existing) {
        const { error } = await supabase.from('tasks').update(taskData).eq('id', task.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('tasks').insert([taskData])
        if (error) throw error
      }
      return true
    } catch { return false }
  }

  const deleteTaskFromSupabase = async (taskId) => {
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', taskId)
      if (error) throw error
      return true
    } catch { return false }
  }

  const handleAddTask = () => {
    setEditingTask(null)
    setShowModal(true)
  }

  // "Detyrë e Re" te dropdown-i i header-it global e navigon këtu dhe ngre këtë
  // flamur (AppContext) — hapim modalin lokal të shtimit dhe e fikim flamurin.
  useEffect(() => {
    if (tasksAddOpen) {
      handleAddTask()
      setTasksAddOpen(false)
    }
  }, [tasksAddOpen])

  const handleEditTask = (task) => {
    setEditingTask(task)
    setShowModal(true)
  }

  const handleSaveTask = async (formData) => {
    try {
      const taskWithOrg = { ...formData, orgId: currentOrg?.id || 'default', createdAt: formData.createdAt || new Date().toISOString() }
      const synced = await syncTaskToSupabase(taskWithOrg)
      if (synced) {
        if (editingTask) {
          setTasks(tasks.map(t => t.id === editingTask.id ? taskWithOrg : t))
          if (logActivity) logActivity(`Ndrysho detyrën: ${formData.customer}`, 'Detyrat')
          if (showToast) showToast('Detyra u ndryshua ✓')
        } else {
          setTasks([...tasks, taskWithOrg])
          if (logActivity) logActivity(`Krijo detyrë: ${formData.customer}`, 'Detyrat')
          if (showToast) showToast('Detyra u krijua ✓')
        }
      } else {
        if (showToast) showToast('Gabim gjatë ruajtjes')
      }
      setShowModal(false)
    } catch (e) {
      if (showToast) showToast('Gabim: ' + e.message)
    }
  }

  const handleDeleteTask = async (taskId) => {
    const task = tasks.find(t => t.id === taskId)
    if (task && confirm(`Fshi detyrën për ${task.customer}?`)) {
      const deleted = await deleteTaskFromSupabase(taskId)
      if (deleted) {
        setTasks(tasks.filter(t => t.id !== taskId))
        if (logActivity) logActivity(`Fshi detyrën: ${task.customer}`, 'Detyrat')
        if (showToast) showToast('Detyra u fshi')
      }
    }
  }

  const handleToggleTask = async (taskId) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return
    const nowCompleted = !task.completed
    const updatedTask = { ...task, completed: nowCompleted, completedAt: nowCompleted ? new Date().toISOString() : null }
    const synced = await syncTaskToSupabase(updatedTask)
    if (synced) setTasks(tasks.map(t => t.id === taskId ? updatedTask : t))
  }

  const today = new Date().toISOString().slice(0, 10)
  const totalTasks = tasks.length
  const activeTasks = tasks.filter(t => !t.completed).length
  const completedTasks = tasks.filter(t => t.completed).length
  const overdueTasks = tasks.filter(t => t.reminderDate < today && !t.completed).length
  // Dark mode: të dhëna ndihmëse për kartat KPI (përqindje, "sot", muaji aktual)
  const completedToday = tasks.filter(t => t.completed && t.completedAt && String(t.completedAt).slice(0, 10) === today).length
  const pct = n => totalTasks ? Math.round((n / totalTasks) * 1000) / 10 : 0
  const MONTHS_SQ = ['Janar', 'Shkurt', 'Mars', 'Prill', 'Maj', 'Qershor', 'Korrik', 'Gusht', 'Shtator', 'Tetor', 'Nëntor', 'Dhjetor']
  const monthLabel = `${MONTHS_SQ[new Date().getMonth()]} ${new Date().getFullYear()}`

  const filteredTasks = useMemo(() => {
    let result = tasks
    if (activeFilter === 'active') {
      result = result.filter(t => !t.completed)
    } else if (activeFilter === 'done') {
      result = result.filter(t => t.completed)
    } else if (activeFilter === 'overdue') {
      result = result.filter(t => t.reminderDate < today && !t.completed)
    }

    const q = search.trim().toLowerCase()
    if (q) {
      result = result.filter(t =>
        (t.customer || '').toLowerCase().includes(q) ||
        (t.description || '').toLowerCase().includes(q)
      )
    }

    return [...result].sort((a, b) => {
      // Detyrat e kryera shkojnë krejt në fund, pavarësisht datës — s'na duhen më.
      if (a.completed !== b.completed) return a.completed ? 1 : -1

      const aIsOverdue = a.reminderDate < today && !a.completed
      const bIsOverdue = b.reminderDate < today && !b.completed
      const aIsToday = a.reminderDate === today && !a.completed
      const bIsToday = b.reminderDate === today && !b.completed

      if (aIsOverdue && !bIsOverdue) return -1
      if (!aIsOverdue && bIsOverdue) return 1
      if (aIsToday && !bIsToday) return -1
      if (!aIsToday && bIsToday) return 1
      return new Date(a.reminderDate).getTime() - new Date(b.reminderDate).getTime()
    })
  }, [tasks, activeFilter, search])

  const filterOptions = [
    { key: 'all', label: 'Të gjitha', count: totalTasks },
    { key: 'active', label: 'Aktive', count: activeTasks },
    { key: 'done', label: 'Kryera', count: completedTasks },
    { key: 'overdue', label: 'Vonuara', count: overdueTasks },
  ]

  return (
    <div className="h-full flex flex-col overflow-hidden bg-gray-50 dark:bg-transparent">
      {/* Header — titulli "Detyrat" dhe butoni +Shto Detyrë tani jetojnë te header-i
         global (Header.jsx, kur page === 'tasks'); "Detyrë e Re" te dropdown-i "+"
         navigon këtu dhe ngre flamurin tasksAddOpen (shih useEffect më lart). */}
      <div className="px-4 sm:px-6 py-5 bg-white dark:bg-transparent border-b border-gray-200 dark:border-transparent dark:px-0 dark:pt-0 dark:pb-6 space-y-4">
        {/* Stats Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 dark:gap-5">
          <div className="relative overflow-hidden bg-sky-50 border border-sky-100 dark:bg-dk-low dark:border-transparent rounded-2xl dark:rounded-xl p-3 dark:p-4">
            <div className="hidden dark:block absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-[#8083ff]/10 blur-xl pointer-events-none" />
            <div className="flex items-center justify-between mb-0.5 dark:mb-2">
              <p className="text-[11px] font-bold text-sky-700 dark:text-[#8b8e99] dark:uppercase dark:tracking-wider">Total</p>
              <div className="hidden dark:flex w-7 h-7 rounded-lg bg-dk-card items-center justify-center text-[#c0c1ff]"><ListTodo size={16} /></div>
            </div>
            <div className="flex items-baseline justify-between">
              <p className="text-2xl font-black font-mono text-sky-700 dark:text-gray-100 tracking-tight">{totalTasks}</p>
              <span className="hidden dark:flex items-center gap-1 text-[11px] text-[#8b8e99]"><Calendar size={13} /> {monthLabel}</span>
            </div>
            <div className="hidden dark:block mt-2 w-full bg-dk-card h-1 rounded-full overflow-hidden">
              <div className="bg-[#c0c1ff] h-full rounded-full" style={{ width: `${100}%` }} />
            </div>
          </div>
          <div className="relative overflow-hidden bg-emerald-50 border border-emerald-100 dark:bg-dk-low dark:border-transparent rounded-2xl dark:rounded-xl p-3 dark:p-4">
            <div className="hidden dark:block absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-[#4edea3]/10 blur-xl pointer-events-none" />
            <div className="flex items-center justify-between mb-0.5 dark:mb-2">
              <p className="text-[11px] font-bold text-emerald-700 dark:text-[#4edea3] dark:uppercase dark:tracking-wider">Aktive</p>
              <div className="hidden dark:flex w-7 h-7 rounded-lg bg-dk-card items-center justify-center text-[#4edea3]"><Clock size={16} /></div>
            </div>
            <div className="flex items-baseline justify-between">
              <p className="text-2xl font-black font-mono text-emerald-700 dark:text-[#4edea3] tracking-tight">{activeTasks}</p>
              <span className="hidden dark:inline-flex text-[11px] font-medium text-[#4edea3] bg-dk-high px-2 py-0.5 rounded-full">{pct(activeTasks)}%</span>
            </div>
            <div className="hidden dark:block mt-2 w-full bg-dk-card h-1 rounded-full overflow-hidden">
              <div className="bg-[#4edea3] h-full rounded-full" style={{ width: `${pct(activeTasks)}%` }} />
            </div>
          </div>
          <div className="relative overflow-hidden bg-emerald-50/60 border border-emerald-100 dark:bg-dk-low dark:border-transparent rounded-2xl dark:rounded-xl p-3 dark:p-4">
            <div className="hidden dark:block absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-[#00a572]/10 blur-xl pointer-events-none" />
            <div className="flex items-center justify-between mb-0.5 dark:mb-2">
              <p className="text-[11px] font-bold text-emerald-600 dark:text-[#8b8e99] dark:uppercase dark:tracking-wider">Kryera</p>
              <div className="hidden dark:flex w-7 h-7 rounded-lg bg-dk-card items-center justify-center text-[#6ffbbe]"><CheckCircle2 size={16} /></div>
            </div>
            <div className="flex items-baseline justify-between">
              <p className="text-2xl font-black font-mono text-emerald-600 dark:text-gray-100 tracking-tight">{completedTasks}</p>
              <span className="hidden dark:inline-flex text-[11px] font-medium text-[#6ffbbe] bg-dk-high px-2 py-0.5 rounded-full">+{completedToday} sot</span>
            </div>
            <div className="hidden dark:block mt-2 w-full bg-dk-card h-1 rounded-full overflow-hidden">
              <div className="bg-[#6ffbbe] h-full rounded-full" style={{ width: `${pct(completedTasks)}%` }} />
            </div>
          </div>
          <div className="relative overflow-hidden bg-blue-50 border border-blue-100 dark:bg-dk-low dark:border-transparent rounded-2xl dark:rounded-xl p-3 dark:p-4">
            <div className="hidden dark:block absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-accent/15 blur-xl pointer-events-none" />
            <div className="flex items-center justify-between mb-0.5 dark:mb-2">
              <p className="text-[11px] font-bold text-blue-700 dark:text-accent-soft dark:uppercase dark:tracking-wider">Vonuara</p>
              <div className="hidden dark:flex w-7 h-7 rounded-lg bg-dk-card items-center justify-center text-accent-soft"><AlertTriangle size={16} /></div>
            </div>
            <div className="flex items-baseline justify-between">
              <p className="text-2xl font-black font-mono text-blue-700 dark:text-accent-soft tracking-tight">{overdueTasks}</p>
              {overdueTasks > 0 && <span className="hidden dark:inline-flex text-[11px] font-semibold text-[#ffdad6] bg-[#93000a]/50 px-2 py-0.5 rounded-full">Urgjente</span>}
            </div>
            <div className="hidden dark:block mt-2 w-full bg-dk-card h-1 rounded-full overflow-hidden">
              <div className="bg-accent h-full rounded-full" style={{ width: `${pct(overdueTasks)}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs + Search */}
      <div className="px-4 sm:px-6 py-2.5 bg-white dark:bg-dk-low border-b border-gray-100 dark:border-transparent dark:px-2 dark:py-2 dark:rounded-xl dark:mb-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
        <div className="flex gap-1.5 overflow-x-auto">
          {filterOptions.map(filter => (
            <button
              key={filter.key}
              onClick={() => setActiveFilter(filter.key)}
              className={`px-3.5 py-1.5 rounded-xl dark:rounded-lg text-xs font-bold transition-colors flex-shrink-0 whitespace-nowrap flex items-center gap-1.5 ${
                activeFilter === filter.key
                  ? 'bg-blue-500 dark:bg-accent text-white dark:text-accent-on shadow-sm dark:shadow-lg dark:shadow-accent/30'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dk-card dark:hover:text-gray-100'
              }`}
            >
              {filter.label}
              <span className="dark:hidden">({filter.count})</span>
              <span className={`hidden dark:inline-flex px-1.5 py-0.5 rounded-full text-[11px] font-bold ${
                activeFilter === filter.key ? 'bg-black/15 text-accent-on' : filter.key === 'overdue' ? 'bg-[#93000a] text-[#ffdad6]' : 'bg-dk-high text-gray-100'
              }`}>{filter.count}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto"><div className="relative w-full sm:w-64 flex-shrink-0">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Kërko detyrë..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl dark:rounded-lg border border-gray-200 dark:border-transparent bg-gray-50 dark:bg-dk-card text-gray-900 dark:text-gray-100 dark:py-2 placeholder-gray-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 dark:focus:ring-accent/30"
          />
        </div>
          {/* Dark mode: butoni "Krijo Detyrë" shfaqet edhe këtu (si te dizajni) */}
          <button
            onClick={handleAddTask}
            className="hidden dark:flex items-center gap-1.5 h-9 px-4 rounded-lg bg-accent text-accent-on text-xs font-semibold shadow-lg shadow-accent/40 hover:bg-accent/90 transition-colors whitespace-nowrap shrink-0"
          >
            <Plus size={16} /> Krijo Detyrë
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 dark:px-0 dark:pt-0">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-3">
              <div className="relative w-12 h-12">
                <div className="absolute inset-0 rounded-full border-4 border-gray-200 dark:border-gray-700" />
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-500 animate-spin" />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Po ngarkon detyrat...</p>
            </div>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
              <ListTodo size={40} className="text-gray-400 dark:text-gray-500" />
            </div>
            <p className="text-gray-600 font-semibold mb-1 dark:text-gray-300">Nuk ka detyra</p>
            <p className="text-sm text-gray-400 mb-6 dark:text-gray-500">
              {search ? 'Provo kërkim tjetër.' : activeFilter === 'done' ? 'Nuk keni detyrë të përfunduar.' : activeFilter === 'overdue' ? 'Nuk keni detyrë vonuar. 🎉' : 'Krijo detyrën e parë tënde'}
            </p>
            {activeFilter === 'all' && !search && (
              <button
                onClick={handleAddTask}
                className="px-5 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm hover:shadow-md"
              >
                + Detyrë e Re
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 dark:gap-5">
            {filteredTasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                customers={customers}
                onEdit={handleEditTask}
                onDelete={handleDeleteTask}
                onToggle={handleToggleTask}
              />
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <TaskModal
          task={editingTask}
          onClose={() => setShowModal(false)}
          onSave={handleSaveTask}
          customers={customers}
        />
      )}
    </div>
  )
}
