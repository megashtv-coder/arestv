import { useState, useMemo } from 'react'
import { Plus, Trash2, Pencil, X, Calendar, User, CheckCircle2, Circle } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { formatDate } from '../utils/dateFormat'
import { EmptyState } from '../components/UI'

function TaskModal({ task, onClose, onSave, customers }) {
  const [formData, setFormData] = useState(task || {
    id: `TSK-${Date.now()}`,
    customer: '',
    description: '',
    reminderDate: new Date().toISOString().slice(0, 10),
    completed: false,
  })

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
          {/* Customer dropdown */}
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-2">Emri i Klientit</label>
            <select
              value={formData.customer}
              onChange={(e) => setFormData({ ...formData, customer: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="">-- Zgjidh klient --</option>
              {customers.map(c => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Reminder date */}
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-2">Data e Kujtesës</label>
            <input
              type="date"
              value={formData.reminderDate}
              onChange={(e) => setFormData({ ...formData, reminderDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-2">Përshkrimi i Punës</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Përshkruaj detyrën..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
              rows="6"
            />
          </div>

          {/* Save button */}
          <div className="flex gap-2 pt-4">
            <button
              onClick={handleSubmit}
              className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg transition-colors"
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
  const customer = customers.find(c => c.name === task.customer)
  const today = new Date().toISOString().slice(0, 10)
  const isOverdue = task.reminderDate < today && !task.completed
  const isToday = task.reminderDate === today
  const isDue = isOverdue || isToday

  return (
    <div className={`p-4 rounded-lg border transition-all ${
      task.completed
        ? 'bg-gray-50 border-gray-100 opacity-60'
        : isOverdue
        ? 'bg-red-50 border-red-200'
        : isToday
        ? 'bg-orange-50 border-orange-200'
        : 'bg-white border-gray-200 hover:border-gray-300'
    }`}>
      <div className="flex items-start gap-3">
        <button
          onClick={() => onToggle(task.id)}
          className="mt-1 flex-shrink-0 text-gray-400 hover:text-red-500 transition-colors"
        >
          {task.completed ? (
            <CheckCircle2 size={18} className="text-emerald-500" />
          ) : (
            <Circle size={18} />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <User size={14} className="text-gray-400" />
                <p className="font-bold text-gray-800 text-sm">{task.customer}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar size={14} className={`${
                  isOverdue ? 'text-red-500' : isToday ? 'text-orange-500' : 'text-gray-400'
                }`} />
                <p className={`text-xs font-semibold ${
                  isOverdue ? 'text-red-600' : isToday ? 'text-orange-600' : 'text-gray-600'
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
                className="icon-btn text-gray-400 hover:text-red-500 hover:bg-red-50"
                title="Ndrysho"
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={() => onDelete(task.id)}
                className="icon-btn text-gray-400 hover:text-red-500 hover:bg-red-50"
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
  const { customers, showToast, logActivity, currentUser, currentOrg } = useApp()
  const [tasks, setTasks] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('xflow_tasks') || '[]')
    } catch {
      return []
    }
  })

  const [showModal, setShowModal] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [filterCompleted, setFilterCompleted] = useState(false)

  // Save to localStorage
  const saveTasks = (newTasks) => {
    setTasks(newTasks)
    localStorage.setItem('xflow_tasks', JSON.stringify(newTasks))
  }

  const handleAddTask = () => {
    setEditingTask(null)
    setShowModal(true)
  }

  const handleEditTask = (task) => {
    setEditingTask(task)
    setShowModal(true)
  }

  const handleSaveTask = (formData) => {
    if (editingTask) {
      const updated = tasks.map(t => t.id === editingTask.id ? formData : t)
      saveTasks(updated)
      logActivity(`Ndrysho detyrën: ${formData.customer} — ${formData.description.slice(0, 50)}`, 'Detyrat')
      showToast('Detyra u ndryshua ✓')
    } else {
      saveTasks([...tasks, formData])
      logActivity(`Krijo detyrë: ${formData.customer} — ${formData.description.slice(0, 50)}`, 'Detyrat')
      showToast('Detyra u krijua ✓')
    }
    setShowModal(false)
  }

  const handleDeleteTask = (taskId) => {
    const task = tasks.find(t => t.id === taskId)
    if (confirm(`Fshi detyrën për ${task.customer}?`)) {
      const updated = tasks.filter(t => t.id !== taskId)
      saveTasks(updated)
      logActivity(`Fshi detyrën: ${task.customer}`, 'Detyrat')
      showToast('Detyra u fshi')
    }
  }

  const handleToggleTask = (taskId) => {
    const updated = tasks.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t)
    saveTasks(updated)
  }

  // Filter tasks
  const filteredTasks = useMemo(() => {
    let result = tasks
    if (filterCompleted) {
      result = result.filter(t => !t.completed)
    }
    return result.sort((a, b) => {
      // Overdue first, then today, then future
      const today = new Date().toISOString().slice(0, 10)
      const aIsOverdue = a.reminderDate < today && !a.completed
      const bIsOverdue = b.reminderDate < today && !b.completed
      const aIsToday = a.reminderDate === today && !a.completed
      const bIsToday = b.reminderDate === today && !b.completed

      if (aIsOverdue && !bIsOverdue) return -1
      if (!aIsOverdue && bIsOverdue) return 1
      if (aIsToday && !bIsToday) return -1
      if (!aIsToday && bIsToday) return 1
      return a.reminderDate.localeCompare(b.reminderDate)
    })
  }, [tasks, filterCompleted])

  return (
    <div className="h-full flex flex-col overflow-hidden bg-gray-50">
      {/* Header */}
      <div className="px-4 sm:px-6 py-4 border-b border-gray-200 bg-white flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Detyrat</h1>
          <p className="text-xs text-gray-500 mt-0.5">{tasks.length} detyra totale</p>
        </div>
        <button
          onClick={handleAddTask}
          className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg transition-colors"
        >
          <Plus size={16} /> Detyrë e Re
        </button>
      </div>

      {/* Filter */}
      <div className="px-4 sm:px-6 py-3 bg-white border-b border-gray-100 flex items-center gap-3">
        <button
          onClick={() => setFilterCompleted(!filterCompleted)}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            filterCompleted
              ? 'bg-red-100 text-red-600'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {filterCompleted ? '✓ Përlote Aktive' : 'Të Gjitha'}
        </button>
      </div>

      {/* Tasks list */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {filteredTasks.length === 0 ? (
          <EmptyState
            title="Nuk ka detyra"
            description={filterCompleted ? 'Të gjitha detyrat janë kompletuar! 🎉' : 'Krijo detyrën e parë tënde'}
            action={!filterCompleted ? { label: 'Krijo Detyrë', onClick: handleAddTask } : null}
          />
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

      {/* Modal */}
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
