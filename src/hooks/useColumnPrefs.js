import { useMemo, useCallback } from 'react'
import { useApp } from '../context/AppContext'

/* ══════════════════════════════════════════════════════════
   Preferenca e kolonave të një tabele — çfarë shfaqet, në ç'radhë.
   Ruhet te vetë llogaria e userit (currentUser.columnPrefs[tableKey]),
   jo në një cilësim global — kështu që çdo user sheh vetëm ndryshimin
   e vet, edhe nëse hyn nga një pajisje tjetër (sinkronizohet me Supabase
   përmes të njëjtit mekanizëm që përditëson listën `users`).
══════════════════════════════════════════════════════════ */
export function useColumnPrefs(tableKey, defaultColumns) {
  const { currentUser, setCurrentUser, setUsers } = useApp()

  const defaultOrder = useMemo(() => defaultColumns.map(c => c.key), [defaultColumns])
  const saved  = currentUser?.columnPrefs?.[tableKey]
  const order  = saved?.order  || defaultOrder
  const hidden = saved?.hidden || []

  // Kolonat e njohura sipas radhës së ruajtur; kolonat e reja (të shtuara në
  // app pas ruajtjes së fundit) shtohen automatikisht në fund, që të mos
  // zhduken heshturazi për userin.
  const orderedKeys = useMemo(() => {
    const known = order.filter(k => defaultOrder.includes(k))
    const missing = defaultOrder.filter(k => !known.includes(k))
    return [...known, ...missing]
  }, [order, defaultOrder])

  const byKey = useMemo(() => new Map(defaultColumns.map(c => [c.key, c])), [defaultColumns])

  // Lista për vetë tabelën — vetëm kolonat e dukshme, sipas radhës
  const columns = useMemo(
    () => orderedKeys.filter(k => !hidden.includes(k)).map(k => byKey.get(k)).filter(Boolean),
    [orderedKeys, hidden, byKey]
  )

  // Lista për editorin e kolonave — të gjitha, me flamurin `hidden`
  const allColumns = useMemo(
    () => orderedKeys.map(k => ({ ...byKey.get(k), hidden: hidden.includes(k) })).filter(c => c.key),
    [orderedKeys, hidden, byKey]
  )

  const savePrefs = useCallback((newOrder, newHidden) => {
    if (!currentUser) return
    const updated = {
      ...currentUser,
      columnPrefs: { ...(currentUser.columnPrefs || {}), [tableKey]: { order: newOrder, hidden: newHidden } },
    }
    setCurrentUser(updated)
    setUsers(prev => prev.map(u => u.id === currentUser.id ? updated : u))
  }, [currentUser, setCurrentUser, setUsers, tableKey])

  const resetPrefs = useCallback(() => {
    if (!currentUser) return
    const rest = { ...(currentUser.columnPrefs || {}) }
    delete rest[tableKey]
    const updated = { ...currentUser, columnPrefs: rest }
    setCurrentUser(updated)
    setUsers(prev => prev.map(u => u.id === currentUser.id ? updated : u))
  }, [currentUser, setCurrentUser, setUsers, tableKey])

  return { columns, allColumns, savePrefs, resetPrefs }
}
