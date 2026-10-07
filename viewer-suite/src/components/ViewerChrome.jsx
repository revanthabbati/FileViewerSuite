import { useState } from 'react'
import Icon from './Icon'
import { FORMATS } from '../app/formats'
import { useWorkspace } from '../app/workspace'
import { samplesFor, openSample } from '../app/samples'
import { formatBytes, formatDateTime } from '../app/utils'

/** Tab strip of every open document of one kind, plus a quick "open another" button. */
export function DocTabs({ kind, docs, active, onOpenPicker }) {
  const { activate, closeDoc } = useWorkspace()
  return (
    <div className="doc-tabs" role="tablist" aria-label={`Open ${FORMATS[kind].label} files`}>
      {docs.map((d) => (
        <div key={d.id} className={`doc-tab ${active?.id === d.id ? 'doc-tab-active' : ''}`} role="presentation">
          <button role="tab" aria-selected={active?.id === d.id} className="doc-tab-main" onClick={() => activate(d)} title={d.name}>
            <Icon name={FORMATS[kind].icon} size={14} />
            <span className="truncate">{d.name}</span>
          </button>
          <button className="doc-tab-close" onClick={() => closeDoc(d.id)} aria-label={`Close ${d.name}`}>
            <Icon name="close" size={12} strokeWidth={2.4} />
          </button>
        </div>
      ))}
      <button className="doc-tab-add" onClick={onOpenPicker} title={`Open another ${FORMATS[kind].label} file`}>
        <Icon name="plus" size={15} />
      </button>
    </div>
  )
}

/** Page heading shared by all viewers: file name, metadata chips and right-aligned actions. */
export function ViewerHeader({ kind, doc, meta = [], actions }) {
  return (
    <div className="viewer-header">
      <div className="viewer-header-icon">
        <Icon name={FORMATS[kind].icon} size={22} />
      </div>
      <div className="viewer-header-text">
        <h1 className="truncate" title={doc.name}>{doc.name}</h1>
        <div className="viewer-meta">
          <span className={`kind-tag kind-tag-${kind}`}>{kind}</span>
          <span>{formatBytes(doc.size)}</span>
          <span>Opened {formatDateTime(doc.addedAt)}</span>
          {doc.origin === 'sample' && <span className="badge">Sample</span>}
          {doc.origin === 'attachment' && <span className="badge">From email attachment</span>}
          {meta.map((m, i) => (
            <span key={i}>{m}</span>
          ))}
        </div>
      </div>
      {actions && <div className="viewer-actions">{actions}</div>}
    </div>
  )
}

/** Landing state for a viewer that has no document open yet. */
export function ViewerEmpty({ kind, onOpenPicker, children }) {
  const fmt = FORMATS[kind]
  const { openFiles, addDoc, notify } = useWorkspace()
  const [over, setOver] = useState(false)
  const samples = samplesFor(kind)

  return (
    <div className="viewer-empty">
      <div
        className={`viewer-empty-drop ${over ? 'hero-drop-over' : ''}`}
        role="button"
        tabIndex={0}
        onClick={onOpenPicker}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onOpenPicker()}
        onDragOver={(e) => {
          e.preventDefault()
          setOver(true)
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setOver(false)
          openFiles(e.dataTransfer.files, { forceKind: kind })
        }}
      >
        <div className="viewer-empty-icon">
          <Icon name={fmt.icon} size={30} />
        </div>
        <h1>{fmt.longLabel}</h1>
        <p className="muted">{fmt.tagline}</p>
        <span className="btn btn-primary">
          <Icon name="upload" size={16} /> Choose a file or drop it here
        </span>
        <span className="subtle small">Accepts {fmt.extensions.slice(0, 6).map((e) => `.${e}`).join(', ')}</span>
      </div>

      {samples.length > 0 && (
        <div className="sample-row viewer-empty-samples">
          <span className="muted small">No file handy? Try a sample:</span>
          {samples.map((s) => (
            <button key={s.key} className="chip-btn" onClick={() => openSample(s, addDoc, notify)}>
              <Icon name="zap" size={12} /> {s.label}
            </button>
          ))}
        </div>
      )}

      {children}
    </div>
  )
}

export function LoadingState({ label }) {
  return (
    <div className="loading-state">
      <div className="spinner" />
      <span>{label}</span>
    </div>
  )
}
