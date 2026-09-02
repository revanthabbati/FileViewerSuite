import { getSegmentDefinition } from './segmentDictionary'
import { resolveCode } from './qualifiers'

// Turns a raw parsed segment ({ id, elements, raw, index }) into a fully
// human-readable description, resolving element names and qualifier codes
// from the dictionaries. Used by both the tree view and the flat table view
// so the two stay consistent.
export function describeSegment(segment) {
  const def = getSegmentDefinition(segment.id)
  const elements = segment.elements.map((rawVal, idx) => {
    const position = String(idx + 1).padStart(2, '0')
    const elDef = def?.elements.find((e) => e.ref === position)
    const isComposite = Array.isArray(rawVal)
    const displayValue = isComposite ? rawVal.filter((v) => v !== '').join(' : ') : rawVal
    const firstAtomic = isComposite ? rawVal[0] : rawVal
    const codeDescription = elDef?.codeSet ? resolveCode(elDef.codeSet, firstAtomic) : null
    return {
      position,
      ref: `${segment.id}${position}`,
      label: elDef ? elDef.name : `Element ${position}`,
      value: displayValue,
      isEmpty: displayValue === '' || displayValue == null,
      codeDescription,
      highlight: !!elDef?.highlight,
      known: !!elDef,
    }
  })

  return {
    id: segment.id,
    name: def ? def.name : segment.id,
    purpose: def ? def.purpose : 'This segment is not in the built-in dictionary yet. Raw element values are shown below without descriptions.',
    known: !!def,
    elements,
    raw: segment.raw,
    index: segment.index,
  }
}
