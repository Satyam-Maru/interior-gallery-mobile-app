import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { LOGO_BASE64 } from '../../constants/logoBase64';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface LedgerEntry {
  id: number;
  bill_date: string;
  type: string;
  payment_mode?: string | null;
  net_amount?: number;
  note?: string | null;
  debit: number;
  credit: number;
  label: string;
}

interface LedgerPDFOptions {
  companyName?: string;
  partyName: string;
  startDate: Date;
  endDate: Date;
  openingDebit?: number;
  openingCredit?: number;
  entries: LedgerEntry[];
  grandDebit: number;
  grandCredit: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Date helpers
// ─────────────────────────────────────────────────────────────────────────────

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function fmtDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getDate()}-${MONTH_SHORT[d.getMonth()]}-${d.getFullYear()}`;
}

function fmtDateRange(start: Date, end: Date): string {
  return `${start.getDate()}-${MONTH_SHORT[start.getMonth()]}-${start.getFullYear()} to ${end.getDate()}-${MONTH_SHORT[end.getMonth()]}-${end.getFullYear()}`;
}

function fmtAmt(val: number): string {
  if (val === 0) return '';
  return val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─────────────────────────────────────────────────────────────────────────────
// Vch Type label (Tally-style)
// ─────────────────────────────────────────────────────────────────────────────

function vchType(type: string): string {
  switch (type) {
    case 'sell':            return 'Sales';
    case 'sell_return':     return 'Credit Note';
    case 'purchase':        return 'Purchase';
    case 'purchase_return': return 'Debit Note';
    case 'payment':         return 'Payment';
    case 'discount':        return 'Discount';
    default:                return type;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Particulars label (To / By style)
// ─────────────────────────────────────────────────────────────────────────────

function particulars(entry: LedgerEntry): string {
  if (entry.type === 'payment') {
    const mode = entry.payment_mode?.toLowerCase().trim();
    let modeText = 'By cash';
    if (mode === 'upi') {
      modeText = 'By UPI';
    } else if (mode === 'cheque') {
      modeText = 'By Cheque';
    } else if (mode === 'bank_transfer' || mode === 'bank transfer') {
      modeText = 'By Bank Transfer';
    } else if (entry.label && entry.label !== 'Payment' && entry.label !== 'Payment Received') {
      modeText = entry.label.startsWith('By ') ? entry.label : `By ${entry.label}`;
    }
    return `${modeText}${entry.note ? ` (${entry.note})` : ''}`;
  }
  if (entry.type === 'discount') {
    return `By discount${entry.note ? ` (${entry.note})` : ''}`;
  }
  // Debit side starts with "To", Credit side starts with "By"
  const prefix = entry.debit > 0 ? 'To' : 'By';
  const cleanLabel = entry.label.replace(/^(To|By)\s+/i, '');
  return `${prefix} ${cleanLabel}${entry.note ? ` (${entry.note})` : ''}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// HTML template — Tally-style classic ledger
// ─────────────────────────────────────────────────────────────────────────────

function buildHTML(opts: LedgerPDFOptions): string {
  const {
    companyName,
    partyName,
    startDate,
    endDate,
    openingDebit = 0,
    openingCredit = 0,
    entries,
    grandDebit,
    grandCredit,
  } = opts;
  const netBalance = grandDebit - grandCredit;
  const netLabel = netBalance >= 0 ? 'Dr' : 'Cr';
  const netAmt = Math.abs(netBalance);

  const grandTotalVal = grandDebit - grandCredit;
  const isNeg = grandTotalVal < 0;
  const grandTotalStr = `${isNeg ? '-' : ''}₹${Math.abs(grandTotalVal).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Sort entries oldest-first for ledger display
  const sorted = [...entries].sort((a, b) => new Date(a.bill_date).getTime() - new Date(b.bill_date).getTime());

  const rows = sorted.map((e, i) => `
    <tr class="${i % 2 === 0 ? 'row-even' : 'row-odd'}">
      <td class="col-date">${fmtDate(e.bill_date)}</td>
      <td class="col-particulars">${particulars(e)}</td>
      <td class="col-vch">${vchType(e.type)}</td>
      <td class="col-vchno">${e.id}</td>
      <td class="col-amount debit">${fmtAmt(e.debit)}</td>
      <td class="col-amount credit">${fmtAmt(e.credit)}</td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${partyName} - ${fmtDateRange(startDate, endDate)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 11pt;
      color: #000;
      background: #fff;
      padding: 24px 28px;
    }

    /* ── Company Header ── */
    .company-header {
      text-align: center;
      border-bottom: 2px solid #000;
      padding-bottom: 12px;
      margin-bottom: 8px;
      page-break-inside: avoid;
    }
    .company-logo {
      width: 68px;
      height: 68px;
      border-radius: 8px;
      object-fit: cover;
      margin-bottom: 6px;
      display: inline-block;
    }
    .company-name {
      font-size: 16pt;
      font-weight: bold;
      letter-spacing: 2px;
      text-transform: uppercase;
    }
    .party-name {
      font-size: 13pt;
      font-weight: bold;
      margin-top: 4px;
    }
    .ledger-title {
      font-size: 10pt;
      color: #444;
      margin-top: 2px;
    }
    .date-range {
      font-size: 10pt;
      margin-top: 3px;
      font-style: italic;
    }

    /* ── Table ── */
    .ledger-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 14px;
      font-size: 10pt;
    }

    .ledger-table thead tr {
      background-color: #1a1a1a;
      color: #fff;
    }

    .ledger-table thead th {
      padding: 7px 8px;
      text-align: left;
      font-weight: bold;
      font-size: 9.5pt;
      letter-spacing: 0.3px;
      border: 1px solid #000;
    }

    .ledger-table th.col-amount,
    .ledger-table td.col-amount {
      text-align: right;
    }

    .ledger-table td {
      padding: 5px 8px;
      border: 1px solid #ccc;
      vertical-align: top;
    }

    .row-even { background-color: #fff; }
    .row-odd  { background-color: #f7f7f7; }

    /* Opening / Closing Balance rows */
    .row-opening, .row-closing {
      background-color: #f0f0f0 !important;
      font-weight: bold;
    }
    .row-closing td {
      border-top: 2px solid #000 !important;
    }

    /* Total row */
    .row-total {
      background-color: #f0f0f0 !important;
      color: #000 !important;
      font-weight: bold;
      font-size: 10.5pt;
    }
    .row-total td {
      padding: 7px 8px;
      border: 1px solid #000;
      color: #000 !important;
    }

    /* Column widths */
    .col-date       { width: 13%; white-space: nowrap; }
    .col-particulars{ width: 35%; }
    .col-vch        { width: 13%; }
    .col-vchno      { width: 8%;  text-align: center; }
    .col-amount     { width: 15.5%; }

    /* Net balance badge */
    .net-balance-row {
      margin-top: 16px;
      text-align: right;
    }
    .net-badge {
      display: inline-block;
      padding: 6px 18px;
      border: 1.5px solid #1a1a1a;
      border-radius: 4px;
      font-size: 11pt;
      font-weight: bold;
    }
    .net-label { font-size: 9pt; color: #555; display: block; margin-bottom: 2px; }

    /* Footer */
    .footer {
      margin-top: 24px;
      font-size: 8.5pt;
      color: #777;
      text-align: center;
      border-top: 1px solid #ddd;
      padding-top: 8px;
    }

    @media print {
      body { padding: 10px 12px; }
    }
  </style>
</head>
<body>

  <!-- Company Header -->
  <div class="company-header">
    <img src="${LOGO_BASE64}" class="company-logo" alt="Interior Gallery" />
    <div class="company-name">INTERIOR GALLERY</div>
    <div class="party-name">${partyName}</div>
    <div class="ledger-title">Ledger Account</div>
    <div class="date-range">${fmtDateRange(startDate, endDate)}</div>
  </div>

  <!-- Ledger Table -->
  <table class="ledger-table">
    <thead>
      <tr>
        <th class="col-date">Date</th>
        <th class="col-particulars">Particulars</th>
        <th class="col-vch">Vch Type</th>
        <th class="col-vchno">Vch No.</th>
        <th class="col-amount">Debit (₹)</th>
        <th class="col-amount">Credit (₹)</th>
      </tr>
    </thead>
    <tbody>
      <!-- Opening Balance -->
      <tr class="row-opening">
        <td class="col-date">${fmtDate(startDate.toISOString())}</td>
        <td class="col-particulars" colspan="3"><b>${openingDebit > 0 ? 'To' : openingCredit > 0 ? 'By' : ''} Opening Balance</b></td>
        <td class="col-amount debit">${openingDebit > 0 ? fmtAmt(openingDebit) : ''}</td>
        <td class="col-amount credit">${openingCredit > 0 ? fmtAmt(openingCredit) : ''}</td>
      </tr>

      <!-- Transaction rows -->
      ${rows}

      <!-- Closing Balance -->
      <tr class="row-closing">
        <td class="col-date">${fmtDate(endDate.toISOString())}</td>
        <td class="col-particulars" colspan="3"><b>${netBalance > 0 ? 'By' : netBalance < 0 ? 'To' : ''} Closing Balance</b></td>
        <td class="col-amount debit">${netBalance < 0 ? fmtAmt(netAmt) : ''}</td>
        <td class="col-amount credit">${netBalance > 0 ? fmtAmt(netAmt) : ''}</td>
      </tr>

      <!-- Grand Total -->
      <tr class="row-total">
        <td class="col-date"></td>
        <td class="col-particulars" colspan="3" style="text-align:right; letter-spacing:0.5px; color:#000;">GRAND TOTAL (DEBIT - CREDIT):</td>
        <td class="col-amount" colspan="2" style="text-align:right; font-weight:bold; color:#000;">${grandTotalStr}</td>
      </tr>
    </tbody>
  </table>

  <!-- Footer -->
  <div class="footer">
    Generated by Interior Gallery · ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
  </div>

</body>
</html>
  `;
}

// ─────────────────────────────────────────────────────────────────────────────
// Export function — call this from the UI
// ─────────────────────────────────────────────────────────────────────────────

export async function exportLedgerPDF(opts: LedgerPDFOptions): Promise<void> {
  const html = buildHTML(opts);

  // Generate PDF
  const { uri } = await Print.printToFileAsync({
    html,
    base64: false,
  });

  const dateRangeStr = fmtDateRange(opts.startDate, opts.endDate);
  const fileTitle = `${opts.partyName.trim()} - ${dateRangeStr}`;
  const safeFileName = `${fileTitle.replace(/[/\\?%*:|"<>]/g, '_')}.pdf`;
  const targetUri = `${FileSystem.cacheDirectory}${safeFileName}`;

  let shareUri = uri;
  try {
    const existing = await FileSystem.getInfoAsync(targetUri);
    if (existing.exists) {
      await FileSystem.deleteAsync(targetUri, { idempotent: true });
    }
    await FileSystem.copyAsync({ from: uri, to: targetUri });
    shareUri = targetUri;
  } catch (e) {
    console.warn('Could not copy PDF with custom name, using default uri:', e);
  }

  // Share / save
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(shareUri, {
      mimeType: 'application/pdf',
      dialogTitle: fileTitle,
      UTI: 'com.adobe.pdf',
    });
  } else {
    throw new Error('Sharing is not available on this device');
  }
}
