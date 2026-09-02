// Human-readable definitions for common ANSI X12 segments.
// Each entry: { name, purpose, elements: [{ ref, name, codeSet? }, ...] }
// `elements` is 1-indexed by position (elements[0] describes the 01 element).
// This is not the full X12 standard (that runs to thousands of pages per
// transaction set / version) - it covers the segments that show up in the vast
// majority of real-world logistics & order-to-cash EDI traffic. Anything not
// listed here still renders, just without friendly element names.

export const SEGMENT_DICTIONARY = {
  ISA: {
    name: 'Interchange Control Header',
    purpose: 'Marks the start of an EDI interchange (the "envelope"). Identifies sender, receiver, and the delimiters used in the rest of the file.',
    elements: [
      { ref: '01', name: 'Authorization Information Qualifier' },
      { ref: '02', name: 'Authorization Information' },
      { ref: '03', name: 'Security Information Qualifier' },
      { ref: '04', name: 'Security Information' },
      { ref: '05', name: 'Sender ID Qualifier' },
      { ref: '06', name: 'Sender ID', highlight: true },
      { ref: '07', name: 'Receiver ID Qualifier' },
      { ref: '08', name: 'Receiver ID', highlight: true },
      { ref: '09', name: 'Interchange Date (YYMMDD)', highlight: true },
      { ref: '10', name: 'Interchange Time (HHMM)', highlight: true },
      { ref: '11', name: 'Repetition Separator / Control Standards ID' },
      { ref: '12', name: 'Interchange Control Version Number' },
      { ref: '13', name: 'Interchange Control Number', highlight: true },
      { ref: '14', name: 'Acknowledgment Requested (0=No, 1=Yes)' },
      { ref: '15', name: 'Usage Indicator (P=Production, T=Test)', highlight: true },
      { ref: '16', name: 'Component Element Separator' },
    ],
  },
  IEA: {
    name: 'Interchange Control Trailer',
    purpose: 'Marks the end of the interchange and confirms how many functional groups it contained.',
    elements: [
      { ref: '01', name: 'Number of Functional Groups Included' },
      { ref: '02', name: 'Interchange Control Number (must match ISA13)' },
    ],
  },
  GS: {
    name: 'Functional Group Header',
    purpose: 'Groups one or more transaction sets of the same type (e.g. all the invoices in this file) and identifies sender/receiver application codes.',
    elements: [
      { ref: '01', name: 'Functional Identifier Code (transaction group type)', highlight: true },
      { ref: '02', name: 'Application Sender Code' },
      { ref: '03', name: 'Application Receiver Code' },
      { ref: '04', name: 'Group Date (CCYYMMDD)' },
      { ref: '05', name: 'Group Time (HHMM)' },
      { ref: '06', name: 'Group Control Number', highlight: true },
      { ref: '07', name: 'Responsible Agency Code' },
      { ref: '08', name: 'Version / Release / Industry Identifier Code', highlight: true },
    ],
  },
  GE: {
    name: 'Functional Group Trailer',
    purpose: 'Marks the end of the functional group and confirms how many transaction sets it contained.',
    elements: [
      { ref: '01', name: 'Number of Transaction Sets Included' },
      { ref: '02', name: 'Group Control Number (must match GS06)' },
    ],
  },
  ST: {
    name: 'Transaction Set Header',
    purpose: 'Marks the start of one business document (one purchase order, one invoice, one load tender, etc).',
    elements: [
      { ref: '01', name: 'Transaction Set Identifier Code (document type)', highlight: true },
      { ref: '02', name: 'Transaction Set Control Number', highlight: true },
      { ref: '03', name: 'Implementation Convention Reference' },
    ],
  },
  SE: {
    name: 'Transaction Set Trailer',
    purpose: 'Marks the end of the business document and confirms the segment count for it.',
    elements: [
      { ref: '01', name: 'Number of Segments Included (ST through SE)' },
      { ref: '02', name: 'Transaction Set Control Number (must match ST02)' },
    ],
  },

  // --- Common "header" / reference segments used across many transaction sets ---
  BEG: {
    name: 'Beginning Segment for Purchase Order',
    purpose: 'The header of an 850 Purchase Order: what kind of order this is, the PO number, and the PO date.',
    elements: [
      { ref: '01', name: 'Transaction Set Purpose Code' },
      { ref: '02', name: 'Purchase Order Type Code', codeSet: 'purchaseOrderTypeCode' },
      { ref: '03', name: 'Purchase Order Number', highlight: true },
      { ref: '04', name: 'Release Number' },
      { ref: '05', name: 'Purchase Order Date (CCYYMMDD)', highlight: true },
    ],
  },
  BIG: {
    name: 'Beginning Segment for Invoice',
    purpose: 'The header of an 810 Invoice: invoice number, invoice date, and the PO it relates to.',
    elements: [
      { ref: '01', name: 'Invoice Date (CCYYMMDD)', highlight: true },
      { ref: '02', name: 'Invoice Number', highlight: true },
      { ref: '03', name: 'Purchase Order Date (CCYYMMDD)' },
      { ref: '04', name: 'Purchase Order Number', highlight: true },
    ],
  },
  BSN: {
    name: 'Beginning Segment for Ship Notice (ASN)',
    purpose: 'The header of an 856 Advance Ship Notice: shipment ID, creation date/time.',
    elements: [
      { ref: '01', name: 'Transaction Set Purpose Code' },
      { ref: '02', name: 'Shipment Identification', highlight: true },
      { ref: '03', name: 'Date (CCYYMMDD)' },
      { ref: '04', name: 'Time (HHMM)' },
    ],
  },
  B2: {
    name: 'Beginning Segment for Shipment Information Transaction',
    purpose: 'The header of a 204 Motor Carrier Load Tender: who is shipping, who is paying freight, and the SCAC of the tendered carrier.',
    elements: [
      { ref: '01', name: 'Bill of Lading / Waybill Number' },
      { ref: '02', name: 'Standard Carrier Alpha Code (SCAC)', highlight: true },
      { ref: '03', name: 'Shipment Method of Payment', codeSet: 'shipmentMethodOfPayment' },
      { ref: '04', name: 'Shipment Qualifier' },
      { ref: '06', name: 'Shipment Identifying Number', highlight: true },
      { ref: '10', name: 'Reference Identification' },
      { ref: '12', name: 'Purchase Order Number' },
    ],
  },
  B2A: {
    name: 'Set Purpose',
    purpose: 'States whether this load tender is an original, a change, or a cancellation.',
    elements: [
      { ref: '01', name: 'Transaction Set Purpose Code (00=Original, 01=Cancellation, 04=Change, 05=Confirmation)', highlight: true },
      { ref: '02', name: 'Application Type' },
    ],
  },
  REF: {
    name: 'Reference Identification',
    purpose: 'Carries a secondary reference number (PO number, BOL number, tracking number, etc) whose meaning depends on the qualifier in the first element.',
    elements: [
      { ref: '01', name: 'Reference ID Qualifier', codeSet: 'referenceIdentificationQualifier', highlight: true },
      { ref: '02', name: 'Reference Identification (the actual value)', highlight: true },
      { ref: '03', name: 'Description' },
    ],
  },
  DTM: {
    name: 'Date/Time Reference',
    purpose: 'Carries a date and/or time whose meaning depends on the qualifier in the first element (e.g. ship date vs delivery date).',
    elements: [
      { ref: '01', name: 'Date/Time Qualifier', codeSet: 'dateTimeQualifier', highlight: true },
      { ref: '02', name: 'Date (CCYYMMDD)', highlight: true },
      { ref: '03', name: 'Time (HHMM)' },
      { ref: '04', name: 'Time Code' },
    ],
  },
  DTP: {
    name: 'Date or Time Period',
    purpose: 'Like DTM, but supports date ranges as well as single dates.',
    elements: [
      { ref: '01', name: 'Date/Time Qualifier', codeSet: 'dateTimeQualifier', highlight: true },
      { ref: '02', name: 'Date Time Period Format Qualifier' },
      { ref: '03', name: 'Date Time Period', highlight: true },
    ],
  },
  N1: {
    name: 'Party Identification',
    purpose: 'Identifies a party in the transaction (ship-to, bill-to, carrier, etc). Almost every address in an EDI file starts with one of these.',
    elements: [
      { ref: '01', name: 'Entity Identifier Code (who this party is)', codeSet: 'entityIdentifierCode', highlight: true },
      { ref: '02', name: 'Name', highlight: true },
      { ref: '03', name: 'ID Code Qualifier' },
      { ref: '04', name: 'Identification Code', highlight: true },
    ],
  },
  N2: {
    name: 'Additional Name Information',
    purpose: 'Extra name line(s) for the party named in the preceding N1 segment.',
    elements: [
      { ref: '01', name: 'Name (line 1)' },
      { ref: '02', name: 'Name (line 2)' },
    ],
  },
  N3: {
    name: 'Party Address',
    purpose: 'The street address for the party named in the preceding N1 segment.',
    elements: [
      { ref: '01', name: 'Address Line 1', highlight: true },
      { ref: '02', name: 'Address Line 2' },
    ],
  },
  N4: {
    name: 'Geographic Location',
    purpose: 'City, state, ZIP and country for the party named in the preceding N1 segment.',
    elements: [
      { ref: '01', name: 'City Name', highlight: true },
      { ref: '02', name: 'State or Province Code', highlight: true },
      { ref: '03', name: 'Postal Code', highlight: true },
      { ref: '04', name: 'Country Code' },
    ],
  },
  N9: {
    name: 'Extended Reference Information',
    purpose: 'Similar to REF - a free-form reference number with a qualifier, often used for notes or extra order references.',
    elements: [
      { ref: '01', name: 'Reference Number Qualifier', codeSet: 'referenceIdentificationQualifier', highlight: true },
      { ref: '02', name: 'Reference Number', highlight: true },
      { ref: '03', name: 'Free-form Description' },
    ],
  },
  PER: {
    name: 'Administrative Communications Contact',
    purpose: 'A contact person/phone/email for questions about this transaction.',
    elements: [
      { ref: '01', name: 'Contact Function Code' },
      { ref: '02', name: 'Contact Name', highlight: true },
      { ref: '03', name: 'Communication Number Qualifier' },
      { ref: '04', name: 'Communication Number (phone/email)', highlight: true },
    ],
  },
  FOB: {
    name: 'F.O.B. Related Instructions',
    purpose: 'Who is responsible for freight charges and where liability for the goods transfers.',
    elements: [
      { ref: '01', name: 'Shipment Method of Payment', codeSet: 'shipmentMethodOfPayment', highlight: true },
      { ref: '02', name: 'Location Qualifier' },
    ],
  },
  ITD: {
    name: 'Terms of Sale / Deferred Terms of Sale',
    purpose: 'Payment terms - discount percentage, due dates, etc.',
    elements: [
      { ref: '01', name: 'Terms Type Code' },
      { ref: '02', name: 'Terms Basis Date Code' },
      { ref: '03', name: 'Terms Discount Percent' },
      { ref: '04', name: 'Terms Discount Due Date' },
      { ref: '05', name: 'Terms Discount Days Due' },
      { ref: '07', name: 'Terms Net Days Due' },
    ],
  },
  TD1: {
    name: 'Carrier Details (Packaging and Weight)',
    purpose: 'Overall packaging type, number of packages, and total weight for the shipment.',
    elements: [
      { ref: '01', name: 'Packaging Code' },
      { ref: '02', name: 'Lading Quantity (# of packages)', highlight: true },
      { ref: '06', name: 'Weight Qualifier', codeSet: 'weightQualifier' },
      { ref: '07', name: 'Weight', highlight: true },
      { ref: '08', name: 'Unit of Measure Code', codeSet: 'unitOrBasisForMeasurementCode' },
    ],
  },
  TD3: {
    name: 'Carrier Details (Equipment)',
    purpose: 'Equipment used for the shipment - trailer/container number, equipment type.',
    elements: [
      { ref: '01', name: 'Equipment Description Code' },
      { ref: '02', name: 'Equipment Initial' },
      { ref: '03', name: 'Equipment Number (trailer/container #)', highlight: true },
    ],
  },
  TD4: {
    name: 'Carrier Details (Special Handling)',
    purpose: 'Hazmat and special-handling instructions for the shipment.',
    elements: [
      { ref: '01', name: 'Special Handling Code' },
      { ref: '04', name: 'Hazardous Material Description' },
    ],
  },
  TD5: {
    name: 'Carrier Details (Routing Sequence/Transit Time)',
    purpose: 'Which carrier is moving the freight and how (mode of transport, SCAC/routing).',
    elements: [
      { ref: '01', name: 'Routing Sequence Code' },
      { ref: '02', name: 'Identification Code Qualifier' },
      { ref: '03', name: 'Identification Code (carrier SCAC)', highlight: true },
      { ref: '04', name: 'Transportation Method/Type Code', codeSet: 'transportationMethodTypeCode', highlight: true },
      { ref: '05', name: 'Routing (carrier name/route description)', highlight: true },
    ],
  },
  MAN: {
    name: 'Marks and Numbers',
    purpose: 'Serial/tracking numbers physically marked on the package(s), e.g. SSCC-18 pallet labels.',
    elements: [
      { ref: '01', name: 'Marks and Numbers Qualifier' },
      { ref: '02', name: 'Marks and Numbers (the actual number)', highlight: true },
    ],
  },
  CTT: {
    name: 'Transaction Totals',
    purpose: 'A checksum: total number of line items in this document (used to verify nothing was dropped in transmission).',
    elements: [
      { ref: '01', name: 'Number of Line Items', highlight: true },
      { ref: '02', name: 'Hash Total' },
    ],
  },
  SAC: {
    name: 'Service, Promotion, Allowance, or Charge Information',
    purpose: 'An extra charge or allowance on the order/invoice (e.g. fuel surcharge, freight charge, discount).',
    elements: [
      { ref: '01', name: 'Allowance or Charge Indicator (A=Allowance, C=Charge)', highlight: true },
      { ref: '02', name: 'Service/Charge/Promotion/Allowance Code' },
      { ref: '05', name: 'Amount', highlight: true },
    ],
  },
  CUR: {
    name: 'Currency',
    purpose: 'Which currency the monetary amounts in this document are stated in.',
    elements: [
      { ref: '01', name: 'Entity Identifier Code', codeSet: 'entityIdentifierCode' },
      { ref: '02', name: 'Currency Code', highlight: true },
    ],
  },
  AMT: {
    name: 'Monetary Amount',
    purpose: 'A monetary amount whose meaning depends on the qualifier (e.g. total invoice amount).',
    elements: [
      { ref: '01', name: 'Amount Qualifier Code' },
      { ref: '02', name: 'Monetary Amount', highlight: true },
    ],
  },
  NM1: {
    name: 'Individual or Organizational Name',
    purpose: 'Identifies a person or organization involved in the transaction, similar to N1 but used in more transaction types (invoices, remittances, healthcare, etc).',
    elements: [
      { ref: '01', name: 'Entity Identifier Code', codeSet: 'entityIdentifierCode', highlight: true },
      { ref: '02', name: 'Entity Type Qualifier (1=Person, 2=Organization)' },
      { ref: '03', name: 'Last Name / Organization Name', highlight: true },
      { ref: '04', name: 'First Name' },
      { ref: '08', name: 'ID Code Qualifier' },
      { ref: '09', name: 'ID Code', highlight: true },
    ],
  },

  // --- Line item / product segments ---
  PO1: {
    name: 'Baseline Item Data (Purchase Order Line Item)',
    purpose: 'One line item on a purchase order - the product, quantity ordered, and unit price.',
    elements: [
      { ref: '01', name: 'Line Item Number', highlight: true },
      { ref: '02', name: 'Quantity Ordered', highlight: true },
      { ref: '03', name: 'Unit of Measure', codeSet: 'unitOrBasisForMeasurementCode' },
      { ref: '04', name: 'Unit Price', highlight: true },
      { ref: '05', name: 'Basis of Unit Price Code' },
      { ref: '06', name: 'Product/Service ID Qualifier', codeSet: 'productServiceIDQualifier' },
      { ref: '07', name: 'Product/Service ID (SKU/part #)', highlight: true },
      { ref: '08', name: 'Product/Service ID Qualifier (2nd)', codeSet: 'productServiceIDQualifier' },
      { ref: '09', name: 'Product/Service ID (2nd, e.g. UPC)', highlight: true },
    ],
  },
  PID: {
    name: 'Product/Item Description',
    purpose: 'A free-text description of the item on the preceding line item segment.',
    elements: [
      { ref: '01', name: 'Description Type' },
      { ref: '05', name: 'Description', highlight: true },
    ],
  },
  PO4: {
    name: 'Item Physical Details',
    purpose: 'Packaging details for the line item - pack size, dimensions, weight per unit.',
    elements: [
      { ref: '01', name: 'Pack Count' },
      { ref: '02', name: 'Size' },
      { ref: '03', name: 'Unit of Measure', codeSet: 'unitOrBasisForMeasurementCode' },
    ],
  },
  IT1: {
    name: 'Baseline Item Data (Invoice Line Item)',
    purpose: 'One line item on an invoice - the product, quantity billed, and unit price.',
    elements: [
      { ref: '01', name: 'Line Item Number', highlight: true },
      { ref: '02', name: 'Quantity Invoiced', highlight: true },
      { ref: '03', name: 'Unit of Measure', codeSet: 'unitOrBasisForMeasurementCode' },
      { ref: '04', name: 'Unit Price', highlight: true },
      { ref: '06', name: 'Product/Service ID Qualifier', codeSet: 'productServiceIDQualifier' },
      { ref: '07', name: 'Product/Service ID (SKU/part #)', highlight: true },
    ],
  },
  TDS: {
    name: 'Total Monetary Value Summary',
    purpose: 'The total dollar amount of the invoice.',
    elements: [
      { ref: '01', name: 'Total Invoice Amount (in cents)', highlight: true },
    ],
  },
  SLN: {
    name: 'Subline Item Detail',
    purpose: 'A sub-line under a line item, e.g. a component, kit part, or price adjustment.',
    elements: [
      { ref: '01', name: 'Line Item Identifier' },
      { ref: '02', name: 'Assigned Identification' },
    ],
  },
  HL: {
    name: 'Hierarchical Level',
    purpose: 'Groups related segments together in a parent/child structure (used heavily in 856 ASN to nest shipment > order > pack > item).',
    elements: [
      { ref: '01', name: 'Hierarchical ID Number', highlight: true },
      { ref: '02', name: 'Hierarchical Parent ID Number' },
      { ref: '03', name: 'Hierarchical Level Code (S=Shipment, O=Order, P=Pack, I=Item)', highlight: true },
    ],
  },
  LIN: {
    name: 'Item Identification',
    purpose: 'Identifies the product on this line (used in ASN/856 line detail).',
    elements: [
      { ref: '01', name: 'Assigned Identification' },
      { ref: '02', name: 'Product/Service ID Qualifier', codeSet: 'productServiceIDQualifier' },
      { ref: '03', name: 'Product/Service ID (SKU/part #)', highlight: true },
    ],
  },
  SN1: {
    name: 'Item Detail (Shipment)',
    purpose: 'The quantity of the item being shipped, in an ASN.',
    elements: [
      { ref: '01', name: 'Assigned Identification' },
      { ref: '02', name: 'Number of Units Shipped', highlight: true },
      { ref: '03', name: 'Unit of Measure', codeSet: 'unitOrBasisForMeasurementCode' },
    ],
  },

  // --- Load tender / shipment status (204/990/214) specific ---
  B10: {
    name: 'Identification',
    purpose: 'The header of a 214 Shipment Status message: the shipment/load ID this status update is about and which carrier sent it.',
    elements: [
      { ref: '01', name: 'Reference Identification (shipment/load number)', highlight: true },
      { ref: '02', name: 'Shipment Identification Number (SID)', highlight: true },
      { ref: '03', name: 'Standard Carrier Alpha Code (SCAC)', highlight: true },
    ],
  },
  L11: {
    name: 'Business Instructions/Reference Number',
    purpose: 'A generic reference number, commonly used in transportation transactions for order/release numbers.',
    elements: [
      { ref: '01', name: 'Reference Number', highlight: true },
      { ref: '02', name: 'Reference Number Qualifier', codeSet: 'referenceIdentificationQualifier' },
    ],
  },
  MS1: {
    name: 'Equipment, Shipment, or Real Property Location (City/State)',
    purpose: 'Current location of the shipment (city/state), used in status updates.',
    elements: [
      { ref: '01', name: 'City Name', highlight: true },
      { ref: '02', name: 'State or Province Code', highlight: true },
      { ref: '03', name: 'Country Code' },
    ],
  },
  MS2: {
    name: 'Equipment or Container Owner and Type',
    purpose: 'Owner and type of the equipment (e.g. trailer) referenced in the status update.',
    elements: [
      { ref: '01', name: 'Equipment Initial' },
      { ref: '02', name: 'Equipment Number', highlight: true },
    ],
  },
  AT7: {
    name: 'Shipment Status Details',
    purpose: 'The actual status code for a 214 shipment status message (e.g. picked up, in transit, delivered) plus date/time.',
    elements: [
      { ref: '01', name: 'Shipment Status Code', highlight: true },
      { ref: '02', name: 'Shipment Status/Appointment Reason Code' },
      { ref: '05', name: 'Date (CCYYMMDD)', highlight: true },
      { ref: '06', name: 'Time (HHMM)', highlight: true },
    ],
  },
  AT8: {
    name: 'Shipment Weight, Packaging Form, and Quantity',
    purpose: 'Weight and package count details for a load tender / status message.',
    elements: [
      { ref: '01', name: 'Weight Unit Code' },
      { ref: '02', name: 'Packaging Form Code' },
      { ref: '03', name: 'Weight', highlight: true },
      { ref: '05', name: 'Lading Quantity (# of packages)', highlight: true },
    ],
  },
  S5: {
    name: 'Stop Off Details',
    purpose: 'One stop (pickup or delivery) on a multi-stop route, with sequence number and reason for the stop.',
    elements: [
      { ref: '01', name: 'Stop Sequence Number', highlight: true },
      { ref: '02', name: 'Stop Reason Code (LD=Loading, UL=Unloading, etc.)', highlight: true },
    ],
  },
  R4: {
    name: 'Port or Terminal',
    purpose: 'A port, terminal, or facility location referenced by this transaction.',
    elements: [
      { ref: '01', name: 'Port or Terminal Function Code' },
      { ref: '02', name: 'Location Qualifier' },
      { ref: '03', name: 'Location Identifier', highlight: true },
      { ref: '05', name: 'City Name' },
      { ref: '06', name: 'State/Province Code' },
    ],
  },
  V1: {
    name: 'Vessel Identification',
    purpose: 'Ocean vessel details for an ocean shipment.',
    elements: [
      { ref: '01', name: 'Vessel Code' },
      { ref: '02', name: 'Vessel Name', highlight: true },
    ],
  },

  // --- Functional Acknowledgment (997) ---
  AK1: {
    name: 'Functional Group Response Header',
    purpose: 'Identifies which functional group (from GS) this 997 acknowledgment is responding to.',
    elements: [
      { ref: '01', name: 'Functional Identifier Code Being Acknowledged', highlight: true },
      { ref: '02', name: 'Group Control Number Being Acknowledged', highlight: true },
    ],
  },
  AK2: {
    name: 'Transaction Set Response Header',
    purpose: 'Identifies which transaction set (from ST) this part of the 997 is responding to.',
    elements: [
      { ref: '01', name: 'Transaction Set ID Being Acknowledged', highlight: true },
      { ref: '02', name: 'Transaction Set Control Number Being Acknowledged', highlight: true },
    ],
  },
  AK5: {
    name: 'Transaction Set Response Trailer',
    purpose: 'Whether the acknowledged transaction set was accepted or rejected, and why.',
    elements: [
      { ref: '01', name: 'Transaction Set Acknowledgment Code', codeSet: 'ackType997', highlight: true },
    ],
  },
  AK9: {
    name: 'Functional Group Response Trailer',
    purpose: 'Whether the acknowledged functional group was accepted or rejected overall.',
    elements: [
      { ref: '01', name: 'Functional Group Acknowledge Code', codeSet: 'ackType997', highlight: true },
      { ref: '02', name: 'Number of Transaction Sets Included' },
      { ref: '03', name: 'Number of Transaction Sets Received' },
      { ref: '04', name: 'Number of Transaction Sets Accepted' },
    ],
  },
}

export function getSegmentDefinition(segmentId) {
  return SEGMENT_DICTIONARY[segmentId] || null
}

export function getElementDefinition(segmentId, position) {
  const def = SEGMENT_DICTIONARY[segmentId]
  if (!def) return null
  return def.elements.find((e) => e.ref === position) || null
}
