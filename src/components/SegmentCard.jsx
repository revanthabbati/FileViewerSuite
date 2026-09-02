import { useState } from 'react'
import { describeSegment } from '../lib/describeSegment'

const ENVELOPE_IDS = new Set(['ISA', 'IEA', 'GS', 'GE', 'ST', 'SE', 'UNB', 'UNZ', 'UNH', 'UNT', 'UNG', 'UNE'])

export default function SegmentCard({ segment, defaultOpen }) {
  const described = describeSegment(segment)
  const isEnvelope = ENVELOPE_IDS.has(segment.id)
  const [open, setOpen] = useState(defaultOpen ?? !isEnvelope)
  const [showRaw, setShowRaw] = useState(false)
  const visibleElements = described.elements.filter((el) => !el.isEmpty)

  return (
    <div className={`segment-card ${isEnvelope ? 'segment-card-envelope' : ''} ${described.known ? '' : 'segment-card-unknown'}`}>
      <button className="segment-card-header" onClick={() => setOpen((o) => !o)}>
        <span className={`segment-id-badge ${isEnvelope ? 'badge-envelope' : ''}`}>{segment.id}</span>
        <span className="segment-name">{described.name}</span>
        <span className="segment-toggle-icon">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div className="segment-card-body">
          <p className="segment-purpose">{described.purpose}</p>
          {visibleElements.length > 0 ? (
            <table className="element-table">
              <tbody>
                {visibleElements.map((el) => (
                  <tr key={el.ref} className={el.highlight ? 'element-row-highlight' : ''}>
                    <td className="element-ref">{el.ref}</td>
                    <td className="element-label">{el.label}</td>
                    <td className="element-value">
                      {el.value}
                      {el.codeDescription && <span className="code-description"> — {el.codeDescription}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="muted small">This segment has no populated elements.</p>
          )}
          <button className="link-btn" onClick={() => setShowRaw((r) => !r)}>
            {showRaw ? 'Hide raw segment' : 'Show raw segment'}
          </button>
          {showRaw && <pre className="raw-segment">{described.raw}</pre>}
        </div>
      )}
    </div>
  )
}
