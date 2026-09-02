import SegmentCard from './SegmentCard'
import QuickFacts from './QuickFacts'

function TransactionSetBlock({ txn }) {
  const allSegments = [txn.stSegment, ...txn.segments, txn.seSegment].filter(Boolean)
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
        {allSegments.map((seg) => (
          <SegmentCard key={seg.index} segment={seg} />
        ))}
      </div>
    </div>
  )
}

function FunctionalGroupBlock({ group }) {
  const label = group.gsSegment ? `Functional Group ${Array.isArray(group.gsSegment.elements[5]) ? group.gsSegment.elements[5][0] : group.gsSegment.elements[5]}` : 'Message Group'
  return (
    <div className="group-block">
      <div className="group-block-header">
        <span>{label}</span>
        <span className="muted small">{group.transactionSets.length} transaction set(s)</span>
      </div>
      {group.gsSegment && <SegmentCard segment={group.gsSegment} defaultOpen={false} />}
      {group.transactionSets.map((txn) => (
        <TransactionSetBlock key={txn.stSegment.index} txn={txn} />
      ))}
      {group.geSegment && <SegmentCard segment={group.geSegment} defaultOpen={false} />}
    </div>
  )
}

export default function TransactionBreakdown({ parsed }) {
  return (
    <div className="breakdown-view">
      {parsed.interchanges.map((ic, i) => (
        <div className="interchange-block" key={i}>
          <div className="interchange-block-header">
            <h2>Interchange {i + 1}</h2>
            <span className="muted small">{ic.functionalGroups.length} functional group(s)</span>
          </div>
          <SegmentCard segment={ic.isaSegment} defaultOpen={false} />
          {ic.functionalGroups.map((grp, gi) => (
            <FunctionalGroupBlock key={gi} group={grp} />
          ))}
          {ic.ieaSegment && <SegmentCard segment={ic.ieaSegment} defaultOpen={false} />}
        </div>
      ))}
    </div>
  )
}
