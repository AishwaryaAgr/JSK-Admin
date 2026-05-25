import type { Payment } from '@/lib/firebase';

export type PaymentType = Payment['type'];

export const PAYMENT_TYPE_OPTIONS: { value: PaymentType; label: string }[] = [
  { value: 'annual_dues', label: 'Annual Dues' },
  { value: 'special_offer', label: 'Special Offer' },
];

export const PAYMENT_TYPE_LABELS = PAYMENT_TYPE_OPTIONS.map((o) => o.label);

export function formatPaymentType(type: PaymentType): string {
  return PAYMENT_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type;
}

export function parsePaymentType(value: unknown): PaymentType | null {
  const raw = String(value ?? '')
    .trim()
    .toLowerCase();
  if (!raw) return null;

  const byLabel = PAYMENT_TYPE_OPTIONS.find(
    (o) => o.label.toLowerCase() === raw
  );
  if (byLabel) return byLabel.value;

  if (raw === 'annual_dues' || raw === 'annual') return 'annual_dues';
  if (raw === 'special_offer' || raw === 'special') return 'special_offer';

  return null;
}
