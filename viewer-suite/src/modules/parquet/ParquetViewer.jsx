import { useEffect, useMemo, useState } from 'react'
import './parquet.css'
import Icon from '../../components/Icon'
import { DocTabs, LoadingState, ViewerEmpty, ViewerHeader } from '../../components/ViewerChrome'
import { useActiveDoc } from '../../app/workspace'
import { formatBytes, formatNumber, copyText } from '../../app/utils'
import DataGrid from './DataGrid'
import { columnChunkStats, formatValue, openParquet } from './parquetUtils'

const TABS = [
  { key: 'data', label: 'Data', icon: 'table' },
  { key: 'schema', label: 'Schema', icon: 'layers' },
  { key: 'stats', label: 'Column statistics', icon: 'columns' },
  { key: 'metadata', label: 'File metadata', icon: 'database' },
]

function SchemaRow({ node, depth }) {
  const [open, setOpen] = useState(depth < 1)
  const hasChildren = node.children.length > 0
  return (
    <>
      <tr>
        <td>
          <div className="schema-name" style={{ paddingLeft: `${depth * 1.25}rem` }}>
            {hasChildren ? (
              <button className="schema-toggle" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={open ? 'Collapse' : 'Expand'}>
                <Icon name={open ? 'chevronDown' : 'chevronRight'} size={14} />
              </button>
            ) : (
              <span className="schema-toggle-spacer" />
            )}
            <span className="mono">{node.name}</span>
          </div>
        </td>
        <td>
          <span className="type-chip">{node.type}</span>
        </td>
        <td className="mono small muted">{node.physicalType || '—'}</td>
        <td>
          <span className={`badge ${node.repetition === 'REQUIRED' ? '' : node.repetition === 'REPEATED' ? 'badge-accent' : ''}`}>
            {node.repetition.toLowerCase()}
          </span>
        </td>
        <td className="mono small subtle">{node.path}</td>
      </tr>
      {open && node.children.map((c) => <SchemaRow key={c.path} node={c} depth={depth + 1} />)}
    </>
  )
}

function SchemaTab({ pq }) {
  const leafCount = useMemo(() => {
    const count = (n) => (n.children.length ? n.children.reduce((s, c) => s + count(c), 0) : 1)
    return count(pq.schema)
  }, [pq])
  const ddl = useMemo(() => {
    const render = (n, indent) =>
      n.children.length
        ? `${indent}${n.name} ${n.type}<\n${n.children.map((c) => render(c, indent + '  ')).join(',\n')}\n${indent}>`
        : `${indent}${n.name} ${n.type}${n.nullable ? '' : ' NOT NULL'}`
    return `message ${pq.schema.name || 'schema'} {\n${pq.columns.map((c) => render(c, '  ')).join(',\n')}\n}`
  }, [pq])

  return (
    <section className="panel panel-flush">
      <div className="panel-toolbar">
        <h3>
          {pq.columns.length} top-level fields · {leafCount} leaf columns
        </h3>
        <div className="spacer" />
        <button className="btn btn-secondary btn-small" onClick={() => copyText(ddl)}>
          <Icon name="copy" size={14} /> Copy schema
        </button>
      </div>
      <div className="table-scroll">
        <table className="data-table schema-table">
          <thead>
            <tr>
              <th>Field</th>
              <th>Type</th>
              <th>Physical</th>
              <th>Repetition</th>
              <th>Path</th>
            </tr>
          </thead>
          <tbody>
            {pq.columns.map((c) => (
              <SchemaRow key={c.path} node={c} depth={0} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function StatsTab({ pq }) {
  const stats = useMemo(() => columnChunkStats(pq.metadata), [pq])
  const maxSize = Math.max(1, ...stats.map((s) => s.compressed))
  const totalCompressed = stats.reduce((s, c) => s + c.compressed, 0)
  return (
    <section className="panel panel-flush">
      <div className="panel-toolbar">
        <h3>Per-column statistics from the file footer</h3>
        <div className="spacer" />
        <span className="muted small">No data pages are read for this view.</span>
      </div>
      <div className="table-scroll">
        <table className="data-table stats-table">
          <thead>
            <tr>
              <th>Column</th>
              <th>Type</th>
              <th className="num">Nulls</th>
              <th>Min</th>
              <th>Max</th>
              <th>Codec</th>
              <th>Encodings</th>
              <th className="num">Compressed</th>
              <th className="num">Ratio</th>
              <th style={{ minWidth: 140 }}>Share of file</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((s) => {
              const ratio = s.compressed ? s.uncompressed / s.compressed : null
              const share = totalCompressed ? (s.compressed / totalCompressed) * 100 : 0
              return (
                <tr key={s.path}>
                  <td className="mono">{s.path}</td>
                  <td>
                    <span className="type-chip">{s.type}</span>
                  </td>
                  <td className="num">
                    {s.nullsKnown ? (
                      <>
                        {formatNumber(s.nulls)}
                        {s.values > 0 && <span className="subtle small"> ({((s.nulls / s.values) * 100).toFixed(1)}%)</span>}
                      </>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="stat-val" title={s.min !== undefined ? formatValue(s.min) : undefined}>
                    {s.min !== undefined ? formatValue(s.min) : '—'}
                  </td>
                  <td className="stat-val" title={s.max !== undefined ? formatValue(s.max) : undefined}>
                    {s.max !== undefined ? formatValue(s.max) : '—'}
                  </td>
                  <td className="small">{s.codecs.join(', ')}</td>
                  <td className="small muted">{s.encodings.join(', ')}</td>
                  <td className="num nowrap">{formatBytes(s.compressed)}</td>
                  <td className="num">{ratio ? `${ratio.toFixed(1)}×` : '—'}</td>
                  <td>
                    <div className="size-meter" title={`${formatBytes(s.compressed)} — ${share.toFixed(1)}% of column data`}>
                      <span style={{ width: `${Math.max(1.5, (s.compressed / maxSize) * 100)}%` }} />
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function KeyValueEntry({ kv }) {
  const [open, setOpen] = useState(false)
  const pretty = useMemo(() => {
    try {
      return JSON.stringify(JSON.parse(kv.value), null, 2)
    } catch {
      return kv.value
    }
  }, [kv.value])
  const long = (kv.value || '').length > 160
  return (
    <div className="kv-entry">
      <button className="kv-entry-head" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <Icon name={open ? 'chevronDown' : 'chevronRight'} size={14} />
        <span className="mono">{kv.key}</span>
        <span className="subtle small">{formatBytes((kv.value || '').length)}</span>
        {!open && !long && <span className="muted small truncate kv-inline">{kv.value}</span>}
      </button>
      {open && <pre className="kv-value">{pretty}</pre>}
    </div>
  )
}

function MetadataTab({ pq, doc }) {
  const md = pq.metadata
  const totalCompressed = md.row_groups.reduce((s, rg) => s + Number(rg.total_compressed_size ?? rg.columns.reduce((a, c) => a + Number(c.meta_data?.total_compressed_size || 0), 0)), 0)
  const totalUncompressed = md.row_groups.reduce((s, rg) => s + Number(rg.total_byte_size), 0)

  return (
    <div className="meta-grid">
      <section className="panel">
        <div className="panel-header">
          <h2>File</h2>
        </div>
        <dl className="kv-grid">
          <dt>Created by</dt>
          <dd className="mono small">{md.created_by || '—'}</dd>
          <dt>Format version</dt>
          <dd>{md.version}</dd>
          <dt>Rows</dt>
          <dd>{formatNumber(md.num_rows)}</dd>
          <dt>Row groups</dt>
          <dd>{md.row_groups.length}</dd>
          <dt>File size</dt>
          <dd>{formatBytes(doc.size)}</dd>
          <dt>Footer size</dt>
          <dd>{formatBytes(md.metadata_length)}</dd>
          <dt>Uncompressed data</dt>
          <dd>{formatBytes(totalUncompressed)}</dd>
          <dt>Compression ratio</dt>
          <dd>{totalCompressed ? `${(totalUncompressed / totalCompressed).toFixed(2)}×` : '—'}</dd>
        </dl>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>Key/value metadata</h2>
          <p className="muted">Writer-supplied metadata, e.g. the Arrow or pandas schema.</p>
        </div>
        {md.key_value_metadata?.length ? (
          md.key_value_metadata.map((kv) => <KeyValueEntry key={kv.key} kv={kv} />)
        ) : (
          <div className="empty-mini">No key/value metadata.</div>
        )}
      </section>

      <section className="panel panel-flush meta-span">
        <div className="panel-toolbar">
          <h3>Row groups</h3>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th className="num">Rows</th>
                <th className="num">First row</th>
                <th className="num">Uncompressed</th>
                <th className="num">Compressed</th>
                <th className="num">Columns</th>
                <th>Sorted by</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const starts = md.row_groups.map((_, i) => md.row_groups.slice(0, i).reduce((sum, g) => sum + Number(g.num_rows), 0))
                return md.row_groups.map((rg, i) => {
                  const first = starts[i]
                  const compressed = rg.total_compressed_size ?? rg.columns.reduce((a, c) => a + Number(c.meta_data?.total_compressed_size || 0), 0)
                  return (
                    <tr key={i}>
                      <td>{i}</td>
                      <td className="num">{formatNumber(rg.num_rows)}</td>
                      <td className="num">{formatNumber(first + 1)}</td>
                      <td className="num">{formatBytes(Number(rg.total_byte_size))}</td>
                      <td className="num">{formatBytes(Number(compressed))}</td>
                      <td className="num">{rg.columns.length}</td>
                      <td className="small muted">
                        {rg.sorting_columns?.length
                          ? rg.sorting_columns
                              .map((sc) => `${rg.columns[sc.column_idx]?.meta_data?.path_in_schema.join('.') ?? sc.column_idx} ${sc.descending ? 'desc' : 'asc'}`)
                              .join(', ')
                          : '—'}
                      </td>
                    </tr>
                  )
                })
              })()}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function ParquetDocument({ doc }) {
  const [state, setState] = useState({ status: 'loading' })
  const [tab, setTab] = useState('data')

  useEffect(() => {
    let cancelled = false
    openParquet(doc.blob)
      .then((pq) => !cancelled && setState({ status: 'ready', pq }))
      .catch((e) => !cancelled && setState({ status: 'error', error: e.message || String(e) }))
    return () => {
      cancelled = true
    }
  }, [doc])

  if (state.status === 'loading') return <LoadingState label="Reading Parquet footer…" />
  if (state.status === 'error') {
    return (
      <>
        <ViewerHeader kind="parquet" doc={doc} />
        <div className="banner banner-error">
          <strong>This file could not be read as Parquet.</strong>
          <p>{state.error}</p>
        </div>
      </>
    )
  }

  const { pq } = state
  const md = pq.metadata
  const codecs = [...new Set(md.row_groups.flatMap((rg) => rg.columns.map((c) => c.meta_data?.codec)).filter(Boolean))]

  return (
    <>
      <ViewerHeader kind="parquet" doc={doc} meta={[md.created_by ? md.created_by.split(' (')[0] : null].filter(Boolean)} />
      <div className="summary-bar">
        <div className="summary-card">
          <span className="summary-label">Rows</span>
          <span className="summary-value">{formatNumber(pq.numRows)}</span>
        </div>
        <div className="summary-card">
          <span className="summary-label">Columns</span>
          <span className="summary-value">{pq.columns.length}</span>
        </div>
        <div className="summary-card">
          <span className="summary-label">Row groups</span>
          <span className="summary-value">{md.row_groups.length}</span>
        </div>
        <div className="summary-card">
          <span className="summary-label">Compression</span>
          <span className="summary-value">{codecs.join(', ') || '—'}</span>
        </div>
        <div className="summary-card">
          <span className="summary-label">File size</span>
          <span className="summary-value">{formatBytes(doc.size)}</span>
        </div>
      </div>

      <nav className="tab-bar" role="tablist">
        {TABS.map((t) => (
          <button key={t.key} role="tab" aria-selected={tab === t.key} className={`tab-btn ${tab === t.key ? 'tab-btn-active' : ''}`} onClick={() => setTab(t.key)}>
            <Icon name={t.icon} size={16} />
            {t.label}
          </button>
        ))}
      </nav>

      {/* Data tab stays mounted so its page, filters and cache survive tab switches. */}
      <div hidden={tab !== 'data'}>
        <DataGrid pq={pq} docName={doc.name} />
      </div>
      {tab === 'schema' && <SchemaTab pq={pq} />}
      {tab === 'stats' && <StatsTab pq={pq} />}
      {tab === 'metadata' && <MetadataTab pq={pq} doc={doc} />}
    </>
  )
}

export default function ParquetViewer({ onOpenPicker }) {
  const { active, docsOfKind } = useActiveDoc('parquet')
  if (!active) return <ViewerEmpty kind="parquet" onOpenPicker={onOpenPicker} />
  return (
    <div className="viewer">
      <DocTabs kind="parquet" docs={docsOfKind} active={active} onOpenPicker={onOpenPicker} />
      <ParquetDocument key={active.id} doc={active} />
    </div>
  )
}
