/**
 * Vercel Cron Job — dërgon një njoftim PUSH (te çdo pajisje e regjistruar,
 * shih api/save-push-subscription.js) për detyrat (menuja "Detyrat") që kanë
 * afatin (reminderdate) sot dhe nuk janë kryer ende. Të gjithë përdoruesit
 * marrin të njëjtin njoftim, njësoj siç e shohin të gjithë listën e detyrave.
 *
 * Konfiguro në Vercel dashboard:
 *   VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT
 *     → çelësat për Web Push (shih .env.example për si gjenerohen)
 *   CRON_SECRET → një varg random që e zgjedh vet; Vercel e shton automatikisht
 *     si header "Authorization: Bearer <CRON_SECRET>" kur e thërret këtë
 *     funksion sipas orarit.
 *
 * Orari: vercel.json → crons (parazgjedhje: 07:00 UTC çdo ditë).
 */
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

const supabase = createClient(
  'https://thlqdibbejhpfehphohl.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRobHFkaWJiZWpocGZlaHBob2hsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3OTc0MzksImV4cCI6MjA5NzM3MzQzOX0.8ID6URJyqim6WCNmeaVxVuQZnqhlR3mvw4ie3QJBjlQ'
)

export default async function handler(req, res) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && req.headers.authorization !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return res.status(503).json({ error: 'Njoftimet push nuk janë konfiguruar (VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY).' })
  }
  webpush.setVapidDetails(VAPID_SUBJECT || 'mailto:info@example.com', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

  const today = new Date().toISOString().slice(0, 10)

  try {
    const { data: tasks, error: tErr } = await supabase
      .from('tasks')
      .select('id, customer, description')
      .eq('reminderdate', today)
      .or('completed.is.null,completed.eq.false')
    if (tErr) throw tErr

    if (!tasks || tasks.length === 0) {
      return res.status(200).json({ ok: true, date: today, tasks: 0, sent: 0 })
    }

    const { data: subs, error: sErr } = await supabase.from('push_subscriptions').select('endpoint, subscription')
    if (sErr) throw sErr
    if (!subs || subs.length === 0) {
      return res.status(200).json({ ok: true, date: today, tasks: tasks.length, sent: 0, message: 'Asnjë pajisje e regjistruar për njoftime.' })
    }

    const title = tasks.length === 1 ? 'Detyrë me afat sot' : `${tasks.length} detyra me afat sot`
    const body = tasks.length === 1
      ? `${tasks[0].customer} — ${tasks[0].description}`
      : tasks.slice(0, 3).map(t => `${t.customer}: ${t.description}`).join(' · ') + (tasks.length > 3 ? ' …' : '')
    const payload = JSON.stringify({ title, body, url: '/?page=tasks', tag: `tasks-${today}` })

    const deadEndpoints = []
    let sent = 0
    await Promise.all(subs.map(async row => {
      try {
        await webpush.sendNotification(row.subscription, payload)
        sent++
      } catch (e) {
        // 404/410 = subscription-i nuk vlen më (app-i u çinstalua / leja u hoq) — fshihet.
        if (e.statusCode === 404 || e.statusCode === 410) deadEndpoints.push(row.endpoint)
        else console.error('[send-task-reminders] push error:', row.endpoint, e.message)
      }
    }))

    if (deadEndpoints.length) {
      await supabase.from('push_subscriptions').delete().in('endpoint', deadEndpoints)
    }

    return res.status(200).json({ ok: true, date: today, tasks: tasks.length, devices: subs.length, sent, pruned: deadEndpoints.length })
  } catch (e) {
    console.error('[send-task-reminders] error:', e)
    return res.status(500).json({ error: e.message })
  }
}
