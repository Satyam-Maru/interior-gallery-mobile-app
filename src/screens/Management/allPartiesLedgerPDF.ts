import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { LOGO_BASE64 } from '../../constants/logoBase64';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface PartyMonthSummary {
  partyId: number;
  partyName: string;
  debit: number;
  credit: number;
}

export interface MonthSummaryGroup {
  monthKey: string;
  monthLabel: string;
  parties: PartyMonthSummary[];
  totalDebit: number;
  totalCredit: number;
}

export interface AllPartiesLedgerPDFOptions {
  companyName?: string;
  startDate: Date;
  endDate: Date;
  monthGroups: MonthSummaryGroup[];
  grandDebit: number;
  grandCredit: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function fmtDateRange(start: Date, end: Date): string {
  return `${start.getDate()}-${MONTH_SHORT[start.getMonth()]}-${start.getFullYear()} to ${end.getDate()}-${MONTH_SHORT[end.getMonth()]}-${end.getFullYear()}`;
}

function fmtAmt(val: number): string {
  if (val === 0) return '—';
  return val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─────────────────────────────────────────────────────────────────────────────
// HTML template
// ─────────────────────────────────────────────────────────────────────────────

function buildHTML(opts: AllPartiesLedgerPDFOptions): string {
  const { companyName, startDate, endDate, monthGroups, grandDebit, grandCredit } = opts;
  const grandTotalVal = grandCredit - grandDebit;
  const isNeg = grandTotalVal < 0;
  const grandTotalStr = `${isNeg ? '-' : ''}₹${Math.abs(grandTotalVal).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  let tableRows = '';
  let rowCounter = 0;

  for (const group of monthGroups) {
    // Month Section Header
    tableRows += `
      <tr class="month-header-row">
        <td colspan="3" class="month-header-cell">
          <b>${group.monthLabel}</b>
        </td>
      </tr>
    `;

    for (const party of group.parties) {
      const isEven = rowCounter % 2 === 0;
      rowCounter++;
      tableRows += `
        <tr class="${isEven ? 'row-even' : 'row-odd'}">
          <td class="col-party">${party.partyName}</td>
          <td class="col-amount debit">${fmtAmt(party.debit)}</td>
          <td class="col-amount credit">${fmtAmt(party.credit)}</td>
        </tr>
      `;
    }

    // Month Subtotal
    tableRows += `
      <tr class="month-subtotal-row">
        <td class="col-party" style="font-weight:bold; text-align:right;">Subtotal (${group.monthLabel}):</td>
        <td class="col-amount debit" style="font-weight:bold;">${fmtAmt(group.totalDebit)}</td>
        <td class="col-amount credit" style="font-weight:bold;">${fmtAmt(group.totalCredit)}</td>
      </tr>
    `;
  }

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>All Parties Ledger & Revenue Statement</title>
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
    .statement-title {
      font-size: 13pt;
      font-weight: bold;
      margin-top: 4px;
      color: #1a1a1a;
    }
    .date-range {
      font-size: 10pt;
      margin-top: 3px;
      font-style: italic;
      color: #444;
    }

    /* ── Summary Stats ── */
    .stats-card {
      display: flex;
      justify-content: center;
      border: 1.5px solid #000;
      background: #fdfdfd;
      padding: 10px 14px;
      margin: 14px 0;
      border-radius: 4px;
    }
    .stat-item {
      text-align: center;
    }
    .stat-label {
      font-size: 10pt;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #000;
    }
    .stat-val {
      font-size: 15pt;
      font-weight: bold;
      margin-top: 3px;
      color: #000;
    }

    /* ── Table ── */
    .ledger-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
      font-size: 10pt;
    }

    .ledger-table thead tr {
      background-color: #1a1a1a;
      color: #fff;
    }

    .ledger-table thead th {
      padding: 8px 10px;
      text-align: left;
      font-weight: bold;
      font-size: 10pt;
      letter-spacing: 0.3px;
      border: 1px solid #000;
    }

    .ledger-table th.col-amount,
    .ledger-table td.col-amount {
      text-align: right;
    }

    .ledger-table td {
      padding: 6px 10px;
      border: 1px solid #ccc;
      vertical-align: middle;
    }

    .row-even { background-color: #fff; }
    .row-odd  { background-color: #f9f9f9; }

    .month-header-row {
      background-color: #e9ecef !important;
    }
    .month-header-cell {
      padding: 7px 10px !important;
      font-size: 10.5pt;
      border: 1px solid #aaa !important;
      color: #1a1a1a;
      text-transform: uppercase;
      letter-spacing: 0.8px;
    }

    .month-subtotal-row {
      background-color: #f1f3f5 !important;
      border-top: 1px solid #999;
      border-bottom: 2px solid #333;
    }
    .month-subtotal-row td {
      padding: 6px 10px;
      border: 1px solid #bbb;
    }

    /* Grand Total row */
    .row-total {
      background-color: #f0f0f0 !important;
      color: #000 !important;
      font-weight: bold;
      font-size: 11pt;
    }
    .row-total td {
      padding: 8px 10px;
      border: 1px solid #000;
      color: #000 !important;
    }

    .col-party  { width: 50%; }
    .col-amount { width: 25%; }

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
      body { padding: 12px 14px; }
    }
  </style>
</head>
<body>

  <!-- Company Header -->
  <div class="company-header">
    <img src="${LOGO_BASE64}" class="company-logo" alt="Interior Gallery" />
    <div class="company-name">INTERIOR GALLERY</div>
    <div class="statement-title">All Parties Monthly Ledger & Revenue Statement</div>
    <div class="date-range">${fmtDateRange(startDate, endDate)}</div>
  </div>

  <!-- Summary Statistics -->
  <div class="stats-card">
    <div class="stat-item">
      <div class="stat-label">Grand Total (Credit - Debit)</div>
      <div class="stat-val">${grandTotalStr}</div>
    </div>
  </div>

  <!-- Table -->
  <table class="ledger-table">
    <thead>
      <tr>
        <th class="col-party">Party Name</th>
        <th class="col-amount">Debit (₹)</th>
        <th class="col-amount">Credit (₹)</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}

      <!-- Grand Total -->
      <tr class="row-total">
        <td class="col-party" style="text-align:right; letter-spacing:0.5px; color:#000;">GRAND TOTAL:</td>
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
// Export function
// ─────────────────────────────────────────────────────────────────────────────

export async function exportAllPartiesLedgerPDF(opts: AllPartiesLedgerPDFOptions): Promise<void> {
  const html = buildHTML(opts);

  const { uri } = await Print.printToFileAsync({
    html,
    base64: false,
  });

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: 'All Parties Ledger Statement',
      UTI: 'com.adobe.pdf',
    });
  } else {
    throw new Error('Sharing is not available on this device');
  }
}
