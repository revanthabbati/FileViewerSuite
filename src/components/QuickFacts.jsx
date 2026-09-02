const FIELD_LABELS = {
  documentType: 'Document Type',
  poNumber: 'PO Number',
  poDate: 'PO Date',
  invoiceNumber: 'Invoice Number',
  invoiceDate: 'Invoice Date',
  shipmentId: 'Shipment / Load ID',
  bolNumber: 'Bill of Lading #',
  carrierReference: 'Carrier Reference',
  carrierScac: 'Carrier SCAC',
  carrierName: 'Carrier Name',
  transportMode: 'Transport Mode',
  shipToName: 'Ship To',
  shipFromName: 'Ship From',
  billToName: 'Bill To',
  shipDate: 'Ship Date',
  estimatedDeliveryDate: 'Estimated Delivery',
  actualDeliveryDate: 'Actual Delivery',
  totalAmount: 'Total Amount ($)',
  lineItemCount: 'Line Item Count',
  shipmentStatusCode: 'Shipment Status Code',
  shipmentStatusDate: 'Status Date',
}

export default function QuickFacts({ fields }) {
  const entries = Object.entries(fields || {})
  if (entries.length === 0) return null
  return (
    <div className="quick-facts">
      <h4>Quick Facts</h4>
      <div className="quick-facts-grid">
        {entries.map(([key, value]) => (
          <div className="quick-fact" key={key}>
            <span className="quick-fact-label">{FIELD_LABELS[key] || key}</span>
            <span className="quick-fact-value">{value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export { FIELD_LABELS }
