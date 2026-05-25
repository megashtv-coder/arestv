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
    // Kontrollo për update çdo 60 sekonda
    if (r) setInterval(() => r.update(), 60 * 1000)
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
