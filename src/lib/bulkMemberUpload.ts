import * as XLSX from 'xlsx';
import { BULK_MEMBER_NEXT_DUE, MEMBER_PLACEHOLDER_PICTURE_URL } from '@/lib/memberConstants';
import { resolveIntroducerId } from '@/lib/introducer';
import { getMemberStatus } from '@/lib/memberStatus';
import type { Payment } from '@/lib/firebase';
import { parsePaymentType, formatPaymentType, PAYMENT_TYPE_LABELS } from '@/lib/paymentTypes';

export { formatPaymentType };

export type BulkMemberRow = {
  rowNumber: number;
  introducerName: string;
  name: string;
  contact: string;
  firmName: string;
  amount: number;
  paymentType: Payment['type'];
};

export type ParsedBulkUpload = {
  rows: BulkMemberRow[];
  errors: string[];
};

const STRING_FIELD_ALIASES: Record<string, 'introducerName' | 'name' | 'contact' | 'firmName'> = {
  'introducer name': 'introducerName',
  introducer: 'introducerName',
  name: 'name',
  'contact number': 'contact',
  contact: 'contact',
  phone: 'contact',
  'phone number': 'contact',
  firm: 'firmName',
  'firm name': 'firmName',
  company: 'firmName',
};

const AMOUNT_HEADERS = new Set(['payment amount', 'amount', 'payment']);
const PAYMENT_TYPE_HEADERS = new Set(['payment type', 'type']);

function normalizeHeader(value: unknown): string {
  return String(value ?? '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

function cellValue(value: unknown): string {
  if (value == null) return '';
  return String(value).trim();
}

function parseAmount(value: unknown): number | null {
  if (value == null || value === '') return null;
  const num = typeof value === 'number' ? value : parseFloat(String(value).replace(/,/g, ''));
  if (Number.isNaN(num) || num <= 0) return null;
  return num;
}

export function parseBulkMemberExcel(buffer: ArrayBuffer): ParsedBulkUpload {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return { rows: [], errors: ['The file has no worksheets.'] };
  }

  const sheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
  if (rawRows.length === 0) {
    return { rows: [], errors: ['The file has no data rows.'] };
  }

  const errors: string[] = [];
  const rows: BulkMemberRow[] = [];

  rawRows.forEach((raw, index) => {
    const rowNumber = index + 2;
    const mapped: Record<string, string> = {};
    let amountRaw: unknown;
    let paymentTypeRaw: unknown;

    for (const [header, value] of Object.entries(raw)) {
      const key = normalizeHeader(header);
      const field = STRING_FIELD_ALIASES[key];
      if (field) mapped[field] = cellValue(value);
      else if (AMOUNT_HEADERS.has(key)) amountRaw = value;
      else if (PAYMENT_TYPE_HEADERS.has(key)) paymentTypeRaw = value;
    }

    const name = mapped.name ?? '';
    const contact = mapped.contact ?? '';
    const introducerName = mapped.introducerName ?? '';
    const firmName = mapped.firmName ?? '';

    if (!name && !contact && !introducerName && !firmName && amountRaw == null && !paymentTypeRaw) {
      return;
    }

    if (!name || !contact) {
      errors.push(`Row ${rowNumber}: Name and Contact Number are required.`);
      return;
    }

    const amount = parseAmount(amountRaw);
    if (amount == null) {
      errors.push(`Row ${rowNumber}: Payment Amount must be a positive number.`);
      return;
    }

    const paymentType = parsePaymentType(paymentTypeRaw);
    if (!paymentType) {
      errors.push(
        `Row ${rowNumber}: Payment Type must be one of: ${PAYMENT_TYPE_LABELS.join(', ')}.`
      );
      return;
    }

    rows.push({
      rowNumber,
      introducerName,
      name,
      contact,
      firmName,
      amount,
      paymentType,
    });
  });

  if (rows.length === 0 && errors.length === 0) {
    errors.push('No valid rows found. Check column headers match the template.');
  }

  return { rows, errors };
}

export type MemberWritePayload = {
  name: string;
  contact: string;
  businessCategory: string;
  firmName: string;
  firmLat: null;
  firmLong: null;
  status: ReturnType<typeof getMemberStatus>;
  nextDue: string;
  addedBy: string;
  addedDate: string;
  pictureUrl: string;
  jskId: number;
  introducerId: string | null;
};

export type PaymentWritePayload = {
  memberName: string;
  jskId: number;
  type: Payment['type'];
  amount: number;
  date: string;
  duration?: number;
};

export type BulkUploadEntry = {
  member: MemberWritePayload;
  payment: PaymentWritePayload;
};

export function buildBulkUploadEntries(
  rows: BulkMemberRow[],
  startingJskId: number,
  introducerLookup: Map<string, string>
): { entries: BulkUploadEntry[]; warnings: string[] } {
  const warnings: string[] = [];
  const entries: BulkUploadEntry[] = [];
  const addedDate = new Date().toISOString();
  const paymentDate = new Date().toISOString();
  const status = getMemberStatus(BULK_MEMBER_NEXT_DUE);

  rows.forEach((row, index) => {
    const introducerId = resolveIntroducerId(row.introducerName, introducerLookup);
    if (row.introducerName.trim() && !introducerId) {
      warnings.push(
        `Row ${row.rowNumber}: Introducer "${row.introducerName}" not found — member will be added without an introducer.`
      );
    }

    const jskId = startingJskId + index + 1;

    entries.push({
      member: {
        name: row.name,
        contact: row.contact,
        businessCategory: '',
        firmName: row.firmName,
        firmLat: null,
        firmLong: null,
        status,
        nextDue: BULK_MEMBER_NEXT_DUE,
        addedBy: 'Bulk Upload',
        addedDate,
        pictureUrl: MEMBER_PLACEHOLDER_PICTURE_URL,
        jskId,
        introducerId,
      },
      payment: {
        memberName: row.name,
        jskId,
        type: row.paymentType,
        amount: row.amount,
        date: paymentDate,
        ...(row.paymentType === 'annual_dues' ? { duration: 1 } : {}),
      },
    });
  });

  return { entries, warnings };
}

