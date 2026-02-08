import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import { GoogleOAuthProvider } from '@react-oauth/google'

ReactDOM.createRoot(document.getElementById('root')).render(
  <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
    <App />
  </GoogleOAuthProvider>
)

if (import.meta.hot) {
  import.meta.hot.on('vite:beforeUpdate', () => {
    window.parent?.postMessage({ type: 'sandbox:beforeUpdate' }, '*')
  })
  import.meta.hot.on('vite:afterUpdate', () => {
    window.parent?.postMessage({ type: 'sandbox:afterUpdate' }, '*')
  })
}
