import { useEffect, useMemo, useState } from 'react'
import InputPanel from './components/InputPanel'
import SummaryBar from './components/SummaryBar'
import TransactionBreakdown from './components/TransactionBreakdown'
import SegmentTable from './components/SegmentTable'
import MappingPanel from './components/MappingPanel'
import RawView from './components/RawView'
import ErrorBanner from './components/ErrorBanner'
import ValidationPanel from './components/ValidationPanel'
import ThemeToggle from './components/ThemeToggle'
import GlossaryModal from './components/GlossaryModal'
import Footer from './components/Footer'
import { parseEDI } from './lib/ediParser'
import { validateStructure } from './lib/validate'

const TABS = [
  { key: 'breakdown', label: 'Plain-English Breakdown', icon: '📖' },
  { key: 'table', label: 'Segment Table', icon: '☰' },
  { key: 'mapping', label: 'Suggested API Mapping', icon: '⇄' },
  { key: 'raw', label: 'Raw EDI', icon: '{ }' },
]

function useTheme() {
  const [theme, setTheme] = useState(() => localStorage.getItem('edi-viewer-theme') || 'system')
  useEffect(() => {
    if (theme === 'system') {
      document.documentElement.removeAttribute('data-theme')
    } else {
      document.documentElement.setAttribute('data-theme', theme)
    }
    localStorage.setItem('edi-viewer-theme', theme)
  }, [theme])
  return [theme, setTheme]
}

export default function App() {
  const [input, setInput] = useState('')
  const [parsed, setParsed] = useState(null)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('breakdown')
  const [showGlossary, setShowGlossary] = useState(false)
  const [theme, setTheme] = useTheme()

  const validationIssues = useMemo(() => (parsed ? validateStructure(parsed) : []), [parsed])

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
          <div className="app-header-top">
            <div className="brand">
              <span className="brand-mark">⇄</span>
              <h1>EDI Viewer</h1>
            </div>
            <div className="app-header-actions">
              <button className="btn btn-ghost" onClick={() => setShowGlossary(true)}>
                What is EDI?
              </button>
              <ThemeToggle theme={theme} onChange={setTheme} />
            </div>
          </div>
          <p>Paste or upload an EDI file to get a plain-English breakdown, segment reference, and suggested API field mapping.</p>
        </div>
      </header>

      <main className="app-main">
        <InputPanel value={input} onChange={setInput} onParse={handleParse} onClear={handleClear} hasResult={!!parsed} />

        <ErrorBanner message={error} warnings={parsed?.errors} />

        {parsed && (
          <>
            <SummaryBar parsed={parsed} />
            <ValidationPanel issues={validationIssues} />

            <nav className="tab-bar">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  className={`tab-btn ${activeTab === tab.key ? 'tab-btn-active' : ''}`}
                  onClick={() => setActiveTab(tab.key)}
                >
                  <span className="tab-icon">{tab.icon}</span>
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

      {showGlossary && <GlossaryModal onClose={() => setShowGlossary(false)} />}
      <Footer />
    </div>
  )
}
