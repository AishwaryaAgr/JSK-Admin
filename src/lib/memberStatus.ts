export type MemberStatus = 'Active' | 'Pending' | 'Overdue' | 'Inactive';

export function getMemberStatus(nextDue: string): MemberStatus {
  if (!nextDue) return 'Pending';
  const dueDate = new Date(nextDue);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (dueDate < today) return 'Overdue';
  return 'Active';
}
