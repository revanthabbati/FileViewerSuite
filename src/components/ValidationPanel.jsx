import { useState } from 'react'

export default function ValidationPanel({ issues }) {
  const [open, setOpen] = useState(true)
  const errors = issues.filter((i) => i.level === 'error')
  const warnings = issues.filter((i) => i.level === 'warning')

  if (issues.length === 0) {
    return (
      <div className="validation-panel validation-ok">
        <span className="validation-icon">✓</span>
        <span>All control numbers and segment counts check out — this file's internal bookkeeping is consistent.</span>
      </div>
    )
  }

  return (
    <div className={`validation-panel ${errors.length > 0 ? 'validation-error' : 'validation-warn'}`}>
      <button className="validation-header" onClick={() => setOpen((o) => !o)}>
        <span className="validation-icon">{errors.length > 0 ? '✕' : '!'}</span>
        <span>
          {errors.length > 0 && `${errors.length} control-number mismatch${errors.length > 1 ? 'es' : ''}`}
          {errors.length > 0 && warnings.length > 0 && ', '}
          {warnings.length > 0 && `${warnings.length} count mismatch${warnings.length > 1 ? 'es' : ''}`}
          {' '}found — this file may have been truncated or altered.
        </span>
        <span className="segment-toggle-icon">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <ul className="validation-list">
          {issues.map((issue, i) => (
            <li key={i} className={issue.level === 'error' ? 'validation-item-error' : 'validation-item-warn'}>
              {issue.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
