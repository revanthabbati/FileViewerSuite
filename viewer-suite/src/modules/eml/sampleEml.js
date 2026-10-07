import { SAMPLES as EDI_SAMPLES } from '../edi/lib/samples.js'

// A realistic multipart message used by the "Try a sample" buttons. It exercises
// every part of the viewer: HTML + plain-text alternatives, an inline (cid:) image,
// a blocked remote image, authentication results and an EDI attachment that can be
// opened straight into the EDI viewer.

function b64(str) {
  const bytes = new TextEncoder().encode(str)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/.{76}/g, '$&\r\n')
}

const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="40" viewBox="0 0 160 40"><rect width="160" height="40" rx="8" fill="#1e3a8a"/><text x="16" y="26" font-family="Arial" font-size="16" font-weight="700" fill="#fff">ACME Logistics</text></svg>`

const EDI_214 = EDI_SAMPLES.find((s) => s.key === '214')?.content || ''

const HTML = `<!doctype html>
<html><body style="margin:0;background:#f4f6fa;font-family:Arial,Helvetica,sans-serif;color:#1f2937">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fa;padding:24px 0"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #e5e7eb">
<tr><td style="padding:20px 28px;border-bottom:1px solid #e5e7eb"><img src="cid:logo@acme" alt="ACME Logistics" width="160" height="40"></td></tr>
<tr><td style="padding:28px">
<h2 style="margin:0 0 12px;font-size:20px">Shipment SHP-20231002 is in transit</h2>
<p style="margin:0 0 16px;line-height:1.6">Hi Jordan,<br>Your load picked up from <b>Dallas, TX</b> this morning and is on schedule for delivery on <b>Oct 4</b>.
The carrier's EDI 214 status message is attached for your integration team.</p>
<table cellpadding="8" cellspacing="0" style="border-collapse:collapse;width:100%;font-size:14px;margin-bottom:18px">
<tr style="background:#f3f4f6"><td><b>PO Number</b></td><td>PO123456</td></tr>
<tr><td><b>Carrier</b></td><td>ABC Freight (ABCD)</td></tr>
<tr style="background:#f3f4f6"><td><b>Status</b></td><td>X3 — Arrived at pickup location</td></tr>
<tr><td><b>ETA</b></td><td>Wed, Oct 4 2023 — 14:00 CT</td></tr>
</table>
<p style="margin:0 0 20px"><a href="https://example.com/track/SHP-20231002" style="background:#2563eb;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;display:inline-block">Track shipment</a></p>
<img src="https://images.example.com/tracking-pixel.gif?id=SHP-20231002" width="1" height="1" alt="">
<p style="margin:0;color:#6b7280;font-size:12px">ACME Logistics · 100 Main St · Dallas, TX 75201</p>
</td></tr></table></td></tr></table>
</body></html>`

const TEXT = `Hi Jordan,

Your load picked up from Dallas, TX this morning and is on schedule for delivery on Oct 4.
The carrier's EDI 214 status message is attached for your integration team.

PO Number: PO123456
Carrier:   ABC Freight (ABCD)
Status:    X3 - Arrived at pickup location
ETA:       Wed, Oct 4 2023 - 14:00 CT

Track shipment: https://example.com/track/SHP-20231002

ACME Logistics - 100 Main St - Dallas, TX 75201`

export const SAMPLE_EML = [
  'Return-Path: <notifications@acme-logistics.example>',
  'Delivered-To: jordan.lee@example.com',
  'Received: from mx.example.com (mx.example.com [203.0.113.25])',
  '\tby inbound.example.com with ESMTPS id 4f1c2a; Mon, 02 Oct 2023 09:15:12 -0500',
  'Received: from mail.acme-logistics.example (mail.acme-logistics.example [198.51.100.7])',
  '\tby mx.example.com with ESMTPS id 9b7e11; Mon, 02 Oct 2023 09:15:09 -0500',
  'Received: from app-04.internal.acme-logistics.example ([10.0.4.12])',
  '\tby mail.acme-logistics.example with ESMTP id 77aa01; Mon, 02 Oct 2023 09:15:04 -0500',
  'Authentication-Results: mx.example.com;',
  '\tspf=pass smtp.mailfrom=acme-logistics.example;',
  '\tdkim=pass header.d=acme-logistics.example header.s=s1;',
  '\tdmarc=pass (p=REJECT) header.from=acme-logistics.example',
  'DKIM-Signature: v=1; a=rsa-sha256; d=acme-logistics.example; s=s1; h=from:to:subject:date; bh=abc123=; b=def456=',
  'From: "ACME Logistics Notifications" <notifications@acme-logistics.example>',
  'Reply-To: Dispatch Desk <dispatch@acme-logistics.example>',
  'To: Jordan Lee <jordan.lee@example.com>',
  'Cc: Integrations Team <integrations@example.com>',
  'Subject: =?UTF-8?Q?Shipment_SHP-20231002_is_in_transit_=E2=80=94_ETA_Oct_4?=',
  'Date: Mon, 02 Oct 2023 09:15:00 -0500',
  'Message-ID: <shp-20231002.notify@acme-logistics.example>',
  'MIME-Version: 1.0',
  'X-Priority: 3',
  'Content-Type: multipart/mixed; boundary="mixed-001"',
  '',
  'This is a multi-part message in MIME format.',
  '',
  '--mixed-001',
  'Content-Type: multipart/related; boundary="related-001"',
  '',
  '--related-001',
  'Content-Type: multipart/alternative; boundary="alt-001"',
  '',
  '--alt-001',
  'Content-Type: text/plain; charset=UTF-8',
  'Content-Transfer-Encoding: base64',
  '',
  b64(TEXT),
  '--alt-001',
  'Content-Type: text/html; charset=UTF-8',
  'Content-Transfer-Encoding: base64',
  '',
  b64(HTML),
  '--alt-001--',
  '',
  '--related-001',
  'Content-Type: image/svg+xml; name="logo.svg"',
  'Content-Transfer-Encoding: base64',
  'Content-ID: <logo@acme>',
  'Content-Disposition: inline; filename="logo.svg"',
  '',
  b64(LOGO_SVG),
  '--related-001--',
  '',
  '--mixed-001',
  'Content-Type: application/edi-x12; name="SHP-20231002-214.edi"',
  'Content-Transfer-Encoding: base64',
  'Content-Disposition: attachment; filename="SHP-20231002-214.edi"',
  '',
  b64(EDI_214),
  '--mixed-001--',
  '',
].join('\r\n')
