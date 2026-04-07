import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './BackgroundSettings/themeStyles.css'
import { applySettings, fetchSettings, startSettingsSync } from './api/settings'

applySettings(fetchSettings())
startSettingsSync()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
