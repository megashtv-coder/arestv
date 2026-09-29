/**
 * Ruan (ose përditëson) regjistrimin e njoftimeve push të kësaj pajisjeje —
 * thirret nga src/utils/pushNotifications.js pasi shfletuesi jep leje dhe
 * krijon subscription-in. Nuk kërkon identifikim të përdoruesit (vendimi i
 * marrë: çdo pajisje e regjistruar merr çdo njoftim, si lista e detyrave që
 * e shohin të gjithë).
 */
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://thlqdibbejhpfehphohl.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRobHFkaWJiZWpocGZlaHBob2hsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3OTc0MzksImV4cCI6MjA5NzM3MzQzOX0.8ID6URJyqim6WCNmeaVxVuQZnqhlR3mvw4ie3QJBjlQ'
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { subscription } = req.body || {}
  if (!subscription?.endpoint) return res.status(400).json({ error: 'Mungon subscription-i.' })

  const { error } = await supabase
    .from('push_subscriptions')
    .upsert({ endpoint: subscription.endpoint, subscription }, { onConflict: 'endpoint' })

  if (error) {
    console.error('[save-push-subscription] error:', error)
    return res.status(500).json({ error: error.message })
  }
  return res.status(200).json({ ok: true })
}
