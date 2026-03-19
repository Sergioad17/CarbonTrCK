import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/tokens.css'
import { applySettings, getSettings, startSettingsSync } from './lib/settingsStore'

applySettings(getSettings())
startSettingsSync()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
