import { app, BrowserWindow } from 'electron'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const isDev = !app.isPackaged

const resolveRendererUrl = () => {
  if (!isDev) {
    return null
  }

  const explicit = process.env.ELECTRON_RENDERER_URL ?? process.env.VITE_DEV_SERVER_URL
  if (explicit) {
    return explicit
  }

  return 'http://localhost:5173'
}

const createWindow = () => {
  const window = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: '#FFFFFF',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  })

  window.once('ready-to-show', () => {
    window.show()
    if (isDev) {
      window.webContents.openDevTools({ mode: 'detach' }).catch(() => {
        // ignore
      })
    }
  })

  const devServerUrl = resolveRendererUrl()

  if (devServerUrl) {
    window.loadURL(devServerUrl).catch((error) => {
      console.error('Failed to load Vite dev server', error)
    })
  } else {
    const indexPath = path.join(__dirname, '..', 'dist', 'index.html')
    window
      .loadFile(indexPath)
      .catch((error) => {
        console.error('Failed to load production build', error)
      })
  }
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})


