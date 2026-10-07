import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { WorkspaceProvider, useWorkspace } from './app/workspace'
import { useRoute } from './app/router'
import { useTheme } from './app/theme'
import { ACCEPT_ALL, FORMATS } from './app/formats'
import Sidebar from './components/Sidebar'
import Topbar from './components/Topbar'
import StatusBar from './components/StatusBar'
import DropOverlay from './components/DropOverlay'
import CommandPalette from './components/CommandPalette'
import Toasts from './components/Toasts'
import Home from './components/Home'
import ErrorBoundary from './components/ErrorBoundary'

// Each viewer is code-split so e.g. the Parquet decoders only load when a Parquet file is opened.
const VIEWERS = {
  eml: lazy(() => import('./modules/eml/EmlViewer')),
  edi: lazy(() => import('./modules/edi/EdiViewer')),
  parquet: lazy(() => import('./modules/parquet/ParquetViewer')),
}

export default function App() {
  return (
    <WorkspaceProvider>
      <Shell />
    </WorkspaceProvider>
  )
}

function useGlobalFileDrop(onFiles) {
  const [dragging, setDragging] = useState(false)
  useEffect(() => {
    let depth = 0
    const hasFiles = (e) => Array.from(e.dataTransfer?.types || []).includes('Files')
    const onEnter = (e) => {
      if (!hasFiles(e)) return
      depth++
      setDragging(true)
    }
    const onLeave = (e) => {
      if (!hasFiles(e)) return
      depth = Math.max(0, depth - 1)
      if (depth === 0) setDragging(false)
    }
    const onOver = (e) => {
      if (hasFiles(e)) e.preventDefault()
    }
    const onDrop = (e) => {
      if (!hasFiles(e)) return
      depth = 0
      setDragging(false)
      // A drop zone inside a viewer (e.g. the API-doc importer) already handled it.
      if (e.defaultPrevented) return
      e.preventDefault()
      if (e.dataTransfer.files?.length) onFiles(e.dataTransfer.files)
    }
    window.addEventListener('dragenter', onEnter)
    window.addEventListener('dragleave', onLeave)
    window.addEventListener('dragover', onOver)
    window.addEventListener('drop', onDrop)
    return () => {
      window.removeEventListener('dragenter', onEnter)
      window.removeEventListener('dragleave', onLeave)
      window.removeEventListener('dragover', onOver)
      window.removeEventListener('drop', onDrop)
    }
  }, [onFiles])
  return dragging
}

function Shell() {
  const route = useRoute()
  const [theme, setTheme] = useTheme()
  const { openFiles } = useWorkspace()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const inputRef = useRef(null)
  const pickerKind = useRef(null)

  const openPicker = useCallback((kind) => {
    pickerKind.current = kind || null
    if (inputRef.current) {
      inputRef.current.accept = kind ? FORMATS[kind].accept : ACCEPT_ALL
      inputRef.current.click()
    }
  }, [])

  const handleFiles = useCallback((files) => openFiles(files), [openFiles])
  const dragging = useGlobalFileDrop(handleFiles)

  useEffect(() => {
    const onKey = (e) => {
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen((o) => !o)
      } else if (mod && e.key.toLowerCase() === 'o') {
        e.preventDefault()
        openPicker()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openPicker])

  useEffect(() => setMobileNavOpen(false), [route])

  const Viewer = VIEWERS[route]

  return (
    <div className={`app ${collapsed ? 'sidebar-collapsed' : ''} ${mobileNavOpen ? 'mobile-nav-open' : ''}`}>
      <Sidebar
        route={route}
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed((c) => !c)}
        onOpenPicker={openPicker}
        onCloseMobile={() => setMobileNavOpen(false)}
      />
      <div className="app-scrim" onClick={() => setMobileNavOpen(false)} />

      <div className="app-body">
        <Topbar
          route={route}
          theme={theme}
          onThemeChange={setTheme}
          onOpenPicker={openPicker}
          onOpenPalette={() => setPaletteOpen(true)}
          onOpenMobileNav={() => setMobileNavOpen(true)}
        />
        <main className={`app-main module-${route}`} id="main">
          <ErrorBoundary key={route}>
            {Viewer ? (
              <Suspense
                fallback={
                  <div className="loading-state">
                    <div className="spinner" />
                    <span>Loading {FORMATS[route].longLabel}…</span>
                  </div>
                }
              >
                <Viewer onOpenPicker={() => openPicker(route)} />
              </Suspense>
            ) : (
              <Home onOpenPicker={openPicker} />
            )}
          </ErrorBoundary>
        </main>
        <StatusBar />
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files?.length) openFiles(e.target.files, { forceKind: pickerKind.current || undefined })
          e.target.value = ''
        }}
      />

      {dragging && <DropOverlay />}
      {paletteOpen && (
        <CommandPalette
          onClose={() => setPaletteOpen(false)}
          onOpenPicker={openPicker}
          theme={theme}
          onThemeChange={setTheme}
        />
      )}
      <Toasts />
    </div>
  )
}
