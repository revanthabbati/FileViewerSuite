import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { detectFormat, FORMATS } from './formats'
import { navigate } from './router'

/*
 * The workspace holds every document opened in this browser session. Files stay
 * as in-memory Blobs — they are never uploaded, persisted or sent anywhere — and
 * are released when closed or when the tab is closed.
 */

const WorkspaceContext = createContext(null)

let nextId = 1

export function WorkspaceProvider({ children }) {
  const [docs, setDocs] = useState([])
  const [activeByKind, setActiveByKind] = useState({})
  const [toasts, setToasts] = useState([])
  const toastId = useRef(0)

  const notify = useCallback((message, tone = 'info') => {
    const id = ++toastId.current
    setToasts((t) => [...t, { id, message, tone }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500)
  }, [])

  const dismissToast = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), [])

  const addDoc = useCallback((blob, { name, kind, origin = 'upload', navigateTo = true } = {}) => {
    const doc = {
      id: `doc-${nextId++}`,
      name: name || blob.name || 'untitled',
      size: blob.size,
      kind,
      blob,
      origin,
      addedAt: Date.now(),
    }
    setDocs((d) => [...d, doc])
    setActiveByKind((a) => ({ ...a, [kind]: doc.id }))
    if (navigateTo) navigate(kind)
    return doc
  }, [])

  /**
   * Opens one or more files. `forceKind` skips detection (used when a viewer's own
   * drop zone receives a file); otherwise content is sniffed to pick the viewer.
   */
  const openFiles = useCallback(
    async (fileList, { forceKind, origin } = {}) => {
      const files = Array.from(fileList || [])
      let last = null
      for (const file of files) {
        const kind = (await detectFormat(file)) || forceKind
        if (!kind) {
          notify(`"${file.name}" isn't a recognised EML, EDI or Parquet file.`, 'error')
          continue
        }
        if (forceKind && kind !== forceKind) {
          notify(`"${file.name}" looks like ${FORMATS[kind].label} — opened in the ${FORMATS[kind].label} viewer.`, 'info')
        }
        last = addDoc(file, { kind, origin, navigateTo: false })
      }
      if (last) navigate(last.kind)
      return last
    },
    [addDoc, notify],
  )

  const openText = useCallback(
    (text, { name, kind, origin = 'paste' }) => addDoc(new Blob([text], { type: 'text/plain' }), { name, kind, origin }),
    [addDoc],
  )

  const activate = useCallback((doc) => {
    setActiveByKind((a) => ({ ...a, [doc.kind]: doc.id }))
    navigate(doc.kind)
  }, [])

  const closeDoc = useCallback((id) => {
    setDocs((list) => {
      const doc = list.find((d) => d.id === id)
      const remaining = list.filter((d) => d.id !== id)
      if (doc) {
        setActiveByKind((a) => {
          if (a[doc.kind] !== id) return a
          const sibling = [...remaining].reverse().find((d) => d.kind === doc.kind)
          return { ...a, [doc.kind]: sibling?.id }
        })
      }
      return remaining
    })
  }, [])

  const closeAll = useCallback(() => {
    setDocs([])
    setActiveByKind({})
  }, [])

  const value = useMemo(
    () => ({
      docs,
      activeByKind,
      toasts,
      openFiles,
      openText,
      addDoc,
      activate,
      closeDoc,
      closeAll,
      notify,
      dismissToast,
    }),
    [docs, activeByKind, toasts, openFiles, openText, addDoc, activate, closeDoc, closeAll, notify, dismissToast],
  )

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) throw new Error('useWorkspace must be used inside <WorkspaceProvider>')
  return ctx
}

export function useActiveDoc(kind) {
  const { docs, activeByKind } = useWorkspace()
  const docsOfKind = docs.filter((d) => d.kind === kind)
  const active = docsOfKind.find((d) => d.id === activeByKind[kind]) || docsOfKind[docsOfKind.length - 1] || null
  return { active, docsOfKind }
}
