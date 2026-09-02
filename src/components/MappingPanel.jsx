import { useState } from 'react'
import { getAllTransactionSets } from '../lib/flatten'
import { FIELD_LABELS } from './QuickFacts'

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      className="btn btn-secondary btn-small"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text)
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        } catch {
          // clipboard API unavailable — ignore, user can still select the text manually
        }
      }}
    >
      {copied ? 'Copied!' : 'Copy JSON'}
    </button>
  )
}

export default function MappingPanel({ parsed }) {
  const txns = getAllTransactionSets(parsed)

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Suggested API Mapping</h2>
        <p className="muted">
          Key business fields pulled out of the EDI segments below, normalized into a flat JSON object you can use as a
          starting point for mapping into your own API payload. Each field also shows which EDI segment it came from,
          so you can verify it against the raw file.
        </p>
      </div>

      {txns.length === 0 && <p className="muted">No transaction sets found.</p>}

      {txns.map(({ txn }, i) => {
        const fields = txn.businessSummary?.fields || {}
        const sources = txn.businessSummary?.sources || {}
        const entries = Object.entries(fields)
        const json = JSON.stringify(fields, null, 2)

        return (
          <div className="mapping-block" key={i}>
            <div className="mapping-block-header">
              <span className="txn-type-badge">{txn.transactionType}</span>
              <h3>{txn.transactionName}</h3>
              <CopyButton text={json} />
            </div>

            {entries.length === 0 ? (
              <p className="muted small">
                No fields were recognized for automatic mapping on this transaction type yet. Use the Plain-English
                Breakdown or Segment Table tab to read the values manually — the underlying segments and elements are
                still fully described there.
              </p>
            ) : (
              <div className="mapping-grid">
                <table className="mapping-table">
                  <thead>
                    <tr>
                      <th>Suggested Field</th>
                      <th>Value</th>
                      <th>Source Segment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map(([key, value]) => (
                      <tr key={key}>
                        <td>
                          <code>{key}</code>
                          <div className="muted small">{FIELD_LABELS[key] || key}</div>
                        </td>
                        <td>{value}</td>
                        <td>
                          <span className="segment-id-badge">{sources[key]?.segmentId}</span> #{sources[key]?.segmentNumber}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <pre className="json-preview">{json}</pre>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
