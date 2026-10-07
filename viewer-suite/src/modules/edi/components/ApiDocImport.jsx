import { useMemo, useRef, useState } from 'react'
import { extractTextFromFile, extractCandidateApiFields } from '../lib/docExtractor'
import { matchFields } from '../lib/fieldMatcher'
import { getMatchableEdiFields } from '../lib/flatten'

function ConfidenceBadge({ score }) {
  const pct = Math.round(score * 100)
  const tier = score >= 0.6 ? 'high' : score >= 0.4 ? 'medium' : 'low'
  return <span className={`confidence-badge confidence-${tier}`}>{pct}%</span>
}

export default function ApiDocImport({ parsed }) {
  const [fileName, setFileName] = useState(null)
  const [pastedText, setPastedText] = useState('')
  const [docText, setDocText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef(null)

  const handleFile = async (file) => {
    setError(null)
    setLoading(true)
    setFileName(file.name)
    try {
      const text = await extractTextFromFile(file)
      if (!text || text.trim().length < 10) {
        setError('Could not find readable text in that file. If it is a scanned/image-based PDF, try pasting the field list as text instead.')
        setDocText('')
      } else {
        setDocText(text)
      }
    } catch (e) {
      setError(e.message)
      setDocText('')
    } finally {
      setLoading(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  const candidates = useMemo(() => (docText ? extractCandidateApiFields(docText) : []), [docText])
  const matchResults = useMemo(() => {
    if (candidates.length === 0 || !parsed) return []
    return matchFields(getMatchableEdiFields(parsed), candidates)
  }, [candidates, parsed])

  const analyzePastedText = () => {
    setError(null)
    setFileName(null)
    if (!pastedText.trim()) {
      setError('Paste some text first — a field list, parameter table, or JSON example from your API docs.')
      return
    }
    setDocText(pastedText)
  }

  const reset = () => {
    setDocText('')
    setPastedText('')
    setFileName(null)
    setError(null)
  }

  return (
    <div className="api-doc-import">
      <h3>Import your API documentation</h3>
      <p className="muted">
        Upload your API's docs (PDF or Word) — or paste a field list / JSON example — and this will suggest which of
        your EDI fields likely map to which of your API's fields, based on name similarity. Nothing is uploaded
        anywhere; the file is read entirely in your browser.
      </p>

      {!docText && (
        <>
          <div
            className={`dropzone ${dragOver ? 'dropzone-active' : ''}`}
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <span>{loading ? 'Reading document…' : 'Drag & drop a PDF or DOCX here, or click to browse'}</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.doc,.txt"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              hidden
            />
          </div>

          <div className="or-divider">or paste text</div>

          <textarea
            className="edi-textarea api-doc-textarea"
            placeholder="Paste a field list, parameter table, or JSON example from your API documentation…"
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
          />
          <div className="action-row">
            <button className="btn btn-primary" onClick={analyzePastedText} disabled={loading}>
              Find Field Mappings
            </button>
          </div>
        </>
      )}

      {error && (
        <div className="banner banner-error" style={{ marginTop: '0.75rem' }}>
          <p>{error}</p>
        </div>
      )}

      {docText && (
        <div className="api-doc-results">
          <div className="api-doc-results-header">
            <span className="muted small">
              {fileName ? `Analyzed "${fileName}"` : 'Analyzed pasted text'} — found {candidates.length} candidate
              field name{candidates.length === 1 ? '' : 's'}, matched {matchResults.length} against this EDI file.
            </span>
            <button className="btn btn-secondary btn-small" onClick={reset}>
              Analyze a different document
            </button>
          </div>

          {matchResults.length === 0 ? (
            <p className="muted small" style={{ marginTop: '0.75rem' }}>
              No confident matches found. This usually means the document doesn't list field names in a recognizable
              format (a JSON example, a parameter table, or "fieldName - description" lines work best).
            </p>
          ) : (
            <table className="mapping-table" style={{ marginTop: '0.75rem' }}>
              <thead>
                <tr>
                  <th>EDI Field</th>
                  <th>Value in this file</th>
                  <th>Suggested API Field(s)</th>
                </tr>
              </thead>
              <tbody>
                {matchResults.map((r, i) => (
                  <tr key={i}>
                    <td>
                      {r.ediField.priority && <span className="priority-dot" title="Common business field" />}
                      {r.ediField.label}
                    </td>
                    <td>{String(r.ediField.value)}</td>
                    <td>
                      {r.matches.map((m, j) => (
                        <div key={j} className="suggested-match">
                          <code>{m.apiField.name}</code>
                          <ConfidenceBadge score={m.score} />
                        </div>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
