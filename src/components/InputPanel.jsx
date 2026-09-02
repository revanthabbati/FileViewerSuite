import { useRef, useState } from 'react'
import { SAMPLES } from '../lib/samples'

export default function InputPanel({ value, onChange, onParse, onClear, hasResult }) {
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef(null)

  const readFile = (file) => {
    const reader = new FileReader()
    reader.onload = (e) => onChange(String(e.target.result || ''))
    reader.readAsText(file)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) readFile(file)
  }

  const handleFileInput = (e) => {
    const file = e.target.files?.[0]
    if (file) readFile(file)
  }

  return (
    <div className="panel input-panel">
      <div className="panel-header">
        <h2>1. Provide an EDI file</h2>
        <p className="muted">Paste raw EDI text, upload a file, or try a sample transaction below.</p>
      </div>

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
        <span>Drag &amp; drop an EDI file here, or click to browse</span>
        <input
          ref={fileInputRef}
          type="file"
          accept=".edi,.x12,.txt,.dat,.850,.810,.856,.204,.214,.997"
          onChange={handleFileInput}
          hidden
        />
      </div>

      <textarea
        className="edi-textarea"
        placeholder="Or paste raw EDI content here (e.g. ISA*00*...)"
        value={value}
        spellCheck={false}
        onChange={(e) => onChange(e.target.value)}
      />

      <div className="sample-row">
        <span className="muted small">Try a sample:</span>
        {SAMPLES.map((s) => (
          <button key={s.key} className="chip-btn" onClick={() => onChange(s.content)}>
            {s.label}
          </button>
        ))}
      </div>

      <div className="action-row">
        <button className="btn btn-primary" onClick={onParse} disabled={!value.trim()}>
          Break Down EDI File
        </button>
        {hasResult && (
          <button className="btn btn-secondary" onClick={onClear}>
            Clear
          </button>
        )}
      </div>
    </div>
  )
}
