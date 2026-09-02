import { useState } from 'react'
import InputPanel from './components/InputPanel'
import SummaryBar from './components/SummaryBar'
import TransactionBreakdown from './components/TransactionBreakdown'
import SegmentTable from './components/SegmentTable'
import MappingPanel from './components/MappingPanel'
import RawView from './components/RawView'
import ErrorBanner from './components/ErrorBanner'
import { parseEDI } from './lib/ediParser'

const TABS = [
  { key: 'breakdown', label: 'Plain-English Breakdown' },
  { key: 'table', label: 'Segment Table' },
  { key: 'mapping', label: 'Suggested API Mapping' },
  { key: 'raw', label: 'Raw EDI' },
]

export default function App() {
  const [input, setInput] = useState('')
  const [parsed, setParsed] = useState(null)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('breakdown')

  const handleParse = () => {
    setError(null)
    try {
      const result = parseEDI(input)
      setParsed(result)
      setActiveTab('breakdown')
    } catch (e) {
      setParsed(null)
      setError(e.message)
    }
  }

  const handleClear = () => {
    setInput('')
    setParsed(null)
    setError(null)
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-inner">
          <h1>EDI Viewer</h1>
          <p>Paste or upload an EDI file to get a plain-English breakdown, segment reference, and suggested API field mapping.</p>
        </div>
      </header>

      <main className="app-main">
        <InputPanel value={input} onChange={setInput} onParse={handleParse} onClear={handleClear} hasResult={!!parsed} />

        <ErrorBanner message={error} warnings={parsed?.errors} />

        {parsed && (
          <>
            <SummaryBar parsed={parsed} />

            <nav className="tab-bar">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  className={`tab-btn ${activeTab === tab.key ? 'tab-btn-active' : ''}`}
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </nav>

            {activeTab === 'breakdown' && <TransactionBreakdown parsed={parsed} />}
            {activeTab === 'table' && <SegmentTable parsed={parsed} />}
            {activeTab === 'mapping' && <MappingPanel parsed={parsed} />}
            {activeTab === 'raw' && <RawView parsed={parsed} />}
          </>
        )}
      </main>

      <footer className="app-footer">
        <p>
          Runs entirely in your browser — nothing is uploaded to a server. Supports ANSI X12 (full) and EDIFACT
          (basic). Built for reviewing client EDI files before mapping them into internal APIs.
        </p>
      </footer>
    </div>
  )
}
