import ExcelJS from 'exceljs';
import { PAYMENT_TYPE_LABELS } from '@/lib/paymentTypes';

const TEMPLATE_HEADERS = [
  'Introducer Name',
  'Name',
  'Contact Number',
  'Firm',
  'Payment Amount',
  'Payment Type',
] as const;

const SAMPLE_ROWS: (string | number)[][] = [
  ['Jane Smith', 'John Doe', '9876543210', 'Acme Corp', 5000, 'Annual Dues'],
  ['', 'Jane Roe', '9123456789', '', 2500, 'Special Offer'],
];

export async function downloadBulkMemberTemplate(): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Members');
  const optionsSheet = workbook.addWorksheet('Options');

  optionsSheet.state = 'veryHidden';
  PAYMENT_TYPE_LABELS.forEach((label, i) => {
    optionsSheet.getCell(i + 1, 1).value = label;
  });

  sheet.addRow([...TEMPLATE_HEADERS]);
  SAMPLE_ROWS.forEach((row) => sheet.addRow(row));

  sheet.getRow(1).font = { bold: true };
  sheet.columns = [
    { width: 22 },
    { width: 22 },
    { width: 18 },
    { width: 20 },
    { width: 16 },
    { width: 18 },
  ];

  const lastOptionRow = PAYMENT_TYPE_LABELS.length;
  // exceljs supports dataValidations at runtime; @types omit this API
  (sheet as ExcelJS.Worksheet & { dataValidations: { add: (range: string, rule: object) => void } }).dataValidations.add('F2:F5000', {
    type: 'list',
    allowBlank: false,
    formulae: [`=Options!$A$1:$A$${lastOptionRow}`],
    showErrorMessage: true,
    errorTitle: 'Invalid payment type',
    error: `Select one of: ${PAYMENT_TYPE_LABELS.join(', ')}`,
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'jsk-bulk-members-payments-template.xlsx';
  link.click();
  URL.revokeObjectURL(url);
}
