'use client';

import { useState, useEffect } from 'react';
import { db, Member, Payment } from '@/lib/firebase';
import { collection, getDocs, addDoc, updateDoc, doc, query, orderBy, limit, startAfter } from 'firebase/firestore';
import { Search, Plus, Calendar, DollarSign } from 'lucide-react';
import BulkUploadMembers from '@/components/BulkUploadMembers';
import { PAYMENT_TYPE_OPTIONS, formatPaymentType } from '@/lib/paymentTypes';
import styles from './page.module.css';

const ITEMS_PER_PAGE = 10;

export default function Payments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showAddForm, setShowAddForm] = useState(false);
  const [lastVisible, setLastVisible] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);

  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [paymentType, setPaymentType] = useState<'annual_dues' | 'special_offer'>('annual_dues');
  const [amount, setAmount] = useState('');
  const [duration, setDuration] = useState('1');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchMembers();
    fetchPayments();
  }, []);

  const fetchMembers = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'members'));
      const fetchedMembers: Member[] = [];
      querySnapshot.forEach((doc) => {
        fetchedMembers.push({ id: doc.id, ...doc.data() } as Member);
      });
      setMembers(fetchedMembers);
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  };

  const refreshAfterBulkUpload = async () => {
    await fetchMembers();
    setPayments([]);
    setLastVisible(null);
    setHasMore(true);
    await fetchPayments();
  };

  const fetchPayments = async (reset = false) => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'payments'),
        orderBy('date', sortOrder),
        limit(ITEMS_PER_PAGE)
      );

      const querySnapshot = await getDocs(q);
      const fetchedPayments: Payment[] = [];

      querySnapshot.forEach((doc) => {
        fetchedPayments.push({ id: doc.id, ...doc.data() } as Payment);
      });

      setPayments(fetchedPayments);
      setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1]);
      setHasMore(querySnapshot.docs.length === ITEMS_PER_PAGE);
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (!lastVisible || loading) return;

    setLoading(true);
    try {
      const q = query(
        collection(db, 'payments'),
        orderBy('date', sortOrder),
        startAfter(lastVisible),
        limit(ITEMS_PER_PAGE)
      );

      const querySnapshot = await getDocs(q);
      const fetchedPayments: Payment[] = [];

      querySnapshot.forEach((doc) => {
        fetchedPayments.push({ id: doc.id, ...doc.data() } as Payment);
      });

      setPayments(prev => [...prev, ...fetchedPayments]);
      setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1]);
      setHasMore(querySnapshot.docs.length === ITEMS_PER_PAGE);
    } catch (error) {
      console.error('Error loading more payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSortChange = async () => {
    const newOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    setSortOrder(newOrder);
    setPayments([]);
    setLastVisible(null);
    setHasMore(true);
    await new Promise(resolve => setTimeout(resolve, 100));
    await fetchPayments();
  };

  const handleAddPayment = async () => {
    if (!selectedMemberId || !amount) return;

    const selectedMember = members.find(m => m.id === selectedMemberId);
    if (!selectedMember) return;

    try {
      const paymentData: any = {
        memberId: selectedMemberId,
        memberName: selectedMember.name,
        jskId: selectedMember.jskId,
        type: paymentType,
        amount: parseFloat(amount),
        date: new Date().toISOString(),
        notes: notes.trim() || undefined,
      };

      if (paymentType === 'annual_dues') {
        const years = parseInt(duration, 10) || 1;
        paymentData.duration = years;
        
        const currentDue = new Date(selectedMember.nextDue);
        const newDue = new Date(currentDue.setFullYear(currentDue.getFullYear() + years)).toISOString();

        await updateDoc(doc(db, 'members', selectedMemberId), {
          nextDue: newDue,
        });
      }

      await addDoc(collection(db, 'payments'), paymentData);

      setSelectedMemberId('');
      setPaymentType('annual_dues');
      setAmount('');
      setDuration('1');
      setNotes('');
      setShowAddForm(false);
      fetchPayments();
    } catch (error) {
      console.error('Error adding payment:', error);
    }
  };

  const filteredPayments = payments.filter(payment =>
    payment.memberName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    `JSK-${payment.jskId}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Membership Payments</h1>
        <p className={styles.subtitle}>Record and manage member payments.</p>
      </header>

      <BulkUploadMembers onComplete={refreshAfterBulkUpload} />

      <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <div style={{ 
          flex: 1, 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.5rem', 
          padding: '0.75rem 1rem', 
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)'
        }}>
          <Search size={20} color="var(--text-secondary)" />
          <input 
            type="text" 
            placeholder="Search payments by member name or JSK ID..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ 
              border: 'none', 
              background: 'none', 
              outline: 'none', 
              width: '100%',
              color: 'var(--text-primary)',
              fontSize: '1rem'
            }} 
          />
        </div>
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: 'var(--accent-color)',
            color: '#fff',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <Plus size={20} /> Add Payment
        </button>
      </div>

      {showAddForm && (
        <div className={styles.formCard} style={{ marginBottom: '1.5rem' }}>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Member *</label>
              <select 
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(e.target.value)}
                className={styles.select}
              >
                <option value="">Select a member</option>
                {members.map(member => (
                  <option key={member.id} value={member.id}>
                    JSK-{member.jskId} - {member.name}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Payment Type *</label>
              <select 
                value={paymentType}
                onChange={(e) => setPaymentType(e.target.value as 'annual_dues' | 'special_offer')}
                className={styles.select}
              >
                {PAYMENT_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Amount *</label>
              <input 
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={styles.input}
                placeholder="0.00"
                step="0.01"
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Notes</label>
              <input 
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className={styles.input}
                placeholder="Optional notes"
              />
            </div>

            {paymentType === 'annual_dues' && (
              <div className={styles.formGroup}>
                <label className={styles.label}>Duration (Years) *</label>
                <input 
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className={styles.input}
                  placeholder="1"
                  min="1"
                />
              </div>
            )}
          </div>

          <div style={{ marginTop: '1rem' }}>
            <button 
              onClick={handleAddPayment}
              style={{
                padding: '0.75rem 2rem',
                backgroundColor: 'var(--accent-color)',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                marginRight: '1rem'
              }}
            >
              Save Payment
            </button>
            <button 
              onClick={() => setShowAddForm(false)}
              style={{
                padding: '0.75rem 2rem',
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Payment History</h2>
        <button 
          onClick={handleSortChange}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <Calendar size={16} />
          Sort: {sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}
        </button>
      </div>

      {loading && payments.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          Loading payments...
        </div>
      ) : filteredPayments.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          {searchQuery ? 'No payments match your search.' : 'No payments recorded yet. Add your first payment above.'}
        </div>
      ) : (
        <>
          <div style={{ 
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-primary)' }}>
                  <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>Member</th>
                  <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>Type</th>
                  <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>Duration</th>
                  <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>Amount</th>
                  <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>Date</th>
                  <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>Notes</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map((payment) => (
                  <tr key={payment.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '1rem' }}>
                      <div>
                        <strong>{payment.memberName}</strong>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                          JSK-{payment.jskId}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.875rem',
                        backgroundColor: payment.type === 'annual_dues' ? 'var(--status-active-bg)' : 'var(--bg-primary)',
                        color: payment.type === 'annual_dues' ? 'var(--status-active-text)' : 'var(--text-secondary)'
                      }}>
                        {formatPaymentType(payment.type)}
                      </span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {payment.duration ? `${payment.duration} year${payment.duration > 1 ? 's' : ''}` : '-'}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <DollarSign size={16} />
                        {payment.amount.toFixed(2)}
                      </div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Calendar size={16} />
                        {new Date(payment.date).toLocaleDateString()}
                      </div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {payment.notes || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {hasMore && (
            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
              <button 
                onClick={loadMore}
                disabled={loading}
                style={{
                  padding: '0.75rem 2rem',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer'
                }}
              >
                {loading ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}