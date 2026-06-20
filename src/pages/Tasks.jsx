import { useState, useMemo, useEffect } from 'react'
import { Plus, Trash2, Pencil, X, Calendar, User, CheckCircle2, Circle, ClipboardList } from 'lucide-react'
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

  const filteredCustomers = (customers || []).filter(c =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase())
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
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-800 text-base">{task ? 'Ndrysho Detyrën' : 'Detyrë e Re'}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="relative">
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Klienti</label>
            <input
              type="text"
              placeholder="Kërko klient..."
              value={customerSearch || formData.customer}
              onChange={(e) => { setCustomerSearch(e.target.value); setShowCustomerDropdown(true) }}
              onFocus={() => setShowCustomerDropdown(true)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {showCustomerDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-10 max-h-48 overflow-y-auto">
                {filteredCustomers.length === 0 ? (
                  <div className="px-4 py-3 text-xs text-gray-400">Nuk ka klientë</div>
                ) : (
                  filteredCustomers.map((c, idx) => (
                    <button key={idx} onClick={() => handleSelectCustomer(c.name)}
                      className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 border-b border-gray-50 last:border-b-0 transition-colors">
                      {c.name}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Data e Kujtesës</label>
            <input
              type="date"
              value={formData.reminderDate}
              onChange={(e) => setFormData({ ...formData, reminderDate: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Përshkrimi</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Përshkruaj detyrën..."
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows="4"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button onClick={handleSubmit}
              className="flex-1 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold rounded-xl transition-colors">
              Ruaj
            </button>
            <button onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors">
              Anulo
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function TaskCard({ task, onEdit, onDelete, onToggle }) {
  const today = new Date().toISOString().slice(0, 10)
  const isOverdue = task.reminderDate < today && !task.completed
  const isToday   = task.reminderDate === today && !task.completed

  const statusBadge = task.completed
    ? { label: 'Kompletuar', cls: 'bg-emerald-50 text-emerald-600' }
    : isOverdue
    ? { label: 'Vonuar',     cls: 'bg-red-50 text-red-500' }
    : isToday
    ? { label: 'Sot',        cls: 'bg-orange-50 text-orange-500' }
    : { label: 'Ardhshme',   cls: 'bg-blue-50 text-blue-500' }

  return (
    <div className={`bg-white rounded-2xl border transition-all duration-150 hover:shadow-md flex flex-col ${
      task.completed  ? 'border-gray-100 opacity-60'
      : isOverdue     ? 'border-red-200'
      : isToday       ? 'border-orange-200'
      : 'border-gray-100 hover:border-gray-200'
    }`}>
      {/* Card header */}
      <div className="px-4 pt-4 pb-3 flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5 flex-1 min-w-0">
          <button onClick={() => onToggle(task.id)}
            className="mt-0.5 flex-shrink-0 text-gray-300 hover:text-blue-500 transition-colors">
            {task.completed
              ? <CheckCircle2 size={18} className="text-emerald-500" />
              : <Circle size={18} />}
          </button>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-bold leading-tight truncate ${task.completed ? 'line-through text-gray-400' : 'text-gray-800'}`}>
              {task.customer}
            </p>
            <span className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${statusBadge.cls}`}>
              {statusBadge.label}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button onClick={() => onEdit(task)}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-300 hover:text-blue-500 hover:bg-blue-50 transition-colors">
            <Pencil size={13} />
          </button>
          <button onClick={() => onDelete(task.id)}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Description */}
      <div className="px-4 pb-3 flex-1">
        <p className={`text-xs leading-relaxed ${task.completed ? 'line-through text-gray-300' : 'text-gray-500'}`}>
          {task.description}
        </p>
      </div>

      {/* Footer */}
      <div className={`px-4 py-2.5 border-t flex items-center gap-1.5 rounded-b-2xl ${
        isOverdue ? 'border-red-100 bg-red-50/50' : isToday ? 'border-orange-100 bg-orange-50/50' : 'border-gray-50 bg-gray-50/50'
      }`}>
        <Calendar size={12} className={isOverdue ? 'text-red-400' : isToday ? 'text-orange-400' : 'text-gray-400'} />
        <span className={`text-[11px] font-semibold ${isOverdue ? 'text-red-500' : isToday ? 'text-orange-500' : 'text-gray-400'}`}>
          {formatDate(task.reminderDate)}
        </span>
      </div>
    </div>
  )
}

export default function Tasks() {
  const appContext = useApp() || {}
  const { customers = [], showToast, logActivity, currentOrg } = appContext

  const [tasks, setTasks]               = useState([])
  const [showModal, setShowModal]       = useState(false)
  const [editingTask, setEditingTask]   = useState(null)
  const [activeFilter, setActiveFilter] = useState('all')
  const [loading, setLoading]           = useState(true)

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

  const stats = useMemo(() => ({
    total:     tasks.length,
    active:    tasks.filter(t => !t.completed).length,
    done:      tasks.filter(t => t.completed).length,
    overdue:   tasks.filter(t => !t.completed && t.reminderDate < today).length,
  }), [tasks])

  const filteredTasks = useMemo(() => {
    let result = tasks
    if (activeFilter === 'active')   result = result.filter(t => !t.completed)
    if (activeFilter === 'done')     result = result.filter(t =>  t.completed)
    if (activeFilter === 'overdue')  result = result.filter(t => !t.completed && t.reminderDate < today)
    return result.sort((a, b) => {
      const aOver = a.reminderDate < today && !a.completed
      const bOver = b.reminderDate < today && !b.completed
      const aToday = a.reminderDate === today && !a.completed
      const bToday = b.reminderDate === today && !b.completed
      if (aOver && !bOver) return -1
      if (!aOver && bOver) return 1
      if (aToday && !bToday) return -1
      if (!aToday && bToday) return 1
      return new Date(a.reminderDate) - new Date(b.reminderDate)
    })
  }, [tasks, activeFilter])

  const filters = [
    { key: 'all',    label: 'Të gjitha', count: stats.total },
    { key: 'active', label: 'Aktive',    count: stats.active },
    { key: 'done',   label: 'Kryera',    count: stats.done },
    { key: 'overdue',label: 'Vonuara',   count: stats.overdue },
  ]

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Detyrat</h1>
          <p className="text-xs text-gray-400 mt-0.5">{stats.active} aktive · {stats.done} kryera{stats.overdue > 0 ? ` · ${stats.overdue} vonuara` : ''}</p>
        </div>
        <button
          onClick={() => { setEditingTask(null); setShowModal(true) }}
          className="w-9 h-9 flex items-center justify-center bg-blue-500 hover:bg-blue-600 text-white rounded-xl shadow-sm shadow-blue-200 transition-all hover:scale-105 active:scale-95 text-lg font-bold"
        >
          +
        </button>
      </div>

      {/* ── Stats strip ── */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total',    value: stats.total,   color: 'text-gray-700',   bg: 'bg-gray-50'    },
          { label: 'Aktive',   value: stats.active,  color: 'text-blue-600',   bg: 'bg-blue-50'    },
          { label: 'Kryera',   value: stats.done,    color: 'text-emerald-600',bg: 'bg-emerald-50' },
          { label: 'Vonuara',  value: stats.overdue, color: 'text-red-500',    bg: 'bg-red-50'     },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-xl px-3 py-2.5 text-center`}>
            <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-gray-400 font-medium">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Filter tabs ── */}
      <div className="flex gap-1.5">
        {filters.map(f => (
          <button key={f.key} onClick={() => setActiveFilter(f.key)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeFilter === f.key
                ? 'bg-blue-500 text-white shadow-sm'
                : 'bg-white border border-gray-100 text-gray-500 hover:bg-gray-50'
            }`}>
            {f.label}
            {f.count > 0 && <span className={`ml-1 ${activeFilter === f.key ? 'opacity-75' : 'text-gray-400'}`}>({f.count})</span>}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-300">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-200 border-t-blue-500 mx-auto mb-3" />
            <p className="text-sm">Duke ngarkuar...</p>
          </div>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
            <ClipboardList size={24} className="text-gray-300" />
          </div>
          <p className="text-sm font-semibold text-gray-400">Nuk ka detyra</p>
          <p className="text-xs text-gray-300 mt-1">
            {activeFilter !== 'all' ? 'Provo filtrin tjetër' : 'Krijo detyrën e parë'}
          </p>
          {activeFilter === 'all' && (
            <button onClick={() => { setEditingTask(null); setShowModal(true) }}
              className="mt-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold rounded-xl transition-colors">
              + Detyrë e re
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredTasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              customers={customers}
              onEdit={(t) => { setEditingTask(t); setShowModal(true) }}
              onDelete={handleDeleteTask}
              onToggle={handleToggleTask}
            />
          ))}
        </div>
      )}

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
