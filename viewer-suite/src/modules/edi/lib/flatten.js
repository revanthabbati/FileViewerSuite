import { describeSegment } from './describeSegment'
import { FIELD_LABELS } from '../components/QuickFacts'

// Flattens the Interchange > FunctionalGroup > TransactionSet hierarchy into a
// single list, which most of the UI iterates over rather than re-walking the tree.
export function getAllTransactionSets(parsed) {
  const list = []
  if (!parsed) return list
  for (const ic of parsed.interchanges) {
    for (const grp of ic.functionalGroups) {
      for (const t of grp.transactionSets) {
        list.push({ interchange: ic, group: grp, txn: t })
      }
    }
  }
  return list
}

// Builds the full set of "things in this EDI file you might want to map to an
// API field" - the curated Quick Facts first (priority: true), then every
// other populated, dictionary-known element in the file as a broader fallback
// so the API-doc matcher has more than a handful of fields to work with.
export function getMatchableEdiFields(parsed) {
  const seen = new Map()
  const txns = getAllTransactionSets(parsed)

  for (const { txn } of txns) {
    for (const [key, value] of Object.entries(txn.businessSummary?.fields || {})) {
      const id = `summary:${key}`
      if (!seen.has(id)) {
        seen.set(id, { key, label: FIELD_LABELS[key] || key, value, priority: true, transactionType: txn.transactionType })
      }
    }
  }

  for (const { txn } of txns) {
    const allSegs = [txn.stSegment, ...txn.segments, txn.seSegment].filter(Boolean)
    for (const seg of allSegs) {
      const described = describeSegment(seg)
      for (const el of described.elements) {
        if (el.isEmpty || !el.known) continue
        const id = `${seg.id}:${el.position}:${el.label}`
        if (!seen.has(id)) {
          seen.set(id, {
            key: el.ref,
            label: `${described.name} — ${el.label}`,
            value: el.value,
            priority: false,
            transactionType: txn.transactionType,
          })
        }
      }
    }
  }

  return Array.from(seen.values())
}
