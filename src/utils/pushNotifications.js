/**
 * Njoftimet Push (Web Push) — lejon që app-i (i instaluar si PWA) të dërgojë
 * njoftim real te telefoni/desktopi, edhe kur app-i është i mbyllur, përmes
 * kartës së shërbimit (service worker) të regjistruar nga vite-plugin-pwa
 * (shih public/push-sw.js, i importuar nga sw.js përmes workbox.importScripts
 * te vite.config.js).
 *
 * Rrjedha: butoni "Aktivizo Njoftimet" te Cilësimet → kërkon leje nga
 * shfletuesi → regjistrohet një "subscription" (endpoint unik i kësaj
 * pajisjeje) → ruhet në Supabase (push_subscriptions) përmes
 * api/save-push-subscription.js → cron-i ditor (api/cron/send-task-reminders.js)
 * i dërgon njoftim çdo subscription-i të ruajtur kur ka detyrë me afat sot.
 */

// Konverton çelësin publik VAPID (base64url, siç del nga env) në formatin
// Uint8Array që kërkon pushManager.subscribe().
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}

export function isPushSupported() {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window
}

export async function getPushSubscriptionState() {
  if (!isPushSupported()) return 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  try {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    return sub ? 'subscribed' : 'unsubscribed'
  } catch {
    return 'unsubscribed'
  }
}

export async function enablePushNotifications() {
  if (!isPushSupported()) throw new Error('Ky shfletues nuk i mbështet njoftimet push.')
  const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY
  if (!vapidKey) throw new Error('Njoftimet push nuk janë konfiguruar ende (mungon VITE_VAPID_PUBLIC_KEY).')

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('Leja për njoftime u refuzua.')

  const reg = await navigator.serviceWorker.ready
  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    })
  }

  const resp = await fetch('/api/save-push-subscription', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscription: sub.toJSON() }),
  })
  if (!resp.ok) throw new Error("S'u ruajt regjistrimi i njoftimeve në server.")
  return sub
}

export async function disablePushNotifications() {
  if (!isPushSupported()) return
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.getSubscription()
  if (sub) await sub.unsubscribe()
}
