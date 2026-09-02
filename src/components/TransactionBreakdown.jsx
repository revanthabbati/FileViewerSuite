import { useMemo, useState } from 'react'
import SegmentCard from './SegmentCard'
import QuickFacts from './QuickFacts'
import { describeSegment } from '../lib/describeSegment'

const ENVELOPE_IDS = new Set(['ISA', 'IEA', 'GS', 'GE', 'ST', 'SE'])

function segmentMatches(seg, query) {
  if (!query) return true
  const described = describeSegment(seg)
  const q = query.toLowerCase()
  if (seg.id.toLowerCase().includes(q)) return true
  if (described.name.toLowerCase().includes(q)) return true
  return described.elements.some(
    (el) => String(el.value).toLowerCase().includes(q) || el.label.toLowerCase().includes(q)
  )
}

function TransactionSetBlock({ txn, query, expandSignal }) {
  const allSegments = [txn.stSegment, ...txn.segments, txn.seSegment].filter(Boolean)
  const visibleSegments = allSegments.filter((seg) => ENVELOPE_IDS.has(seg.id) || segmentMatches(seg, query))
  const hiddenCount = allSegments.length - visibleSegments.length

  return (
    <div className="txn-block">
      <div className="txn-block-header">
        <span className="txn-type-badge">{txn.transactionType}</span>
        <div>
          <h3>{txn.transactionName}</h3>
          <span className="muted small">Control Number: {Array.isArray(txn.stSegment.elements[1]) ? txn.stSegment.elements[1].join(':') : txn.stSegment.elements[1]}</span>
        </div>
      </div>
      <QuickFacts fields={txn.businessSummary?.fields} />
      <div className="segment-list">
        {visibleSegments.map((seg) => (
          <SegmentCard
            key={`${seg.index}-${expandSignal.id}`}
            segment={seg}
            defaultOpen={expandSignal.value === null ? undefined : expandSignal.value}
          />
        ))}
      </div>
      {query && hiddenCount > 0 && (
        <p className="muted small" style={{ marginTop: '0.5rem' }}>
          {hiddenCount} segment(s) hidden by the current filter (envelope segments always stay visible).
        </p>
      )}
    </div>
  )
}

function FunctionalGroupBlock({ group, query, expandSignal }) {
  const label = group.gsSegment ? `Functional Group ${Array.isArray(group.gsSegment.elements[5]) ? group.gsSegment.elements[5][0] : group.gsSegment.elements[5]}` : 'Message Group'
  return (
    <div className="group-block">
      <div className="group-block-header">
        <span>{label}</span>
        <span className="muted small">{group.transactionSets.length} transaction set(s)</span>
      </div>
      {group.gsSegment && <SegmentCard segment={group.gsSegment} defaultOpen={false} />}
      {group.transactionSets.map((txn) => (
        <TransactionSetBlock key={txn.stSegment.index} txn={txn} query={query} expandSignal={expandSignal} />
      ))}
      {group.geSegment && <SegmentCard segment={group.geSegment} defaultOpen={false} />}
    </div>
  )
}

export default function TransactionBreakdown({ parsed }) {
  const [query, setQuery] = useState('')
  const [expandSignal, setExpandSignal] = useState({ id: 0, value: null })

  const setAll = (value) => setExpandSignal((prev) => ({ id: prev.id + 1, value }))

  const totalSegments = useMemo(() => parsed.allSegments.length, [parsed])

  return (
    <div className="breakdown-view">
      <div className="breakdown-toolbar">
        <input
          className="search-input"
          placeholder={`Search within ${totalSegments} segments by ID, field name, or value…`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="breakdown-toolbar-buttons">
          <button className="btn btn-secondary btn-small" onClick={() => setAll(true)}>Expand All</button>
          <button className="btn btn-secondary btn-small" onClick={() => setAll(false)}>Collapse All</button>
        </div>
      </div>

      {parsed.interchanges.map((ic, i) => (
        <div className="interchange-block" key={i}>
          <div className="interchange-block-header">
            <h2>Interchange {i + 1}</h2>
            <span className="muted small">{ic.functionalGroups.length} functional group(s)</span>
          </div>
          <SegmentCard segment={ic.isaSegment} defaultOpen={false} />
          {ic.functionalGroups.map((grp, gi) => (
            <FunctionalGroupBlock key={gi} group={grp} query={query} expandSignal={expandSignal} />
          ))}
          {ic.ieaSegment && <SegmentCard segment={ic.ieaSegment} defaultOpen={false} />}
        </div>
      ))}
    </div>
  )
}
