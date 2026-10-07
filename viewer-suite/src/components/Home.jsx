import { useState } from 'react'
import Icon from './Icon'
import { FORMAT_LIST } from '../app/formats'
import { useWorkspace } from '../app/workspace'
import { samplesFor, openSample } from '../app/samples'
import { formatBytes, relativeTime } from '../app/utils'

const TRUST_POINTS = [
  { icon: 'shield', title: 'Zero-upload architecture', text: 'Every file is parsed inside your browser tab. Nothing is sent to a server, logged or stored.' },
  { icon: 'zap', title: 'Built for large files', text: 'Parquet files are read lazily — only the footer and the rows you are looking at are decoded.' },
  { icon: 'lock', title: 'Hardened email rendering', text: 'Message HTML runs in a script-less sandbox with remote content blocked until you allow it.' },
]

function HeroDropzone({ onOpenPicker }) {
  const { openFiles } = useWorkspace()
  const [over, setOver] = useState(false)
  return (
    <div
      className={`hero-drop ${over ? 'hero-drop-over' : ''}`}
      role="button"
      tabIndex={0}
      onClick={() => onOpenPicker()}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onOpenPicker()}
      onDragOver={(e) => {
        e.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setOver(false)
        openFiles(e.dataTransfer.files)
      }}
    >
      <div className="hero-drop-icon">
        <Icon name="upload" size={28} />
      </div>
      <div>
        <h2>Drop any file to get started</h2>
        <p className="muted">
          <strong>.eml</strong>, <strong>.edi / .x12</strong> or <strong>.parquet</strong> — the format is detected from the
          contents, so odd extensions are fine too.
        </p>
      </div>
      <span className="btn btn-primary">
        <Icon name="upload" size={16} /> Browse files
      </span>
    </div>
  )
}

export default function Home({ onOpenPicker }) {
  const { docs, activate, addDoc, notify } = useWorkspace()

  return (
    <div className="home">
      <section className="home-hero">
        <div className="home-hero-text">
          <span className="eyebrow">
            <Icon name="shield" size={14} /> Secure · Private · Client-side
          </span>
          <h1>One workspace for every file your integrations produce.</h1>
          <p>
            Inspect customer emails, decode EDI transactions and explore Parquet datasets side by side — with a consistent,
            fast interface and no data ever leaving your machine.
          </p>
        </div>
        <HeroDropzone onOpenPicker={onOpenPicker} />
      </section>

      <section className="format-grid" aria-label="Viewers">
        {FORMAT_LIST.map((f) => {
          const count = docs.filter((d) => d.kind === f.key).length
          const sample = samplesFor(f.key)[0]
          return (
            <article key={f.key} className={`format-card module-${f.key}`}>
              <header>
                <span className="format-card-icon">
                  <Icon name={f.icon} size={22} />
                </span>
                <div>
                  <h3>{f.longLabel}</h3>
                  <span className="muted small">{f.extensions.slice(0, 4).map((e) => `.${e}`).join('  ')}</span>
                </div>
                {count > 0 && <span className="badge badge-accent">{count} open</span>}
              </header>
              <p className="muted">{f.tagline}</p>
              <ul className="feature-list">
                {f.features.map((feat) => (
                  <li key={feat}>
                    <Icon name="check" size={14} strokeWidth={2.4} /> {feat}
                  </li>
                ))}
              </ul>
              <footer>
                <button className="btn btn-primary btn-small" onClick={() => onOpenPicker(f.key)}>
                  Open {f.label} file
                </button>
                {sample && (
                  <button className="btn btn-quiet btn-small" onClick={() => openSample(sample, addDoc, notify)}>
                    Try a sample
                  </button>
                )}
              </footer>
            </article>
          )
        })}
      </section>

      <div className="home-columns">
        <section className="panel">
          <div className="panel-header">
            <h2>Session files</h2>
            <p className="muted">Files opened in this tab. They are held in memory only and disappear when the tab closes.</p>
          </div>
          {docs.length === 0 ? (
            <div className="empty-mini">
              <Icon name="file" size={22} />
              <span>No files open yet.</span>
            </div>
          ) : (
            <ul className="recent-list">
              {[...docs].reverse().map((d) => (
                <li key={d.id}>
                  <button onClick={() => activate(d)}>
                    <span className={`kind-tag kind-tag-${d.kind}`}>{d.kind}</span>
                    <span className="truncate recent-name">{d.name}</span>
                    <span className="muted small nowrap">{formatBytes(d.size)}</span>
                    <span className="subtle small nowrap">{relativeTime(d.addedAt)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>Why teams use it</h2>
          </div>
          <ul className="trust-list">
            {TRUST_POINTS.map((t) => (
              <li key={t.title}>
                <span className="trust-icon">
                  <Icon name={t.icon} size={18} />
                </span>
                <div>
                  <strong>{t.title}</strong>
                  <p className="muted small">{t.text}</p>
                </div>
              </li>
            ))}
          </ul>
          <div className="shortcut-row">
            <span><kbd>Ctrl</kbd> <kbd>O</kbd> Open file</span>
            <span><kbd>Ctrl</kbd> <kbd>K</kbd> Command palette</span>
          </div>
        </section>
      </div>
    </div>
  )
}
