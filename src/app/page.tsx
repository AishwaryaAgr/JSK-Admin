'use client';

import { useState, useEffect } from 'react';
import { Users, Briefcase, AlertCircle, Building2, Phone } from 'lucide-react';
import styles from './page.module.css';
import { db, Member } from '@/lib/firebase';
import { getMemberStatus } from '@/lib/memberStatus';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';

export default function Home() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRecentMembers() {
      try {
        const q = query(collection(db, 'members'), orderBy('addedDate', 'desc'), limit(6));
        const querySnapshot = await getDocs(q);
        const fetchedMembers: Member[] = [];
        querySnapshot.forEach((doc) => {
          fetchedMembers.push({ id: doc.id, ...doc.data() } as Member);
        });
        setMembers(fetchedMembers);
      } catch (error) {
        console.error("Error fetching members: ", error);
      } finally {
        setLoading(false);
      }
    }
    fetchRecentMembers();
  }, []);

  // Compute stats client-side for now based on fetched (ideally this is done via aggregation queries if DB is huge)
  const totalMembers = members.length; // Note: this only counts recent 6. Real app needs count()
  const pendingOverdue = members.filter(m => {
    const status = getMemberStatus(m.nextDue);
    return status === 'Pending' || status === 'Overdue';
  }).length;

  return (
    <div className={styles.dashboard}>
      <header className={styles.header}>
        <h1 className={styles.title}>Dashboard</h1>
        <p className={styles.subtitle}>Overview of your club members and activities.</p>
      </header>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <Users size={24} />
          </div>
          <div className={styles.statInfo}>
            <div className={styles.statValue}>{loading ? '-' : `${totalMembers}+`}</div>
            <div className={styles.statLabel}>Recent Additions</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <Briefcase size={24} />
          </div>
          <div className={styles.statInfo}>
            <div className={styles.statValue}>...</div>
            <div className={styles.statLabel}>Business Categories</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ color: '#eab308', backgroundColor: 'rgba(234, 179, 8, 0.1)' }}>
            <AlertCircle size={24} />
          </div>
          <div className={styles.statInfo}>
            <div className={styles.statValue}>{loading ? '-' : pendingOverdue}</div>
            <div className={styles.statLabel}>Recent Pending/Overdue</div>
          </div>
        </div>
      </div>

      <section className={styles.membersSection}>
        <div className={styles.sectionHeader}>
          <h2>Recently Added Members</h2>
        </div>
        
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Loading data...
          </div>
        ) : members.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            No members found in database.
          </div>
        ) : (
          <div className={styles.membersGrid}>
            {members.map(member => {
              const status = getMemberStatus(member.nextDue);
              return (
              <div key={member.id} className={styles.memberCard}>
                <div className={styles.memberHeader}>
                  <div className={styles.avatar}>
                    {member.pictureUrl ? (
                      <img src={member.pictureUrl} alt={member.name} />
                    ) : (
                      member.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className={styles.memberInfo}>
                    <h3>{member.name}</h3>
                    <span className={`${styles.statusBadge} ${styles[`status${status}`]}`}>
                      {status}
                    </span>
                  </div>
                </div>
                
                <div className={styles.memberDetails}>
                  <div className={styles.detailRow}>
                    <Building2 size={16} />
                    <span>{member.firmName || 'No Firm'} ({member.businessCategory || 'Uncategorized'})</span>
                  </div>
                  <div className={styles.detailRow}>
                    <Phone size={16} />
                    <span>{member.contact}</span>
                  </div>
                </div>
              </div>
            );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
