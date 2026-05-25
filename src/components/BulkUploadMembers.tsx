'use client';

import { useRef, useState } from 'react';
import { Download, Upload, FileSpreadsheet } from 'lucide-react';
import { db } from '@/lib/firebase';
import {
  parseBulkMemberExcel,
  buildBulkUploadEntries,
  formatPaymentType,
  type BulkMemberRow,
} from '@/lib/bulkMemberUpload';
import { buildIntroducerIdLookup } from '@/lib/introducer';
import { BULK_MEMBER_NEXT_DUE } from '@/lib/memberConstants';
import { downloadBulkMemberTemplate } from '@/lib/bulkMemberTemplate';
import { PAYMENT_TYPE_LABELS } from '@/lib/paymentTypes';
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import styles from '@/app/payments/bulk.module.css';

const BATCH_LIMIT = 250;

type BulkUploadMembersProps = {
  onComplete: () => void;
};

async function getMaxJskId(): Promise<number> {
  const snapshot = await getDocs(collection(db, 'members'));
  let max = 0;
  snapshot.forEach((d) => {
    const jskId = d.data().jskId;
    if (typeof jskId === 'number' && jskId > max) max = jskId;
  });
  return max;
}

export default function BulkUploadMembers({ onComplete }: BulkUploadMembersProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [rows, setRows] = useState<BulkMemberRow[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const resetPreview = () => {
    setRows([]);
    setParseErrors([]);
    setWarnings([]);
    setFileName(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setMessage(null);
    setWarnings([]);
    if (!file) return;

    const validExt = /\.(xlsx|xls|csv)$/i.test(file.name);
    if (!validExt) {
      setParseErrors(['Please upload an Excel file (.xlsx, .xls) or .csv.']);
      setRows([]);
      return;
    }

    setFileName(file.name);
    try {
      const buffer = await file.arrayBuffer();
      const { rows: parsed, errors } = parseBulkMemberExcel(buffer);
      setRows(parsed);
      setParseErrors(errors);
    } catch {
      setParseErrors(['Could not read the file. Ensure it is a valid Excel workbook.']);
      setRows([]);
    }
  };

  const handleUpload = async () => {
    if (rows.length === 0 || parseErrors.length > 0) return;

    setUploading(true);
    setMessage(null);
    setWarnings([]);

    try {
      const snapshot = await getDocs(collection(db, 'members'));
      const existing = snapshot.docs.map((d) => ({
        name: d.data().name as string,
        jskId: d.data().jskId as number,
      }));

      const maxJskId = await getMaxJskId();
      const introducerLookup = buildIntroducerIdLookup(existing);
      const { entries, warnings: uploadWarnings } = buildBulkUploadEntries(
        rows,
        maxJskId,
        introducerLookup
      );
      setWarnings(uploadWarnings);

      for (let i = 0; i < entries.length; i += BATCH_LIMIT) {
        const chunk = entries.slice(i, i + BATCH_LIMIT);
        const batch = writeBatch(db);

        chunk.forEach(({ member, payment }) => {
          const memberRef = doc(collection(db, 'members'));
          batch.set(memberRef, member);
          batch.set(doc(collection(db, 'payments')), {
            ...payment,
            memberId: memberRef.id,
          });
        });

        await batch.commit();
      }

      setMessage({
        type: 'success',
        text: `Successfully added ${entries.length} member${entries.length === 1 ? '' : 's'} with payment records.`,
      });
      resetPreview();
      onComplete();
    } catch (err) {
      console.error(err);
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Bulk upload failed. Please try again.',
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <section className={styles.bulkSection}>
      <div className={styles.bulkHeader}>
        <h2 className={styles.bulkTitle}>
          <FileSpreadsheet size={18} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.5rem' }} />
          Bulk upload members &amp; payments
        </h2>
        <div className={styles.bulkActions}>
          <button
            type="button"
            className={styles.bulkBtn}
            onClick={() => void downloadBulkMemberTemplate()}
          >
            <Download size={16} />
            Download template
          </button>
          <button
            type="button"
            className={styles.bulkBtn}
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? 'Hide' : 'Show'} upload
          </button>
        </div>
      </div>

      <p className={styles.bulkHint}>
        Upload an Excel file with: <strong>Introducer Name</strong>, <strong>Name</strong>,{' '}
        <strong>Contact Number</strong>, optional <strong>Firm</strong>, <strong>Payment Amount</strong>, and{' '}
        <strong>Payment Type</strong> ({PAYMENT_TYPE_LABELS.join(' or ')} — use the dropdown in the template). Due date is set to 1/1/2027; other fields
        use defaults. Introducer is matched by name to existing members.
      </p>

      {expanded && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className={styles.bulkFileInput}
            onChange={handleFileChange}
          />
          <div className={styles.bulkFooter} style={{ marginTop: '1rem' }}>
            <button
              type="button"
              className={`${styles.bulkBtn} ${styles.bulkBtnPrimary}`}
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <Upload size={16} />
              Choose Excel file
            </button>
            {rows.length > 0 && parseErrors.length === 0 && (
              <button
                type="button"
                className={`${styles.bulkBtn} ${styles.bulkBtnPrimary}`}
                onClick={handleUpload}
                disabled={uploading}
              >
                {uploading ? 'Uploading…' : `Upload ${rows.length} rows`}
              </button>
            )}
            {(rows.length > 0 || fileName) && (
              <button
                type="button"
                className={styles.bulkBtn}
                onClick={() => {
                  resetPreview();
                  setMessage(null);
                  setWarnings([]);
                }}
                disabled={uploading}
              >
                Clear
              </button>
            )}
          </div>

          {fileName && (
            <p className={styles.bulkHint} style={{ marginTop: '0.5rem' }}>
              Selected: {fileName}
              {rows.length > 0 && ` · ${rows.length} row(s) · Due date: ${BULK_MEMBER_NEXT_DUE}`}
            </p>
          )}

          {parseErrors.length > 0 && (
            <div className={`${styles.bulkMessage} ${styles.bulkError}`}>
              <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
                {parseErrors.map((err) => (
                  <li key={err}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {warnings.length > 0 && (
            <ul className={styles.bulkWarningList}>
              {warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          )}

          {message && (
            <div
              className={`${styles.bulkMessage} ${
                message.type === 'success' ? styles.bulkSuccess : styles.bulkError
              }`}
            >
              {message.text}
            </div>
          )}

          {rows.length > 0 && parseErrors.length === 0 && (
            <div className={styles.bulkPreview}>
              <p className={styles.bulkPreviewTitle}>Preview ({rows.length} rows)</p>
              <div className={styles.bulkTableWrap}>
                <table className={styles.bulkTable}>
                  <thead>
                    <tr>
                      <th>Row</th>
                      <th>Introducer</th>
                      <th>Name</th>
                      <th>Contact</th>
                      <th>Firm</th>
                      <th>Amount</th>
                      <th>Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.rowNumber}>
                        <td>{row.rowNumber}</td>
                        <td>{row.introducerName || '—'}</td>
                        <td>{row.name}</td>
                        <td>{row.contact}</td>
                        <td>{row.firmName || '—'}</td>
                        <td>{row.amount.toFixed(2)}</td>
                        <td>{formatPaymentType(row.paymentType)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
