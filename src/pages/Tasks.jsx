import { useState, useMemo, useEffect } from 'react'
import { Plus, Trash2, Pencil, X, Calendar, CheckCircle2, ListTodo, Search } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { formatDate } from '../utils/dateFormat'
import { supabase } from '../lib/supabase'

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
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto dark:bg-gray-800">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white dark:border-gray-700 dark:bg-gray-800">
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
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700"
            />

            {showCustomerDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto dark:bg-gray-800 dark:border-gray-700">
                {filteredCustomers.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-gray-400 dark:text-gray-500">Nuk ka klientë</div>
                ) : (
                  filteredCustomers.map((c, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSelectCustomer(c.name)}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 border-b border-gray-100 last:border-b-0 transition-colors dark:text-gray-200 dark:border-gray-700"
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
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 mb-2 dark:text-gray-300">Përshkrimi i Punës</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Përshkruaj detyrën..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none dark:border-gray-700"
              rows="6"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <button
              onClick={handleSubmit}
              className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg transition-colors"
            >
              Ruaj
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 font-bold rounded-lg hover:bg-gray-50 transition-colors dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-900/50"
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

  let statusBadge, statusColor, railColor
  if (task.completed) {
    statusBadge = 'Kompletuar'
    statusColor = 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300'
    railColor = 'bg-emerald-500'
  } else if (isOverdue) {
    statusBadge = 'Vonuar'
    statusColor = 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
    railColor = 'bg-blue-500'
  } else if (isToday) {
    statusBadge = 'Sot'
    statusColor = 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300'
    railColor = 'bg-amber-500'
  } else {
    statusBadge = 'Ardhshme'
    statusColor = 'bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300'
    railColor = 'bg-sky-500'
  }

  return (
    <div className={`relative bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/90 dark:border-gray-700 shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden p-4 ${
      task.completed ? 'opacity-60' : ''
    }`}>
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${railColor}`} />

      <div>
        <div className="flex items-start justify-between gap-2 mb-1 pl-1">
          <p className={`text-sm font-bold truncate ${
            task.completed ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-white'
          }`}>
            {task.customer}
          </p>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${statusColor}`}>
            {statusBadge}
          </span>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 pl-1 mb-3 line-clamp-2 min-h-[32px]">
          {task.description}
        </p>
      </div>

      <div className="pt-3 border-t border-gray-100 dark:border-gray-700/80 pl-1 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 font-mono text-[11px] text-gray-400 dark:text-gray-500">
            <Calendar size={13} />
            <span>{formatDate(task.reminderDate)}</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onEdit(task)}
              className="p-1 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Ndrysho"
            >
              <Pencil size={14} />
            </button>
            <button
              onClick={() => onDelete(task.id)}
              className="p-1 rounded-lg text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
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
              ? 'bg-emerald-500 text-white hover:opacity-90'
              : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-800/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50'
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
  const { customers = [], showToast, logActivity, currentOrg } = appContext

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
      setTasks((data || []).map(t => ({ ...t, reminderDate: t.reminderdate })))
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
      const taskData = { id: task.id, customer: task.customer, description: task.description, reminderdate: task.reminderDate, completed: task.completed || false }
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
    const updatedTask = { ...task, completed: !task.completed }
    const synced = await syncTaskToSupabase(updatedTask)
    if (synced) setTasks(tasks.map(t => t.id === taskId ? updatedTask : t))
  }

  const today = new Date().toISOString().slice(0, 10)
  const totalTasks = tasks.length
  const activeTasks = tasks.filter(t => !t.completed).length
  const completedTasks = tasks.filter(t => t.completed).length
  const overdueTasks = tasks.filter(t => t.reminderDate < today && !t.completed).length

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
    <div className="h-full flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-900/50">
      {/* Header — titulli "Detyrat" tani jeton te header-i global (Header.jsx, kur
         page === 'tasks'); butoni +Shto Detyrë mbetet këtu (hap një modal lokal,
         jo një rrugë/route, prandaj s'mund të lëvizë te dropdown-i i header-it). */}
      <div className="px-4 sm:px-6 py-5 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 space-y-4">
        <div className="flex items-center justify-end">
          <button
            onClick={handleAddTask}
            className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold text-xs shadow-sm transition-all active:scale-95"
            title="Detyrë e re"
          >
            <Plus size={14} />
            <span>Shto Detyrë</span>
          </button>
          <button
            onClick={handleAddTask}
            className="sm:hidden w-11 h-11 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-full transition-all shadow-md flex items-center justify-center"
            title="Detyrë e re"
          >
            <Plus size={22} />
          </button>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-sky-50 dark:bg-sky-900/20 border border-sky-100 dark:border-sky-900/40 rounded-2xl p-3">
            <p className="text-[11px] font-bold text-sky-700 dark:text-sky-300 mb-0.5">Total</p>
            <p className="text-2xl font-black font-mono text-sky-700 dark:text-sky-300 tracking-tight">{totalTasks}</p>
          </div>
          <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/40 rounded-2xl p-3">
            <p className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 mb-0.5">Aktive</p>
            <p className="text-2xl font-black font-mono text-emerald-700 dark:text-emerald-300 tracking-tight">{activeTasks}</p>
          </div>
          <div className="bg-emerald-50/60 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl p-3">
            <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mb-0.5">Kryera</p>
            <p className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 tracking-tight">{completedTasks}</p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/40 rounded-2xl p-3">
            <p className="text-[11px] font-bold text-blue-700 dark:text-blue-300 mb-0.5">Vonuara</p>
            <p className="text-2xl font-black font-mono text-blue-700 dark:text-blue-300 tracking-tight">{overdueTasks}</p>
          </div>
        </div>
      </div>

      {/* Filter Tabs + Search */}
      <div className="px-4 sm:px-6 py-2.5 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
        <div className="flex gap-1.5 overflow-x-auto">
          {filterOptions.map(filter => (
            <button
              key={filter.key}
              onClick={() => setActiveFilter(filter.key)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors flex-shrink-0 whitespace-nowrap ${
                activeFilter === filter.key
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {filter.label} ({filter.count})
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64 flex-shrink-0">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Kërko detyrë..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 dark:focus:ring-blue-900/20"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
