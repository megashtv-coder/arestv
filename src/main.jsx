import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { registerSW } from 'virtual:pwa-register'

// Auto-update service worker — reload page when new version is ready
const updateSW = registerSW({
  onNeedRefresh() {
    updateSW(true)
  },
  onOfflineReady() {},
  onRegisteredSW(swUrl, r) {
    // Kontrollo për update vetëm kur tab bëhet aktiv
    if (r) document.addEventListener('visibilitychange', () => { if (!document.hidden) r.update() })
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
