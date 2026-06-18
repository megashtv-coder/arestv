import { useState, useMemo, useEffect } from 'react'
import { Plus, Trash2, Pencil, X, Calendar, User, CheckCircle2, Circle } from 'lucide-react'
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
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
          <h2 className="font-bold text-gray-800">{task ? 'Ndrysho Detyrën' : 'Detyrë e Re'}</h2>
          <button onClick={onClose} className="icon-btn"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-4">
          <div className="relative">
            <label className="block text-xs font-bold text-gray-600 mb-2">Emri i Klientit</label>
            <input
              type="text"
              placeholder="Kërko klient..."
              value={customerSearch || formData.customer}
              onChange={(e) => {
                setCustomerSearch(e.target.value)
                setShowCustomerDropdown(true)
              }}
              onFocus={() => setShowCustomerDropdown(true)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            {showCustomerDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                {filteredCustomers.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-gray-400">Nuk ka klientë</div>
                ) : (
                  filteredCustomers.map((c, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSelectCustomer(c.name)}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 border-b border-gray-100 last:border-b-0 transition-colors"
                    >
                      {c.name}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 mb-2">Data e Kujtesës</label>
            <input
              type="date"
              value={formData.reminderDate}
              onChange={(e) => setFormData({ ...formData, reminderDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 mb-2">Përshkrimi i Punës</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Përshkruaj detyrën..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
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
              className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 font-bold rounded-lg hover:bg-gray-50 transition-colors"
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

  return (
    <div className={`p-4 rounded-lg border transition-all ${
      task.completed
        ? 'bg-gray-50 border-gray-100 opacity-60'
        : isOverdue
        ? 'bg-blue-50 border-blue-200'
        : isToday
        ? 'bg-orange-50 border-orange-200'
        : 'bg-white border-gray-200 hover:border-gray-300'
    }`}>
      <div className="flex items-start gap-3">
        <button
          onClick={() => onToggle(task.id)}
          className="mt-1 flex-shrink-0 text-gray-400 hover:text-blue-500 transition-colors"
          title="Mark complete"
        >
          {task.completed ? (
            <CheckCircle2 size={18} className="text-emerald-500" />
          ) : (
            <Circle size={18} />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1">
              <div className="flex items-center gap-1.5 mb-1">
                <User size={14} className="text-gray-400 flex-shrink-0" />
                <p className="font-bold text-gray-800 text-sm">{task.customer}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar size={14} className={`flex-shrink-0 ${
                  isOverdue ? 'text-blue-500' : isToday ? 'text-orange-500' : 'text-gray-400'
                }`} />
                <p className={`text-xs font-semibold ${
                  isOverdue ? 'text-blue-600' : isToday ? 'text-orange-600' : 'text-gray-600'
                }`}>
                  {formatDate(task.reminderDate)}
                  {isOverdue && ' (VONUAR)'}
                  {isToday && ' (SOT)'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => onEdit(task)}
                className="icon-btn text-gray-400 hover:text-blue-500 hover:bg-blue-50"
                title="Ndrysho"
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={() => onDelete(task.id)}
                className="icon-btn text-gray-400 hover:text-blue-500 hover:bg-blue-50"
                title="Fshi"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
          <p className={`text-sm leading-relaxed ${
            task.completed ? 'line-through text-gray-400' : 'text-gray-700'
          }`}>
            {task.description}
          </p>
        </div>
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
  const [filterCompleted, setFilterCompleted] = useState(false)
  const [loading, setLoading] = useState(true)

  // Load tasks from Supabase on mount
  useEffect(() => {
    loadTasks()
  }, [currentOrg?.id])

  const loadTasks = async () => {
    try {
      setLoading(true)

      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('reminderdate', { ascending: true })

      if (error) {
        console.error('Supabase error:', error)
        throw error
      }

      // Convert lowercase columns to camelCase for component
      const formattedTasks = (data || []).map(t => ({
        ...t,
        reminderDate: t.reminderdate,
      }))

      console.log('Loaded tasks from Supabase:', formattedTasks)
      setTasks(formattedTasks)
    } catch (e) {
      console.error('Error loading tasks:', e)
      // Fall back to localStorage
      try {
        const saved = localStorage.getItem('arestv_tasks')
        if (saved) setTasks(JSON.parse(saved))
      } catch {}
    } finally {
      setLoading(false)
    }
  }

  const saveTasks = async (newTasks) => {
    setTasks(newTasks)
    try {
      localStorage.setItem('arestv_tasks', JSON.stringify(newTasks))
    } catch (e) {
      console.error('Error saving to localStorage:', e)
    }
  }

  const syncTaskToSupabase = async (task) => {
    try {
      const taskData = {
        id: task.id,
        customer: task.customer,
        description: task.description,
        reminderdate: task.reminderDate,
        completed: task.completed || false,
      }

      console.log('Saving task:', taskData)

      // Try to update first
      const { data: existing, error: checkError } = await supabase
        .from('tasks')
        .select('id')
        .eq('id', task.id)
        .single()

      let result
      if (existing) {
        // Update existing
        const { error: updateError } = await supabase
          .from('tasks')
          .update(taskData)
          .eq('id', task.id)
        if (updateError) throw updateError
        console.log('Task updated')
      } else {
        // Insert new
        const { error: insertError } = await supabase
          .from('tasks')
          .insert([taskData])
        if (insertError) throw insertError
        console.log('Task inserted')
      }
      return true
    } catch (e) {
      console.error('Error syncing task:', e)
      return false
    }
  }

  const deleteTaskFromSupabase = async (taskId) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)

      if (error) throw error
      return true
    } catch (e) {
      console.error('Error deleting task:', e)
      return false
    }
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
      // Ensure orgId is set
      const taskWithOrg = {
        ...formData,
        orgId: currentOrg?.id || 'default',
        createdAt: formData.createdAt || new Date().toISOString(),
      }

      console.log('Saving task:', taskWithOrg)
      console.log('Current org:', currentOrg)

      const synced = await syncTaskToSupabase(taskWithOrg)
      if (synced) {
        if (editingTask) {
          const updated = tasks.map(t => t.id === editingTask.id ? taskWithOrg : t)
          setTasks(updated)
          if (logActivity) logActivity(`Ndrysho detyrën: ${formData.customer}`, 'Detyrat')
          if (showToast) showToast('Detyra u ndryshua ✓')
        } else {
          setTasks([...tasks, taskWithOrg])
          if (logActivity) logActivity(`Krijo detyrë: ${formData.customer}`, 'Detyrat')
          if (showToast) showToast('Detyra u krijua ✓')
        }
      } else {
        if (showToast) showToast('Error saving task - check console')
      }
      setShowModal(false)
    } catch (e) {
      console.error('Error saving task:', e)
      if (showToast) showToast('Error: ' + e.message)
    }
  }

  const handleDeleteTask = async (taskId) => {
    const task = tasks.find(t => t.id === taskId)
    if (task && confirm(`Fshi detyrën për ${task.customer}?`)) {
      const deleted = await deleteTaskFromSupabase(taskId)
      if (deleted) {
        const updated = tasks.filter(t => t.id !== taskId)
        setTasks(updated)
        if (logActivity) logActivity(`Fshi detyrën: ${task.customer}`, 'Detyrat')
        if (showToast) showToast('Detyra u fshi')
      } else {
        if (showToast) showToast('Error deleting task')
      }
    }
  }

  const handleToggleTask = async (taskId) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return

    const updatedTask = { ...task, completed: !task.completed }
    const synced = await syncTaskToSupabase(updatedTask)
    if (synced) {
      const updated = tasks.map(t => t.id === taskId ? updatedTask : t)
      setTasks(updated)
    }
  }

  const filteredTasks = useMemo(() => {
    let result = tasks
    if (filterCompleted) {
      result = result.filter(t => !t.completed)
    }
    return result.sort((a, b) => {
      const today = new Date().toISOString().slice(0, 10)
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
  }, [tasks, filterCompleted])

  return (
    <div className="h-full flex flex-col overflow-hidden bg-gray-50">
      <div className="px-4 sm:px-6 py-4 border-b border-gray-200 bg-white flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Detyrat</h1>
          <p className="text-xs text-gray-500 mt-0.5">{tasks.length} detyra</p>
        </div>
        <button
          onClick={handleAddTask}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg transition-colors"
        >
          <Plus size={16} /> E Re
        </button>
      </div>

      <div className="px-4 sm:px-6 py-3 bg-white border-b border-gray-100">
        <button
          onClick={() => setFilterCompleted(!filterCompleted)}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            filterCompleted
              ? 'bg-blue-100 text-blue-600'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {filterCompleted ? '✓ Aktive' : 'Të Gjitha'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {loading ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <p>Loading tasks...</p>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-gray-400 font-semibold mb-2">Nuk ka detyra</p>
            <p className="text-sm text-gray-300 mb-4">
              {filterCompleted ? 'Të gjitha detyrat janë kompletuar!' : 'Krijo detyrën e parë tënde'}
            </p>
            {!filterCompleted && (
              <button
                onClick={handleAddTask}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold rounded-lg transition-colors"
              >
                Krijo Detyrë
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-3">
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
