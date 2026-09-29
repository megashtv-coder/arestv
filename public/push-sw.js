/* eslint-disable no-restricted-globals */
/**
 * Trajtuesi i njoftimeve push — importohet brenda service worker-it të
 * gjeneruar nga vite-plugin-pwa (shih workbox.importScripts te vite.config.js).
 * Ekzekutohet edhe kur app-i është i mbyllur, sepse e nis vetë shfletuesi
 * kur mbërrin një njoftim push nga serveri.
 */
self.addEventListener('push', event => {
  let payload = { title: 'X-Flow', body: 'Ke një njoftim të ri.' }
  try {
    if (event.data) payload = { ...payload, ...event.data.json() }
  } catch { /* mbetet vlera default */ }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: payload.icon || '/pwa-192x192.png',
      badge: payload.badge || '/pwa-64x64.png',
      data: { url: payload.url || '/' },
      tag: payload.tag || undefined,
    })
  )
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url)
    })
  )
})
