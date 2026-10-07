import { useEffect, useMemo, useState } from 'react'
import PostalMime from 'postal-mime'
import './eml.css'
import Icon from '../../components/Icon'
import { DocTabs, LoadingState, ViewerEmpty, ViewerHeader } from '../../components/ViewerChrome'
import { useActiveDoc, useWorkspace } from '../../app/workspace'
import { detectFormat, formatForMime, FORMATS } from '../../app/formats'
import { baseName, copyText, downloadBlob, formatBytes, formatDateTime } from '../../app/utils'
import {
  attachmentBlob,
  attachmentIcon,
  authTone,
  buildSrcdoc,
  colorFor,
  flattenAddresses,
  formatDelay,
  hasRemoteContent,
  initials,
  isPreviewable,
  mailboxLabel,
  parseAuthResults,
  parseReceived,
  textToSrcdoc,
} from './emlUtils'

const MAX_SOURCE_CHARS = 2_000_000

function AddressList({ label, list }) {
  const people = flattenAddresses(list)
  if (!people.length) return null
  return (
    <div className="eml-addr-row">
      <dt>{label}</dt>
      <dd>
        {people.map((p, i) => (
          <span key={i} className="addr-pill" title={mailboxLabel(p)}>
            {p.name ? (
              <>
                <strong>{p.name}</strong> <span className="muted">&lt;{p.address}&gt;</span>
              </>
            ) : (
              p.address
            )}
          </span>
        ))}
      </dd>
    </div>
  )
}

function AuthChips({ results }) {
  if (!results.length) {
    return (
      <span className="badge" title="No Authentication-Results header was found on this message">
        <Icon name="shield" size={12} /> No authentication results
      </span>
    )
  }
  return results.map((r) => (
    <span key={r.method} className={`badge badge-${authTone(r.result)}`} title={r.detail || undefined}>
      <Icon name={r.result === 'pass' ? 'check' : 'alert'} size={12} strokeWidth={2.4} />
      {r.method.toUpperCase()} {r.result}
    </span>
  ))
}

function MessageTab({ email, auth }) {
  const [mode, setMode] = useState(email.html ? 'html' : 'text')
  const [allowRemote, setAllowRemote] = useState(false)
  const [tall, setTall] = useState(false)
  const remote = useMemo(() => hasRemoteContent(email.html), [email.html])
  const from = flattenAddresses(email.from)[0]

  const srcdoc = useMemo(() => {
    if (mode === 'html' && email.html) return buildSrcdoc(email.html, email.attachments, { allowRemote })
    if (email.text) return textToSrcdoc(email.text)
    return textToSrcdoc('This message has no viewable body.')
  }, [mode, email, allowRemote])

  return (
    <>
      <section className="panel eml-envelope">
        <h2 className="eml-subject">{email.subject || '(no subject)'}</h2>
        <div className="eml-from">
          <span className="avatar" style={{ background: colorFor(from?.address) }}>
            {initials(from)}
          </span>
          <div className="eml-from-text">
            <div>
              <strong>{from?.name || from?.address || 'Unknown sender'}</strong>
              {from?.name && <span className="muted"> &lt;{from.address}&gt;</span>}
            </div>
            <div className="muted small">{email.date ? formatDateTime(email.date) : 'No date'}</div>
          </div>
          <div className="eml-auth">
            <AuthChips results={auth} />
          </div>
        </div>
        <dl className="eml-addresses">
          <AddressList label="To" list={email.to} />
          <AddressList label="Cc" list={email.cc} />
          <AddressList label="Bcc" list={email.bcc} />
          <AddressList label="Reply-To" list={email.replyTo} />
        </dl>
      </section>

      {mode === 'html' && remote && !allowRemote && (
        <div className="banner banner-info">
          <Icon name="eyeOff" size={18} />
          <span style={{ flex: 1 }}>
            <strong>Remote content blocked.</strong> This message references external images or styles, which can be used to track
            when and where it was opened.
          </span>
          <button className="btn btn-secondary btn-small" onClick={() => setAllowRemote(true)}>
            Load remote content
          </button>
        </div>
      )}

      <section className="panel panel-flush">
        <div className="panel-toolbar">
          <h3>Message body</h3>
          <div className="spacer" />
          <div className="segmented" role="group" aria-label="Body format">
            <button aria-pressed={mode === 'html'} disabled={!email.html} onClick={() => setMode('html')}>
              HTML
            </button>
            <button aria-pressed={mode === 'text'} disabled={!email.text} onClick={() => setMode('text')}>
              Plain text
            </button>
          </div>
          <button className="btn btn-quiet btn-small" onClick={() => setTall((t) => !t)}>
            {tall ? 'Compact' : 'Expand'}
          </button>
        </div>
        <iframe
          title="Message body"
          className={`eml-frame ${tall ? 'eml-frame-tall' : ''}`}
          sandbox="allow-popups allow-popups-to-escape-sandbox"
          referrerPolicy="no-referrer"
          srcDoc={srcdoc}
        />
      </section>
    </>
  )
}

function AttachmentCard({ att, onPreview }) {
  const { addDoc, notify } = useWorkspace()
  const [kind, setKind] = useState(() => formatForMime(att.mimeType))
  const size = att.content?.byteLength ?? att.content?.length ?? 0
  const name = att.filename || `attachment.${(att.mimeType || 'bin').split('/').pop()}`

  useEffect(() => {
    let cancelled = false
    detectFormat(attachmentBlob(att), name).then((k) => !cancelled && k && setKind(k))
    return () => {
      cancelled = true
    }
  }, [att, name])

  return (
    <li className="att-card">
      <div className="att-icon">
        {att.mimeType?.startsWith('image/') ? (
          <AttachmentThumb att={att} />
        ) : (
          <Icon name={attachmentIcon(att.mimeType)} size={22} />
        )}
      </div>
      <div className="att-body">
        <div className="att-name truncate" title={name}>{name}</div>
        <div className="muted small">
          {att.mimeType} · {formatBytes(size)}
          {att.related && ' · inline'}
        </div>
        <div className="att-actions">
          {kind && (
            <button
              className="btn btn-primary btn-small"
              onClick={() => {
                addDoc(attachmentBlob(att), { name, kind, origin: 'attachment' })
                notify(`Opened "${name}" in the ${FORMATS[kind].label} viewer.`, 'success')
              }}
            >
              <Icon name="external" size={14} /> Open in {FORMATS[kind].label} viewer
            </button>
          )}
          {isPreviewable(att.mimeType) && (
            <button className="btn btn-secondary btn-small" onClick={() => onPreview(att, name)}>
              <Icon name="eye" size={14} /> Preview
            </button>
          )}
          <button className="btn btn-secondary btn-small" onClick={() => downloadBlob(attachmentBlob(att), name)}>
            <Icon name="download" size={14} /> Download
          </button>
        </div>
      </div>
    </li>
  )
}

function AttachmentThumb({ att }) {
  const [url, setUrl] = useState(null)
  useEffect(() => {
    const u = URL.createObjectURL(attachmentBlob(att))
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [att])
  return url ? <img src={url} alt="" /> : null
}

function PreviewModal({ att, name, onClose }) {
  const [url, setUrl] = useState(null)
  const [text, setText] = useState(null)
  const isImage = att.mimeType.startsWith('image/')
  const isPdf = att.mimeType === 'application/pdf'

  useEffect(() => {
    const blob = attachmentBlob(att)
    if (isImage || isPdf) {
      const u = URL.createObjectURL(blob)
      setUrl(u)
      return () => URL.revokeObjectURL(u)
    }
    blob.text().then((t) => setText(t.slice(0, 200_000)))
    return undefined
  }, [att, isImage, isPdf])

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel preview-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="truncate">{name}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <Icon name="close" size={16} />
          </button>
        </div>
        <div className="preview-body">
          {isImage && url && <img src={url} alt={name} />}
          {isPdf && url && (
            <object data={url} type="application/pdf" aria-label={name}>
              <p className="muted">Inline PDF preview isn't supported in this browser — use Download instead.</p>
            </object>
          )}
          {text !== null && <pre className="preview-text">{text}</pre>}
        </div>
      </div>
    </div>
  )
}

function AttachmentsTab({ email }) {
  const [preview, setPreview] = useState(null)
  const list = email.attachments
  if (!list.length) return <div className="empty-mini">This message has no attachments.</div>
  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Attachments</h2>
        <p className="muted">
          EML, EDI and Parquet attachments can be opened directly in their viewer. Files are extracted in memory and never uploaded.
        </p>
      </div>
      <ul className="att-grid">
        {list.map((att, i) => (
          <AttachmentCard key={i} att={att} onPreview={(a, name) => setPreview({ att: a, name })} />
        ))}
      </ul>
      {preview && <PreviewModal att={preview.att} name={preview.name} onClose={() => setPreview(null)} />}
    </section>
  )
}

function HeadersTab({ email }) {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const rows = q ? email.headers.filter((h) => h.key.includes(q) || h.value.toLowerCase().includes(q)) : email.headers
  return (
    <section className="panel panel-flush">
      <div className="panel-toolbar">
        <div className="input-with-icon">
          <Icon name="search" size={15} />
          <input className="search-input" placeholder={`Filter ${email.headers.length} headers…`} value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <button className="btn btn-secondary btn-small" onClick={() => copyText(email.headerLines.map((h) => h.line).join('\n'))}>
          <Icon name="copy" size={14} /> Copy all
        </button>
      </div>
      <div className="table-scroll">
        <table className="data-table header-table">
          <thead>
            <tr>
              <th>Header</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((h, i) => (
              <tr key={i}>
                <td className="mono nowrap header-key">{h.originalKey}</td>
                <td className="header-value">{h.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="muted" style={{ padding: '1rem' }}>No headers match “{query}”.</p>}
      </div>
    </section>
  )
}

function DeliveryTab({ email }) {
  const hops = useMemo(() => parseReceived(email.headers), [email])
  if (!hops.length) return <div className="empty-mini">No Received headers — the delivery path is unknown.</div>
  const total = hops[0]?.date && hops[hops.length - 1]?.date ? (hops[hops.length - 1].date - hops[0].date) / 1000 : null
  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Delivery path</h2>
        <p className="muted">
          {hops.length} hop{hops.length === 1 ? '' : 's'} reconstructed from the Received headers, oldest first
          {total !== null && <> · total transit time <strong>{formatDelay(total)}</strong></>}.
        </p>
      </div>
      <ol className="hop-list">
        {hops.map((hop, i) => (
          <li key={i} className="hop">
            <span className="hop-index">{i + 1}</span>
            <div className="hop-body">
              <div className="hop-route">
                <span className="mono">{hop.from}</span>
                <Icon name="chevronRight" size={14} />
                <span className="mono">{hop.by}</span>
                {hop.protocol && <span className="badge">{hop.protocol}</span>}
              </div>
              {hop.fromDetail && <div className="subtle small mono">{hop.fromDetail}</div>}
            </div>
            <div className="hop-time">
              <div className="small">{hop.date ? formatDateTime(hop.date) : '—'}</div>
              {i > 0 && <div className={`small ${hop.delay > 300 ? 'hop-slow' : 'muted'}`}>+{formatDelay(hop.delay)}</div>}
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}

function SourceTab({ raw }) {
  const truncated = raw.length > MAX_SOURCE_CHARS
  return (
    <section className="panel panel-flush">
      <div className="panel-toolbar">
        <h3>Raw MIME source</h3>
        <div className="spacer" />
        <button className="btn btn-secondary btn-small" onClick={() => copyText(raw)}>
          <Icon name="copy" size={14} /> Copy
        </button>
      </div>
      {truncated && <div className="banner banner-warn" style={{ margin: '0.75rem' }}>Showing the first 2 MB of the source.</div>}
      <pre className="eml-source">{truncated ? raw.slice(0, MAX_SOURCE_CHARS) : raw}</pre>
    </section>
  )
}

function EmlDocument({ doc }) {
  const [state, setState] = useState({ status: 'loading' })
  const [tab, setTab] = useState('message')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const buffer = await doc.blob.arrayBuffer()
        const email = await PostalMime.parse(buffer)
        const raw = new TextDecoder('utf-8', { fatal: false }).decode(buffer)
        if (!cancelled) setState({ status: 'ready', email, raw })
      } catch (e) {
        if (!cancelled) setState({ status: 'error', error: e.message || String(e) })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [doc])

  const email = state.email
  const auth = useMemo(() => (email ? parseAuthResults(email.headers) : []), [email])

  if (state.status === 'loading') return <LoadingState label="Parsing message securely in your browser…" />
  if (state.status === 'error') {
    return (
      <>
        <ViewerHeader kind="eml" doc={doc} />
        <div className="banner banner-error">
          <strong>This file could not be parsed as an email.</strong>
          <p>{state.error}</p>
        </div>
      </>
    )
  }

  const attachmentCount = email.attachments.length
  const tabs = [
    { key: 'message', label: 'Message', icon: 'mail' },
    { key: 'attachments', label: 'Attachments', icon: 'paperclip', count: attachmentCount },
    { key: 'headers', label: 'Headers', icon: 'list', count: email.headers.length },
    { key: 'delivery', label: 'Delivery path', icon: 'layers' },
    { key: 'source', label: 'Source', icon: 'code' },
  ]

  const actions = (
    <>
      {email.html && (
        <button
          className="btn btn-secondary btn-small"
          onClick={() => downloadBlob(new Blob([email.html], { type: 'text/html' }), `${baseName(doc.name)}.html`)}
        >
          <Icon name="download" size={15} /> HTML body
        </button>
      )}
      <button className="btn btn-secondary btn-small" onClick={() => downloadBlob(doc.blob, doc.name.endsWith('.eml') ? doc.name : `${doc.name}.eml`)}>
        <Icon name="download" size={15} /> Original .eml
      </button>
    </>
  )

  return (
    <>
      <ViewerHeader
        kind="eml"
        doc={doc}
        meta={[`${attachmentCount} attachment${attachmentCount === 1 ? '' : 's'}`, email.messageId ? `ID ${email.messageId}` : null].filter(Boolean)}
        actions={actions}
      />
      <nav className="tab-bar" role="tablist">
        {tabs.map((t) => (
          <button key={t.key} role="tab" aria-selected={tab === t.key} className={`tab-btn ${tab === t.key ? 'tab-btn-active' : ''}`} onClick={() => setTab(t.key)}>
            <Icon name={t.icon} size={16} />
            {t.label}
            {t.count > 0 && <span className="tab-count">{t.count}</span>}
          </button>
        ))}
      </nav>
      {tab === 'message' && <MessageTab email={email} auth={auth} />}
      {tab === 'attachments' && <AttachmentsTab email={email} />}
      {tab === 'headers' && <HeadersTab email={email} />}
      {tab === 'delivery' && <DeliveryTab email={email} />}
      {tab === 'source' && <SourceTab raw={state.raw} />}
    </>
  )
}

export default function EmlViewer({ onOpenPicker }) {
  const { active, docsOfKind } = useActiveDoc('eml')
  if (!active) return <ViewerEmpty kind="eml" onOpenPicker={onOpenPicker} />
  return (
    <div className="viewer">
      <DocTabs kind="eml" docs={docsOfKind} active={active} onOpenPicker={onOpenPicker} />
      <EmlDocument key={active.id} doc={active} />
    </div>
  )
}
