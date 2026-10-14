import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { mergeServerChanges } from '../utils/serverMerge'
import { pendingBases } from '../utils/syncBase'

/**
 * Mban pajisjet e hapura të sinkronizuara: merr nga serveri ndryshimet e bëra nga pajisje të tjera
 * (fatura/klientë/pagesa/shpenzime të reja ose të ndryshuara) pa pasur nevojë për reload.
 *
 *  • çdo 60 sekonda ndërsa aplikacioni është i dukshëm — kërkon VETËM rreshtat e ndryshuar (data._synced > …),
 *    pra kërkesa të vogla;
 *  • kur aplikacioni kthehet në fokus — po ashtu, dhe pasi mungon ≥ 2 min (ose çdo 10 min) kontrollon edhe
 *    fshirjet e bëra nga pajisje të tjera (lista e id-ve);
 *  • kurrë mbi ndryshime lokale të paruajtura: një tabelë anashkalohet 20 s pas çdo ndryshimi lokal, dhe
 *    bashkimi (utils/serverMerge.js) e ruan çdo ndryshim lokal që s'është ngarkuar ende.
 *
 * tables: [{ name, value, set, baseRef }] — value = vargu aktual, set = ndryshuesi i gjendjes,
 *         baseRef = ref-i `prev…` i diffSync (çka dihet se është në databazë).
 */
const POLL_MS        = 60_000
const QUIET_MS       = 20_000          // pa ndryshim lokal të fundit
const OVERLAP_MS     = 10 * 60_000     // mbivendosje për diferenca ore mes pajisjeve
const FULL_AFTER_MS  = 2 * 60_000      // mungesë → kontrollo edhe fshirjet
const FULL_EVERY_MS  = 10 * 60_000
const PAGE           = 1000

async function fetchChanged(table, sinceISO) {
  const out = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from(table).select('id,data').filter('data->>_synced', 'gt', sinceISO)
      .order('id', { ascending: true }).range(from, from + PAGE - 1)
    if (error) throw error
    out.push(...(data || []).map(r => r.data))
    if (!data || data.length < PAGE) break
  }
  return out
}

async function fetchAllIds(table) {
  const ids = new Set()
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase.from(table).select('id').order('id', { ascending: true }).range(from, from + PAGE - 1)
    if (error) throw error
    ;(data || []).forEach(r => ids.add(r.id))
    if (!data || data.length < PAGE) break
  }
  return ids
}

export function useServerRefresh({ enabled, tables }) {
  const tablesRef = useRef(tables)
  tablesRef.current = tables                       // gjithmonë versioni i fundit i gjendjes

  const st = useRef({
    since: Date.now(),                             // koha e rifreskimit të fundit të suksesshëm
    lastFull: Date.now(),
    hiddenAt: null,
    running: false,
    seen: {},                                      // name -> vargu i parë herën e fundit
    lastChange: {},                                // name -> koha e ndryshimit të fundit lokal
  })

  // Shëno kur ndryshon çdo tabelë lokalisht (përfshirë ndryshimet që sjellim vetë — thjesht e vonon rifreskimin tjetër)
  useEffect(() => {
    const s = st.current
    for (const t of tables) {
      if (s.seen[t.name] !== t.value) { s.seen[t.name] = t.value; s.lastChange[t.name] = Date.now() }
    }
  })

  useEffect(() => {
    if (!enabled || !supabase) return undefined
    const s = st.current

    const refresh = async (forceFull = false) => {
      if (s.running || document.hidden) return
      s.running = true
      const startedAt = Date.now()
      try {
        const full = forceFull || startedAt - s.lastFull >= FULL_EVERY_MS
        const sinceISO = new Date(s.since - OVERLAP_MS).toISOString()
        for (const t of tablesRef.current) {
          if (Date.now() - (s.lastChange[t.name] || 0) < QUIET_MS) continue
          const changed   = await fetchChanged(t.name, sinceISO)
          const remoteIds = full ? await fetchAllIds(t.name) : null
          // Përdoruesi mund të ketë ndryshuar diçka gjatë kërkesës — nëse po, kjo tabelë pritet deri herën tjetër
          if (Date.now() - (s.lastChange[t.name] || 0) < QUIET_MS) continue
          const latest = tablesRef.current.find(x => x.name === t.name)
          const result = mergeServerChanges({ local: latest.value, base: latest.baseRef.current, changed, remoteIds })
          if (result) {
            // Baza e re hyn në fuqi kur diffSync sheh pikërisht këtë varg të bashkuar si `curr` (shih utils/syncBase.js)
            pendingBases.set(latest.baseRef, { curr: result.merged, base: result.newBase })
            latest.set(result.merged)
            console.log(`[refresh] ${t.name}: +${result.added} ~${result.updated} -${result.removed}`)
          }
        }
        s.since = startedAt
        if (full) s.lastFull = startedAt
      } catch (e) {
        console.warn('[refresh] dështoi (provohet përsëri më vonë):', e?.message || e)
      } finally {
        s.running = false
      }
    }

    const onVisibility = () => {
      if (document.hidden) { s.hiddenAt = Date.now(); return }
      const away = s.hiddenAt ? Date.now() - s.hiddenAt : 0
      s.hiddenAt = null
      refresh(away >= FULL_AFTER_MS)
    }
    const onFocus = () => refresh(false)

    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('focus', onFocus)
    const timer = setInterval(() => refresh(false), POLL_MS)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('focus', onFocus)
      clearInterval(timer)
    }
  }, [enabled])
}
