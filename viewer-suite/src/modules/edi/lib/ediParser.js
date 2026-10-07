import { getTransactionSetName } from './transactionSets'

const EDIFACT_MESSAGE_NAMES = {
  ORDERS: 'Purchase Order Message',
  ORDRSP: 'Purchase Order Response',
  DESADV: 'Despatch Advice (Ship Notice / ASN)',
  INVOIC: 'Invoice Message',
  IFTMIN: 'Instruction Message (Freight)',
  IFTSTA: 'International Multimodal Status Report',
  IFCSUM: 'Forwarding and Consolidation Summary',
  RECADV: 'Receiving Advice',
  PRICAT: 'Price/Sales Catalogue',
  CONTRL: 'Syntax and Service Report (Acknowledgment)',
}

function stripBom(text) {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
}

// ---------- X12 ----------

function parseX12(rawText) {
  const text = rawText.slice(rawText.indexOf('ISA'))
  if (text.length < 106) {
    throw new Error('Found "ISA" but the interchange header is too short to be valid X12 (needs at least 106 characters).')
  }

  const elementSep = text[3]
  // text[3] is the delimiter between "ISA" and ISA01 - that's delimiter #1 of the
  // 16 that separate ISA's 16 elements. Find the remaining 15 to land on ISA16
  // (the component element separator), which sits right before the terminator.
  let idx = 3
  for (let count = 1; count < 16; count++) {
    idx = text.indexOf(elementSep, idx + 1)
    if (idx === -1) {
      throw new Error('Malformed ISA segment: expected 16 elements separated by "' + elementSep + '" but ran out of characters.')
    }
  }
  const componentSep = text[idx + 1]
  let termIdx = idx + 2
  let terminator = text[termIdx]
  if (terminator === '\r' && text[termIdx + 1] === '\n') {
    terminator = '\r\n'
  }
  if (!terminator) {
    throw new Error('Could not detect a segment terminator after the ISA segment.')
  }

  const rawPieces = text.split(terminator)
  const segments = []
  rawPieces.forEach((piece) => {
    const trimmed = piece.replace(/^[\r\n\s]+|[\r\n\s]+$/g, '')
    if (trimmed.length === 0) return
    const parts = trimmed.split(elementSep)
    const id = parts[0]
    const elements = parts.slice(1).map((el) => {
      if (componentSep && el.indexOf(componentSep) !== -1) {
        return el.split(componentSep)
      }
      return el
    })
    segments.push({ id, elements, raw: trimmed, index: segments.length })
  })

  return buildX12Hierarchy(segments, { format: 'X12', elementSep, componentSep, terminator })
}

function buildX12Hierarchy(segments, delimiters) {
  const interchanges = []
  const errors = []
  let interchange = null
  let group = null
  let txn = null

  for (const seg of segments) {
    switch (seg.id) {
      case 'ISA':
        interchange = { isaSegment: seg, ieaSegment: null, functionalGroups: [] }
        interchanges.push(interchange)
        group = null
        txn = null
        break
      case 'IEA':
        if (interchange) interchange.ieaSegment = seg
        else errors.push(`IEA segment (#${seg.index + 1}) found without a matching ISA.`)
        interchange = null
        group = null
        txn = null
        break
      case 'GS':
        group = { gsSegment: seg, geSegment: null, transactionSets: [] }
        if (interchange) interchange.functionalGroups.push(group)
        else errors.push(`GS segment (#${seg.index + 1}) found outside of an ISA/IEA interchange.`)
        txn = null
        break
      case 'GE':
        if (group) group.geSegment = seg
        else errors.push(`GE segment (#${seg.index + 1}) found without a matching GS.`)
        group = null
        txn = null
        break
      case 'ST':
        txn = { stSegment: seg, seSegment: null, segments: [] }
        if (group) group.transactionSets.push(txn)
        else errors.push(`ST segment (#${seg.index + 1}) found outside of a GS/GE functional group.`)
        break
      case 'SE':
        if (txn) txn.seSegment = seg
        else errors.push(`SE segment (#${seg.index + 1}) found without a matching ST.`)
        txn = null
        break
      default:
        if (txn) {
          txn.segments.push(seg)
        } else {
          errors.push(`Segment "${seg.id}" (#${seg.index + 1}) appears outside of any ST/SE transaction set and was not placed in the breakdown.`)
        }
    }
  }

  for (const ic of interchanges) {
    for (const grp of ic.functionalGroups) {
      for (const t of grp.transactionSets) {
        t.transactionType = t.stSegment.elements[0]
        t.transactionName = getTransactionSetName(t.transactionType)
        t.businessSummary = extractBusinessSummary(t)
      }
    }
  }

  return { format: 'X12', delimiters, interchanges, allSegments: segments, errors }
}

function formatEdiDate(value) {
  if (!value || typeof value !== 'string') return null
  const digits = value.replace(/\D/g, '')
  if (digits.length === 8) {
    return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`
  }
  if (digits.length === 6) {
    const yy = parseInt(digits.slice(0, 2), 10)
    const century = yy < 50 ? 2000 : 1900
    return `${century + yy}-${digits.slice(2, 4)}-${digits.slice(4, 6)}`
  }
  return value
}

function formatCents(value) {
  if (!value || typeof value !== 'string') return null
  const num = Number(value)
  if (Number.isNaN(num)) return value
  return (num / 100).toFixed(2)
}

const DELIVERY_DATE_QUALIFIERS = ['017', '070', '400', '369', '002']
const ACTUAL_DELIVERY_QUALIFIERS = ['035', '187']
const SHIP_DATE_QUALIFIERS = ['010', '011', '186']

function extractBusinessSummary(txn) {
  const fields = {}
  const sources = {}
  const setField = (key, value, seg) => {
    if (value == null || value === '') return
    if (fields[key] != null) return
    fields[key] = Array.isArray(value) ? value.join(':') : value
    sources[key] = { segmentId: seg.id, segmentNumber: seg.index + 1 }
  }

  const allSegs = [txn.stSegment, ...txn.segments, txn.seSegment].filter(Boolean)

  for (const seg of allSegs) {
    const el = seg.elements
    switch (seg.id) {
      case 'BEG':
        setField('documentType', 'Purchase Order', seg)
        setField('poNumber', el[2], seg)
        setField('poDate', formatEdiDate(el[4]), seg)
        break
      case 'BIG':
        setField('documentType', 'Invoice', seg)
        setField('invoiceDate', formatEdiDate(el[0]), seg)
        setField('invoiceNumber', el[1], seg)
        setField('poNumber', el[3], seg)
        break
      case 'BSN':
        setField('documentType', 'Advance Ship Notice (ASN)', seg)
        setField('shipmentId', el[1], seg)
        break
      case 'B2':
        setField('documentType', 'Motor Carrier Load Tender', seg)
        setField('carrierScac', el[1], seg)
        setField('shipmentId', el[5], seg)
        break
      case 'REF': {
        const qual = el[0]
        const val = el[1]
        if (qual === 'PO') setField('poNumber', val, seg)
        else if (qual === 'BM') setField('bolNumber', val, seg)
        else if (qual === 'CN') setField('carrierReference', val, seg)
        else if (qual === 'IN') setField('invoiceNumber', val, seg)
        break
      }
      case 'DTM': {
        const qual = el[0]
        const date = formatEdiDate(el[1])
        if (SHIP_DATE_QUALIFIERS.includes(qual)) setField('shipDate', date, seg)
        else if (DELIVERY_DATE_QUALIFIERS.includes(qual)) setField('estimatedDeliveryDate', date, seg)
        else if (ACTUAL_DELIVERY_QUALIFIERS.includes(qual)) setField('actualDeliveryDate', date, seg)
        break
      }
      case 'N1': {
        const role = el[0]
        const name = el[1]
        if (role === 'ST') setField('shipToName', name, seg)
        else if (role === 'SF' || role === 'SH') setField('shipFromName', name, seg)
        else if (role === 'BT') setField('billToName', name, seg)
        else if (role === 'CA') setField('carrierName', name, seg)
        break
      }
      case 'TD5':
        setField('carrierScac', el[2], seg)
        setField('transportMode', el[3], seg)
        break
      case 'TDS':
        setField('totalAmount', formatCents(el[0]), seg)
        break
      case 'CTT':
        setField('lineItemCount', el[0], seg)
        break
      case 'AT7':
        setField('shipmentStatusCode', el[0], seg)
        setField('shipmentStatusDate', formatEdiDate(el[4]), seg)
        break
      default:
        break
    }
  }

  return { fields, sources }
}

// ---------- EDIFACT (basic support) ----------

function parseEdifact(rawText) {
  let text = rawText.slice(rawText.search(/UNA|UNB/))
  let componentSep = ':'
  let elementSep = '+'
  let release = '?'
  let terminator = "'"

  if (text.startsWith('UNA')) {
    if (text.length < 9) throw new Error('Found "UNA" but it is too short to define the EDIFACT service characters.')
    componentSep = text[3]
    elementSep = text[4]
    release = text[6]
    terminator = text[8]
    text = text.slice(9)
  }

  const rawPieces = text.split(terminator)
  const segments = []
  rawPieces.forEach((piece) => {
    const trimmed = piece.replace(/^[\r\n\s]+|[\r\n\s]+$/g, '')
    if (trimmed.length === 0) return
    const parts = trimmed.split(elementSep)
    const id = parts[0]
    const elements = parts.slice(1).map((el) => (el.indexOf(componentSep) !== -1 ? el.split(componentSep) : el))
    segments.push({ id, elements, raw: trimmed, index: segments.length })
  })

  const interchanges = []
  const errors = []
  let interchange = null
  let group = null
  let txn = null

  for (const seg of segments) {
    switch (seg.id) {
      case 'UNB':
        interchange = { isaSegment: seg, ieaSegment: null, functionalGroups: [] }
        interchanges.push(interchange)
        group = null
        txn = null
        break
      case 'UNZ':
        if (interchange) interchange.ieaSegment = seg
        interchange = null
        group = null
        txn = null
        break
      case 'UNG':
        group = { gsSegment: seg, geSegment: null, transactionSets: [] }
        if (interchange) interchange.functionalGroups.push(group)
        txn = null
        break
      case 'UNE':
        if (group) group.geSegment = seg
        group = null
        txn = null
        break
      case 'UNH':
        txn = { stSegment: seg, seSegment: null, segments: [] }
        if (!group) {
          // EDIFACT messages don't require an explicit UNG group - synthesize one
          group = { gsSegment: null, geSegment: null, transactionSets: [], synthetic: true }
          if (interchange) interchange.functionalGroups.push(group)
        }
        group.transactionSets.push(txn)
        break
      case 'UNT':
        if (txn) txn.seSegment = seg
        txn = null
        break
      default:
        if (txn) {
          txn.segments.push(seg)
        } else {
          errors.push(`Segment "${seg.id}" (#${seg.index + 1}) appears outside of any UNH/UNT message and was not placed in the breakdown.`)
        }
    }
  }

  for (const ic of interchanges) {
    for (const grp of ic.functionalGroups) {
      for (const t of grp.transactionSets) {
        const msgType = Array.isArray(t.stSegment.elements[0]) ? t.stSegment.elements[0][0] : t.stSegment.elements[0]
        t.transactionType = msgType
        t.transactionName = EDIFACT_MESSAGE_NAMES[msgType] || `Unrecognized EDIFACT message (${msgType})`
        t.businessSummary = { fields: {}, sources: {} }
      }
    }
  }

  return {
    format: 'EDIFACT',
    delimiters: { elementSep, componentSep, terminator, release },
    interchanges,
    allSegments: segments,
    errors,
  }
}

// ---------- Entry point ----------

export function parseEDI(rawInput) {
  if (!rawInput || !rawInput.trim()) {
    throw new Error('No EDI content was provided. Paste EDI text or upload a file first.')
  }
  const text = stripBom(rawInput)
  const isaAt = text.indexOf('ISA')
  const unbAt = text.search(/UNA|UNB/)

  const isaFirst = isaAt !== -1 && (unbAt === -1 || isaAt <= unbAt)
  if (isaFirst) {
    return parseX12(text)
  }
  if (unbAt !== -1) {
    return parseEdifact(text)
  }
  throw new Error(
    'Could not detect a known EDI format. Expected the file to contain an X12 "ISA" interchange header or an EDIFACT "UNB" interchange header.'
  )
}

export { formatEdiDate, formatCents }
