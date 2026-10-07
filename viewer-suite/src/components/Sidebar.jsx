import Icon from './Icon'
import { FORMAT_LIST } from '../app/formats'
import { navigate } from '../app/router'
import { useWorkspace } from '../app/workspace'
import { formatBytes } from '../app/utils'

export default function Sidebar({ route, collapsed, onToggleCollapsed, onOpenPicker, onCloseMobile }) {
  const { docs, activeByKind, activate, closeDoc } = useWorkspace()

  return (
    <aside className="sidebar" aria-label="Primary">
      <div className="sidebar-brand">
        <a href="#/" className="brand-link" title="Viewer Suite home">
          <span className="brand-logo" aria-hidden="true">
            <svg viewBox="0 0 32 32" width="30" height="30">
              <defs>
                <linearGradient id="brandGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#5b7bff" />
                  <stop offset="1" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
              <rect width="32" height="32" rx="8" fill="url(#brandGrad)" />
              <path d="M9 10h14M9 16h14M9 22h9" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
            </svg>
          </span>
          <span className="brand-text">
            <strong>Viewer Suite</strong>
            <small>EML · EDI · Parquet</small>
          </span>
        </a>
        <button className="sidebar-mobile-close" onClick={onCloseMobile} aria-label="Close navigation">
          <Icon name="close" />
        </button>
      </div>

      <div className="sidebar-cta">
        <button className="sidebar-open-btn" onClick={() => onOpenPicker()} title="Open file (Ctrl+O)">
          <Icon name="plus" size={16} strokeWidth={2.2} />
          <span>Open file</span>
        </button>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-section-label">Workspace</div>
        <button
          className={`nav-item ${route === 'home' ? 'nav-item-active' : ''}`}
          onClick={() => navigate('home')}
          title="Overview"
        >
          <Icon name="home" />
          <span className="nav-label">Overview</span>
        </button>

        <div className="sidebar-section-label">Viewers</div>
        {FORMAT_LIST.map((f) => {
          const count = docs.filter((d) => d.kind === f.key).length
          return (
            <button
              key={f.key}
              className={`nav-item nav-item-${f.key} ${route === f.key ? 'nav-item-active' : ''}`}
              onClick={() => navigate(f.key)}
              title={f.longLabel}
            >
              <Icon name={f.icon} />
              <span className="nav-label">{f.label} Viewer</span>
              {count > 0 && <span className="nav-count">{count}</span>}
            </button>
          )
        })}

        {docs.length > 0 && (
          <>
            <div className="sidebar-section-label">Open files</div>
            <ul className="open-files">
              {docs.map((doc) => {
                const isActive = route === doc.kind && activeByKind[doc.kind] === doc.id
                return (
                  <li key={doc.id} className={`open-file ${isActive ? 'open-file-active' : ''}`}>
                    <button className="open-file-main" onClick={() => activate(doc)} title={`${doc.name} — ${formatBytes(doc.size)}`}>
                      <span className={`open-file-dot dot-${doc.kind}`} />
                      <span className="open-file-name truncate">{doc.name}</span>
                    </button>
                    <button className="open-file-close" onClick={() => closeDoc(doc.id)} aria-label={`Close ${doc.name}`}>
                      <Icon name="close" size={13} strokeWidth={2.2} />
                    </button>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </nav>

      <div className="sidebar-footer">
        <div className="privacy-chip" title="All parsing happens in this browser tab. Files are never uploaded.">
          <Icon name="shield" size={16} />
          <span className="nav-label">100% client-side · zero upload</span>
        </div>
        <button className="collapse-btn" onClick={onToggleCollapsed} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          <Icon name={collapsed ? 'chevronsRight' : 'chevronsLeft'} size={16} />
        </button>
      </div>
    </aside>
  )
}
