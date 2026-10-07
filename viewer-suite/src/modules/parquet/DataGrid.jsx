import { useEffect, useMemo, useRef, useState } from 'react'
import Icon from '../../components/Icon'
import { baseName, downloadBlob, formatNumber } from '../../app/utils'
import { useWorkspace } from '../../app/workspace'
import {
  cellKind,
  compareValues,
  formatValue,
  matchesCondition,
  OPERATORS,
  prettyValue,
  readRows,
  rowsToCsv,
  rowsToJson,
} from './parquetUtils'

const PAGE_SIZES = [50, 100, 250, 500]
// Filtering/sorting/exporting everything loads the selected columns fully into memory.
const MAX_QUERY_CELLS = 10_000_000
const DEFAULT_VISIBLE_COLUMNS = 40

function useOutsideClose(ref, open, onClose) {
  useEffect(() => {
    if (!open) return undefined
    const onDown = (e) => ref.current && !ref.current.contains(e.target) && onClose()
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [ref, open, onClose])
}

function ColumnChooser({ columns, visible, onChange }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const ref = useRef(null)
  useOutsideClose(ref, open, () => setOpen(false))
  const shown = columns.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()))
  return (
    <div className="popover-anchor" ref={ref}>
      <button className="btn btn-secondary btn-small" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <Icon name="columns" size={14} /> Columns
        <span className="tab-count">
          {visible.length}/{columns.length}
        </span>
      </button>
      {open && (
        <div className="popover column-chooser">
          <input className="search-input" placeholder="Find column…" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
          <div className="column-chooser-actions">
            <button className="link-btn" onClick={() => onChange(columns.map((c) => c.name))}>Select all</button>
            <button className="link-btn" onClick={() => onChange(columns.slice(0, 1).map((c) => c.name))}>Clear</button>
          </div>
          <ul>
            {shown.map((c) => {
              const checked = visible.includes(c.name)
              return (
                <li key={c.name}>
                  <label>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        const next = checked ? visible.filter((v) => v !== c.name) : columns.map((x) => x.name).filter((n) => n === c.name || visible.includes(n))
                        if (next.length) onChange(next)
                      }}
                    />
                    <span className="truncate">{c.name}</span>
                    <span className="type-chip">{c.type}</span>
                  </label>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}

function ExportMenu({ onExport, canExportAll, totalLabel }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useOutsideClose(ref, open, () => setOpen(false))
  const item = (scope, format, label) => (
    <button
      className="menu-item"
      disabled={scope === 'all' && !canExportAll}
      onClick={() => {
        setOpen(false)
        onExport(scope, format)
      }}
    >
      {label}
    </button>
  )
  return (
    <div className="popover-anchor" ref={ref}>
      <button className="btn btn-secondary btn-small" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <Icon name="download" size={14} /> Export <Icon name="chevronDown" size={13} />
      </button>
      {open && (
        <div className="popover popover-right menu">
          <div className="menu-label">Current page</div>
          {item('page', 'csv', 'Download as CSV')}
          {item('page', 'json', 'Download as JSON')}
          <div className="menu-label">{totalLabel}</div>
          {item('all', 'csv', 'Download as CSV')}
          {item('all', 'json', 'Download as JSON')}
          {!canExportAll && <p className="menu-note">Too large to export in-browser — select fewer columns.</p>}
        </div>
      )}
    </div>
  )
}

function FilterBuilder({ columns, conditions, onChange }) {
  const update = (i, patch) => onChange(conditions.map((c, j) => (j === i ? { ...c, ...patch } : c)))
  return (
    <div className="filter-builder">
      {conditions.map((c, i) => {
        const op = OPERATORS.find((o) => o.key === c.op)
        return (
          <div className="filter-row" key={i}>
            <span className="filter-join">{i === 0 ? 'Where' : 'and'}</span>
            <select value={c.column} onChange={(e) => update(i, { column: e.target.value })} aria-label="Column">
              {columns.map((col) => (
                <option key={col.name} value={col.name}>
                  {col.name}
                </option>
              ))}
            </select>
            <select value={c.op} onChange={(e) => update(i, { op: e.target.value })} aria-label="Operator">
              {OPERATORS.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              ))}
            </select>
            {op?.needsValue && (
              <input className="text-input filter-value" value={c.value} placeholder="value" onChange={(e) => update(i, { value: e.target.value })} aria-label="Value" />
            )}
            <button className="btn btn-quiet btn-icon btn-small" onClick={() => onChange(conditions.filter((_, j) => j !== i))} aria-label="Remove filter">
              <Icon name="close" size={14} />
            </button>
          </div>
        )
      })}
    </div>
  )
}

function RowDrawer({ pq, rowIndex, onClose }) {
  const [row, setRow] = useState(null)
  const [error, setError] = useState(null)
  useEffect(() => {
    let cancelled = false
    setRow(null)
    readRows(pq, { rowStart: rowIndex, rowEnd: rowIndex + 1 })
      .then((r) => !cancelled && setRow(r[0] || {}))
      .catch((e) => !cancelled && setError(e.message))
    return () => {
      cancelled = true
    }
  }, [pq, rowIndex])
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <>
      <div className="drawer-scrim" onClick={onClose} />
      <aside className="drawer" aria-label={`Row ${rowIndex + 1}`}>
        <div className="drawer-header">
          <div>
            <h2>Row {formatNumber(rowIndex + 1)}</h2>
            <span className="muted small">All {pq.columns.length} columns</span>
          </div>
          <div className="spacer" />
          {row && (
            <button
              className="btn btn-secondary btn-small"
              onClick={() => navigator.clipboard?.writeText(rowsToJson([row], pq.columns.map((c) => c.name)))}
            >
              <Icon name="copy" size={14} /> Copy JSON
            </button>
          )}
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <Icon name="close" size={16} />
          </button>
        </div>
        <div className="drawer-body">
          {error && <div className="banner banner-error">{error}</div>}
          {!row && !error && <div className="spinner" style={{ margin: '2rem auto' }} />}
          {row && (
            <dl className="row-fields">
              {pq.columns.map((c) => (
                <div key={c.name} className="row-field">
                  <dt>
                    <span className="truncate">{c.name}</span>
                    <span className="type-chip">{c.type}</span>
                  </dt>
                  <dd className={`cell-${cellKind(row[c.name])}`}>
                    <pre>{prettyValue(row[c.name])}</pre>
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </aside>
    </>
  )
}

export default function DataGrid({ pq, docName }) {
  const { notify } = useWorkspace()
  const allNames = useMemo(() => pq.columns.map((c) => c.name), [pq])
  const colByName = useMemo(() => Object.fromEntries(pq.columns.map((c) => [c.name, c])), [pq])

  const [visible, setVisible] = useState(() => allNames.slice(0, DEFAULT_VISIBLE_COLUMNS))
  const [pageSize, setPageSize] = useState(100)
  const [page, setPage] = useState(0)
  const [conditions, setConditions] = useState([])
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState(null) // { column, dir: 1 | -1 }
  const [pageRows, setPageRows] = useState({ rows: [], start: 0 })
  const [fullData, setFullData] = useState(null) // { key, rows: [{ i, r }] }
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selectedRow, setSelectedRow] = useState(null)
  const [pageInput, setPageInput] = useState('1')
  const requestId = useRef(0)

  // Serialised so memos/effects only re-run when the effective filter actually changes.
  const condKey = JSON.stringify(
    conditions.filter((c) => {
      const op = OPERATORS.find((o) => o.key === c.op)
      return !op?.needsValue || c.value.trim() !== ''
    }),
  )
  const activeConditions = useMemo(() => JSON.parse(condKey), [condKey])
  const queryMode = activeConditions.length > 0 || search.trim() !== '' || sort !== null

  const queryColumns = useMemo(() => {
    const set = new Set(visible)
    activeConditions.forEach((c) => set.add(c.column))
    if (sort) set.add(sort.column)
    return allNames.filter((n) => set.has(n))
  }, [visible, activeConditions, sort, allNames])
  const queryKey = queryColumns.join('\u0000')
  const queryCells = pq.numRows * queryColumns.length
  const queryTooLarge = queryCells > MAX_QUERY_CELLS

  // Browse mode: read exactly one page of rows straight from the file.
  useEffect(() => {
    if (queryMode) return
    const id = ++requestId.current
    const start = page * pageSize
    const end = Math.min(pq.numRows, start + pageSize)
    setLoading(true)
    setError(null)
    readRows(pq, { rowStart: start, rowEnd: end, columns: visible })
      .then((rows) => id === requestId.current && setPageRows({ rows, start }))
      .catch((e) => id === requestId.current && setError(e.message))
      .finally(() => id === requestId.current && setLoading(false))
  }, [pq, page, pageSize, visible, queryMode])

  // Query mode: load the needed columns for every row once, then filter/sort in memory.
  useEffect(() => {
    if (!queryMode || queryTooLarge || fullData?.key === queryKey) return
    const id = ++requestId.current
    setLoading(true)
    setError(null)
    readRows(pq, { rowStart: 0, rowEnd: pq.numRows, columns: queryColumns })
      .then((rows) => id === requestId.current && setFullData({ key: queryKey, rows: rows.map((r, i) => ({ i, r })) }))
      .catch((e) => id === requestId.current && setError(e.message))
      .finally(() => id === requestId.current && setLoading(false))
  }, [pq, queryMode, queryKey, queryColumns, queryTooLarge, fullData])

  const derived = useMemo(() => {
    if (!queryMode || !fullData || fullData.key !== queryKey) return null
    const q = search.trim().toLowerCase()
    let list = fullData.rows.filter(({ r }) => activeConditions.every((c) => matchesCondition(r[c.column], c)))
    if (q) list = list.filter(({ r }) => visible.some((col) => r[col] !== null && r[col] !== undefined && formatValue(r[col]).toLowerCase().includes(q)))
    if (sort) list = [...list].sort((a, b) => sort.dir * compareValues(a.r[sort.column], b.r[sort.column]))
    return list
  }, [queryMode, fullData, queryKey, search, activeConditions, sort, visible])

  const totalRows = queryMode ? (derived ? derived.length : null) : pq.numRows
  const pageCount = Math.max(1, Math.ceil((totalRows ?? 0) / pageSize))

  useEffect(() => setPage(0), [pageSize, search, sort, condKey])
  useEffect(() => setPageInput(String(page + 1)), [page])

  const displayed = useMemo(() => {
    if (queryMode) {
      if (!derived) return []
      return derived.slice(page * pageSize, (page + 1) * pageSize)
    }
    return pageRows.rows.map((r, i) => ({ i: pageRows.start + i, r }))
  }, [queryMode, derived, page, pageSize, pageRows])

  const toggleSort = (column) => {
    setSort((s) => {
      if (!s || s.column !== column) return { column, dir: 1 }
      if (s.dir === 1) return { column, dir: -1 }
      return null
    })
  }

  const exportRows = async (scope, format) => {
    try {
      let rows
      if (scope === 'page') rows = displayed.map((d) => d.r)
      else if (queryMode) rows = (derived || []).map((d) => d.r)
      else {
        notify(`Reading ${formatNumber(pq.numRows)} rows for export…`)
        rows = await readRows(pq, { rowStart: 0, rowEnd: pq.numRows, columns: visible })
      }
      const content = format === 'csv' ? rowsToCsv(rows, visible) : rowsToJson(rows, visible)
      const type = format === 'csv' ? 'text/csv' : 'application/json'
      downloadBlob(new Blob([content], { type }), `${baseName(docName)}${scope === 'page' ? `-page${page + 1}` : ''}.${format}`)
      notify(`Exported ${formatNumber(rows.length)} rows as ${format.toUpperCase()}.`, 'success')
    } catch (e) {
      notify(`Export failed: ${e.message}`, 'error')
    }
  }

  const goTo = (p) => setPage(Math.min(pageCount - 1, Math.max(0, p)))
  const firstRow = totalRows ? page * pageSize + 1 : 0
  const lastRow = totalRows ? Math.min(totalRows, (page + 1) * pageSize) : 0

  return (
    <section className="panel panel-flush data-panel">
      <div className="panel-toolbar grid-toolbar">
        <div className="input-with-icon">
          <Icon name="search" size={15} />
          <input
            className="search-input"
            placeholder="Search all visible columns…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search rows"
          />
        </div>
        <button
          className="btn btn-secondary btn-small"
          onClick={() => setConditions((c) => [...c, { column: visible[0] || allNames[0], op: 'contains', value: '' }])}
        >
          <Icon name="plus" size={14} /> Filter
        </button>
        <ColumnChooser columns={pq.columns} visible={visible} onChange={setVisible} />
        <ExportMenu
          onExport={exportRows}
          canExportAll={pq.numRows * visible.length <= MAX_QUERY_CELLS}
          totalLabel={queryMode ? 'All matching rows' : 'Entire file'}
        />
      </div>

      {conditions.length > 0 && <FilterBuilder columns={pq.columns} conditions={conditions} onChange={setConditions} />}

      {queryMode && (
        <div className={`query-strip ${queryTooLarge ? 'query-strip-warn' : ''}`}>
          <Icon name={queryTooLarge ? 'alert' : 'zap'} size={14} />
          {queryTooLarge ? (
            <span>
              Filtering or sorting needs {formatNumber(queryCells)} cells in memory (limit {formatNumber(MAX_QUERY_CELLS)}). Hide some columns to
              continue.
            </span>
          ) : (
            <span>
              Query mode — {sort && <>sorted by <strong>{sort.column}</strong> {sort.dir === 1 ? 'ascending' : 'descending'}, </>}
              {derived ? `${formatNumber(derived.length)} of ${formatNumber(pq.numRows)} rows match` : 'scanning all rows…'}
            </span>
          )}
          <span className="spacer" />
          <button
            className="link-btn"
            style={{ marginTop: 0 }}
            onClick={() => {
              setConditions([])
              setSearch('')
              setSort(null)
            }}
          >
            Reset
          </button>
        </div>
      )}

      {error && <div className="banner banner-error" style={{ margin: '0.75rem' }}>{error}</div>}

      <div className={`grid-scroll ${loading ? 'grid-loading' : ''}`}>
        <table className="grid">
          <thead>
            <tr>
              <th className="grid-rownum">#</th>
              {visible.map((name) => {
                const col = colByName[name]
                const sorted = sort?.column === name ? sort.dir : 0
                return (
                  <th key={name} aria-sort={sorted === 1 ? 'ascending' : sorted === -1 ? 'descending' : 'none'}>
                    <button className="grid-th" onClick={() => toggleSort(name)} title={`${col.path} · ${col.type}${col.nullable ? ' · nullable' : ''} — click to sort`}>
                      <span className="grid-th-name">{name}</span>
                      <span className="grid-th-type">{col.type}</span>
                      <Icon name={sorted === 1 ? 'arrowUp' : sorted === -1 ? 'arrowDown' : 'sort'} size={13} className={sorted ? 'sort-active' : 'sort-idle'} />
                    </button>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {displayed.map(({ i, r }) => (
              <tr key={i} onClick={() => setSelectedRow(i)} className={selectedRow === i ? 'grid-row-selected' : ''}>
                <td className="grid-rownum">{formatNumber(i + 1)}</td>
                {visible.map((name) => {
                  const v = r[name]
                  const kind = cellKind(v)
                  return (
                    <td key={name} className={`cell-${kind}`}>
                      {kind === 'null' ? <span className="null-pill">null</span> : formatValue(v)}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && displayed.length === 0 && !error && (
          <div className="empty-mini" style={{ margin: '1rem' }}>
            {queryMode && !derived ? 'Preparing query…' : 'No rows to show.'}
          </div>
        )}
        {loading && (
          <div className="grid-overlay">
            <div className="spinner" />
            <span>{queryMode ? 'Scanning file…' : 'Reading rows…'}</span>
          </div>
        )}
      </div>

      <div className="grid-footer">
        <span className="muted small">
          {totalRows === null ? '—' : `Rows ${formatNumber(firstRow)}–${formatNumber(lastRow)} of ${formatNumber(totalRows)}`}
        </span>
        <span className="spacer" />
        <label className="small muted page-size">
          Rows per page
          <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
            {PAGE_SIZES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <div className="pager">
          <button className="btn btn-quiet btn-icon btn-small" onClick={() => goTo(0)} disabled={page === 0} aria-label="First page">
            <Icon name="chevronsLeft" size={15} />
          </button>
          <button className="btn btn-quiet btn-icon btn-small" onClick={() => goTo(page - 1)} disabled={page === 0} aria-label="Previous page">
            <Icon name="chevronLeft" size={15} />
          </button>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              const n = parseInt(pageInput, 10)
              if (!Number.isNaN(n)) goTo(n - 1)
            }}
          >
            <input className="page-input" value={pageInput} onChange={(e) => setPageInput(e.target.value)} aria-label="Page number" />
          </form>
          <span className="small muted">of {formatNumber(pageCount)}</span>
          <button className="btn btn-quiet btn-icon btn-small" onClick={() => goTo(page + 1)} disabled={page >= pageCount - 1} aria-label="Next page">
            <Icon name="chevronRight" size={15} />
          </button>
          <button className="btn btn-quiet btn-icon btn-small" onClick={() => goTo(pageCount - 1)} disabled={page >= pageCount - 1} aria-label="Last page">
            <Icon name="chevronsRight" size={15} />
          </button>
        </div>
      </div>

      {selectedRow !== null && <RowDrawer pq={pq} rowIndex={selectedRow} onClose={() => setSelectedRow(null)} />}
    </section>
  )
}
