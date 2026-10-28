import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import StrobiGuide from './StrobiGuide'

function mountStrobi() {
  if (document.getElementById('strobi-widget-root')) return
  const root = document.createElement('div')
  root.id = 'strobi-widget-root'
  document.body.appendChild(root)
  createRoot(root).render(<StrictMode><StrobiGuide /></StrictMode>)
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountStrobi, { once: true })
} else {
  mountStrobi()
}
