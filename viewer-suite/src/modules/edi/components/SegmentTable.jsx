import { useMemo, useState } from 'react'
import { describeSegment } from '../lib/describeSegment'

export default function SegmentTable({ parsed }) {
  const [query, setQuery] = useState('')

  const rows = useMemo(() => parsed.allSegments.map((seg) => describeSegment(seg)), [parsed])

  const filtered = useMemo(() => {
    if (!query.trim()) return rows
    const q = query.trim().toLowerCase()
    return rows.filter((row) => {
      if (row.id.toLowerCase().includes(q)) return true
      if (row.name.toLowerCase().includes(q)) return true
      return row.elements.some(
        (el) => String(el.value).toLowerCase().includes(q) || el.label.toLowerCase().includes(q)
      )
    })
  }, [rows, query])

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Segment Table</h2>
        <p className="muted">Every segment in the file, in order, in one flat table. Useful for scanning or searching a large file.</p>
      </div>
      <input
        className="search-input"
        placeholder="Search by segment ID, value, or field name…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="table-scroll">
        <table className="segment-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Segment</th>
              <th>Name</th>
              <th>Elements</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={row.index} className={row.known ? '' : 'row-unknown'}>
                <td>{row.index + 1}</td>
                <td>
                  <span className="segment-id-badge">{row.id}</span>
                </td>
                <td>{row.name}</td>
                <td>
                  {row.elements.filter((el) => !el.isEmpty).length === 0 ? (
                    <span className="muted small">(no populated elements)</span>
                  ) : (
                    <ul className="element-mini-list">
                      {row.elements
                        .filter((el) => !el.isEmpty)
                        .map((el) => (
                          <li key={el.ref}>
                            <strong>{el.ref}</strong> {el.label}: {el.value}
                            {el.codeDescription ? ` (${el.codeDescription})` : ''}
                          </li>
                        ))}
                    </ul>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="muted">No segments match “{query}”.</p>}
      </div>
    </div>
  )
}
