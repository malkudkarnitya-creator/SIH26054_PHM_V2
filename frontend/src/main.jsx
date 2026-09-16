import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App'
import V2App from './v2/V2App'
import { ErrorBoundary } from './components'
import './styles.css'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ErrorBoundary><Routes><Route path="/" element={<V2App />} /><Route path="/v2/*" element={<V2App />} /><Route path="*" element={<App />} /></Routes></ErrorBoundary>
    </BrowserRouter>
  </React.StrictMode>,
)

