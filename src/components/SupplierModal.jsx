import { useState } from 'react'
import { Truck, Phone, Link2 } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Modal, FormGroup } from './UI'

/* ══════════════════════════════════════════════════════════
   Modal — shto / edito furnitor
   Në komponent të vetin (jo brenda Suppliers.jsx) që Header.jsx ta
   përdorë pa tërhequr krejt Suppliers.jsx në bundle-in kryesor
   (Suppliers ngarkohet lazy, Header jo).
══════════════════════════════════════════════════════════ */
export function SupplierModal({ supplier, onClose }) {
  const { setVendors, showToast } = useApp()
  const isEdit = !!supplier

  const [form, setForm] = useState({
    name:      supplier?.name      || '',
    phone:     supplier?.phone     || '',
    panelLink: supplier?.panelLink || '',
  })
  const [err, setErr] = useState('')
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const save = () => {
    if (!form.name.trim()) { setErr('Emri i furnitorit është i detyrueshëm.'); return }

    const payload = {
      id:        isEdit ? supplier.id : `VEN-${Date.now()}`,
      name:      form.name.trim(),
      phone:     form.phone.trim(),
      panelLink: form.panelLink.trim(),
    }

    if (isEdit) {
      setVendors(prev => prev.map(v => v.id === supplier.id ? payload : v))
      showToast('Furnitori u përditësua! ✓')
    } else {
      setVendors(prev => [...prev, payload])
      showToast('Furnitori u shtua me sukses! ✓')
    }
    onClose()
  }

  return (
    <Modal
      className="inv-form pf"
      title={
        <span className="flex items-center gap-2 dark:gap-3">
          <span className="contents dark:flex dark:w-8 dark:h-8 dark:items-center dark:justify-center dark:rounded-lg dark:bg-accent/15">
            <Truck size={18} className="text-blue-500 dark:text-accent" />
          </span>
          {isEdit ? `Edito — ${supplier.name}` : 'Furnitor i ri'}
        </span>
      }
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-outline" onClick={onClose}>Anulo</button>
          <button className="btn btn-primary btn-sm self-start sm:self-auto" onClick={save}>
            {isEdit ? 'Ruaj ndryshimet' : 'Shto furnitorin'}
          </button>
        </>
      }
    >
      {err && (
        <div className="text-xs text-blue-500 bg-blue-50 border border-blue-100 dark:bg-[#93000a]/30 dark:border-transparent dark:text-[#ffb4ab] rounded-lg px-3 py-2 mb-4">
          {err}
        </div>
      )}

      {/* Emri i furnitorit */}
      <FormGroup label="Furnitori *">
        <input
          className="form-control"
          value={form.name}
          onChange={e => set('name', e.target.value)}
          placeholder="p.sh. Predator"
          autoFocus
        />
      </FormGroup>

      {/* Numri i telefonit */}
      <FormGroup label="Numri i telefonit">
        <div className="relative">
          <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none dark:text-gray-500" />
          <input
            className="form-control pl-9"
            value={form.phone}
            onChange={e => set('phone', e.target.value)}
            placeholder="+383 44 000 000"
          />
        </div>
      </FormGroup>

      {/* Linku i panelit */}
      <FormGroup label="Linku i panelit">
        <div className="relative">
          <Link2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none dark:text-gray-500" />
          <input
            className="form-control pl-9"
            value={form.panelLink}
            onChange={e => set('panelLink', e.target.value)}
            placeholder="https://panel.furnitori.com"
          />
        </div>
      </FormGroup>
    </Modal>
  )
}
