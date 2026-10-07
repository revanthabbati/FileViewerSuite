import { getAllTransactionSets } from '../lib/flatten'

export default function SummaryBar({ parsed }) {
  const txns = getAllTransactionSets(parsed)
  const isaEl = parsed.interchanges[0]?.isaSegment?.elements
  const senderId = isaEl ? String(isaEl[5]).trim() : '—'
  const receiverId = isaEl ? String(isaEl[7]).trim() : '—'
  const interchangeDate = isaEl ? isaEl[8] : '—'
  const usage = isaEl ? isaEl[14] : null
  const usageLabel = usage === 'P' ? 'Production' : usage === 'T' ? 'Test' : usage || '—'

  return (
    <div className="summary-bar">
      <div className="summary-card">
        <span className="summary-label">Format</span>
        <span className="summary-value">{parsed.format}</span>
      </div>
      <div className="summary-card">
        <span className="summary-label">Sender → Receiver</span>
        <span className="summary-value">{senderId} → {receiverId}</span>
      </div>
      <div className="summary-card">
        <span className="summary-label">Interchange Date</span>
        <span className="summary-value">{interchangeDate}</span>
      </div>
      <div className="summary-card">
        <span className="summary-label">Environment</span>
        <span className={`summary-value ${usageLabel === 'Test' ? 'badge-warn' : ''}`}>{usageLabel}</span>
      </div>
      <div className="summary-card">
        <span className="summary-label">Transaction Sets</span>
        <span className="summary-value">{txns.length}</span>
      </div>
      {parsed.errors.length > 0 && (
        <div className="summary-card summary-card-error">
          <span className="summary-label">Warnings</span>
          <span className="summary-value">{parsed.errors.length}</span>
        </div>
      )}
    </div>
  )
}
