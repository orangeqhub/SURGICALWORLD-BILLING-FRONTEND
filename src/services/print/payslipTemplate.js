import { formatCurrency, formatDate } from '../../utils/formatters';

/**
 * Standalone HTML template for the Payroll payslip, mirroring
 * purchaseDocumentTemplate.js's separation of template-building from the
 * print/export I/O in payslipDocumentService.js. Deliberately isolated from
 * invoiceTemplates.js/purchaseDocumentTemplate.js - a payslip is its own
 * document type.
 */
export function buildPayslipHtml({ payroll, branch, logoBase64 }) {
  return `
  <html>
    <head>
      <meta charset="utf-8" />
      <style>
        body { font-family: Helvetica, Arial, sans-serif; padding: 24px; color: #202463; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #ED1C2E; padding-bottom: 12px; margin-bottom: 16px; }
        .logo { height: 48px; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px; }
        th, td { border: 1px solid #E2E2ED; padding: 6px 10px; }
        th { background: #F5F5FA; text-align: left; width: 50%; }
        .totals { margin-top: 16px; width: 340px; margin-left: auto; font-size: 13px; }
        .totals div { display: flex; justify-content: space-between; padding: 2px 0; }
        .totals .net { font-weight: 800; font-size: 16px; color: #ED1C2E; border-top: 1px solid #E2E2ED; margin-top: 6px; padding-top: 6px; }
        .section-title { font-weight: 700; margin-top: 16px; margin-bottom: 4px; }
        .badge { display: inline-block; padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; background: ${payroll.paymentStatus === 'PAID' ? '#E7F7EE' : '#FFF4E5'}; color: ${payroll.paymentStatus === 'PAID' ? '#0F9D58' : '#B45309'}; }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          ${logoBase64 ? `<img class="logo" src="${logoBase64}" />` : ''}
          <div><strong>Surgical World</strong> - ${branch?.name || payroll.branchId || ''}</div>
        </div>
        <div style="text-align:right">
          <div class="badge">${payroll.paymentStatus}</div>
          <div><strong>Payslip - ${payroll.month}</strong></div>
        </div>
      </div>

      <div class="section-title">Employee</div>
      <div>${payroll.employeeName} (${payroll.employeeId})</div>

      <div class="section-title">Attendance Summary</div>
      <table>
        <tr><th>Working Days</th><td>${payroll.workingDays}</td></tr>
        <tr><th>Present Days</th><td>${payroll.presentDays}</td></tr>
        <tr><th>Absent Days</th><td>${payroll.absentDays}</td></tr>
        <tr><th>Half Days</th><td>${payroll.halfDays}</td></tr>
        <tr><th>Leave Days</th><td>${payroll.leaveDays}</td></tr>
      </table>

      <div class="totals">
        <div><span>Basic Salary</span><span>${formatCurrency(payroll.basicSalary)}</span></div>
        <div><span>Allowances</span><span>${formatCurrency(payroll.allowances)}</span></div>
        <div><span>Bonus</span><span>${formatCurrency(payroll.bonus)}</span></div>
        <div><span>Gross Salary</span><span>${formatCurrency(payroll.grossSalary)}</span></div>
        <div><span>Attendance Deduction (${payroll.perDayRate}/day)</span><span>-${formatCurrency(payroll.attendanceDeduction)}</span></div>
        <div><span>Other Deductions</span><span>-${formatCurrency(payroll.deductions)}</span></div>
        <div><span>Advance</span><span>-${formatCurrency(payroll.advance)}</span></div>
        <div class="net"><span>Net Salary</span><span>${formatCurrency(payroll.netSalary)}</span></div>
      </div>

      ${payroll.paymentDate ? `<div class="section-title">Paid On</div><div>${formatDate(payroll.paymentDate)}</div>` : ''}
      ${payroll.remarks ? `<div class="section-title">Remarks</div><div>${payroll.remarks}</div>` : ''}
    </body>
  </html>`;
}

export default { buildPayslipHtml };
