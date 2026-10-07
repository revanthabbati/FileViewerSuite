import { useEffect, useMemo, useState } from 'react'
import './edi.css'
import Icon from '../../components/Icon'
import { DocTabs, LoadingState, ViewerEmpty, ViewerHeader } from '../../components/ViewerChrome'
import { useActiveDoc, useWorkspace } from '../../app/workspace'
import { downloadBlob, baseName } from '../../app/utils'
import SummaryBar from './components/SummaryBar'
import TransactionBreakdown from './components/TransactionBreakdown'
import SegmentTable from './components/SegmentTable'
import MappingPanel from './components/MappingPanel'
import RawView from './components/RawView'
import ErrorBanner from './components/ErrorBanner'
import ValidationPanel from './components/ValidationPanel'
import GlossaryModal from './components/GlossaryModal'
import { parseEDI } from './lib/ediParser'
import { validateStructure } from './lib/validate'
import { getAllTransactionSets } from './lib/flatten'

const TABS = [
  { key: 'breakdown', label: 'Plain-English Breakdown', icon: 'book' },
  { key: 'table', label: 'Segment Table', icon: 'list' },
  { key: 'mapping', label: 'Suggested API Mapping', icon: 'columns' },
  { key: 'raw', label: 'Raw EDI', icon: 'code' },
]

function PastePanel() {
  const { openText } = useWorkspace()
  const [text, setText] = useState('')
  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Or paste raw EDI</h2>
        <p className="muted">Copied a transaction out of a portal or ticket? Paste it here — delimiters are detected automatically.</p>
      </div>
      <textarea
        className="edi-textarea"
        placeholder="ISA*00*          *00*          *ZZ*SENDERID       *ZZ*RECEIVERID     *…"
        value={text}
        spellCheck={false}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="action-row">
        <button
          className="btn btn-primary"
          disabled={!text.trim()}
          onClick={() => openText(text, { name: `pasted-${new Date().toISOString().slice(11, 19).replace(/:/g, '')}.edi`, kind: 'edi' })}
        >
          <Icon name="zap" size={16} /> Break down EDI
        </button>
      </div>
    </div>
  )
}

function EdiDocument({ doc }) {
  const [state, setState] = useState({ status: 'loading' })
  const [activeTab, setActiveTab] = useState('breakdown')
  const [showGlossary, setShowGlossary] = useState(false)

  useEffect(() => {
    let cancelled = false
    doc.blob
      .text()
      .then((text) => {
        if (cancelled) return
        try {
          setState({ status: 'ready', parsed: parseEDI(text) })
        } catch (e) {
          setState({ status: 'error', error: e.message, text })
        }
      })
      .catch((e) => !cancelled && setState({ status: 'error', error: e.message }))
    return () => {
      cancelled = true
    }
  }, [doc])

  const parsed = state.parsed
  const validationIssues = useMemo(() => (parsed ? validateStructure(parsed) : []), [parsed])
  const txns = useMemo(() => getAllTransactionSets(parsed), [parsed])

  const exportMapping = () => {
    const payload = txns.map(({ txn }) => ({
      transactionType: txn.transactionType,
      transactionName: txn.transactionName,
      fields: txn.businessSummary?.fields || {},
    }))
    downloadBlob(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }), `${baseName(doc.name)}-mapping.json`)
  }

  const actions = (
    <>
      <button className="btn btn-secondary btn-small" onClick={() => setShowGlossary(true)}>
        <Icon name="info" size={15} /> What is EDI?
      </button>
      {parsed && (
        <button className="btn btn-secondary btn-small" onClick={exportMapping}>
          <Icon name="download" size={15} /> Export mapping JSON
        </button>
      )}
    </>
  )

  const meta = parsed ? [`${parsed.format}`, `${parsed.allSegments.length} segments`, `${txns.length} transaction set${txns.length === 1 ? '' : 's'}`] : []

  return (
    <>
      <ViewerHeader kind="edi" doc={doc} meta={meta} actions={actions} />

      {state.status === 'loading' && <LoadingState label="Parsing EDI interchange…" />}
      {state.status === 'error' && <ErrorBanner message={state.error} />}

      {parsed && (
        <>
          <SummaryBar parsed={parsed} />
          <ValidationPanel issues={validationIssues} />
          <ErrorBanner warnings={parsed.errors} />

          <nav className="tab-bar" role="tablist">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                role="tab"
                aria-selected={activeTab === tab.key}
                className={`tab-btn ${activeTab === tab.key ? 'tab-btn-active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                <Icon name={tab.icon} size={16} />
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

      {showGlossary && <GlossaryModal onClose={() => setShowGlossary(false)} />}
    </>
  )
}

export default function EdiViewer({ onOpenPicker }) {
  const { active, docsOfKind } = useActiveDoc('edi')

  if (!active) {
    return (
      <ViewerEmpty kind="edi" onOpenPicker={onOpenPicker}>
        <PastePanel />
      </ViewerEmpty>
    )
  }

  return (
    <div className="viewer">
      <DocTabs kind="edi" docs={docsOfKind} active={active} onOpenPicker={onOpenPicker} />
      <EdiDocument key={active.id} doc={active} />
    </div>
  )
}
