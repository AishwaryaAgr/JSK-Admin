'use client';

import { useState, useEffect } from 'react';
import { Building2, Phone, Search, List, Grid } from 'lucide-react';
import styles from '../page.module.css';
import { db, Member } from '@/lib/firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';

const getStatus = (nextDue: string): 'Active' | 'Pending' | 'Overdue' | 'Inactive' => {
  if (!nextDue) return 'Pending';
  const dueDate = new Date(nextDue);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (dueDate < today) return 'Overdue';
  return 'Active';
};

export default function Directory() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'name' | 'addedDate' | 'nextDue'>('addedDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    async function fetchMembers() {
      try {
        const q = query(collection(db, 'members'), orderBy(sortBy, sortOrder));
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
    fetchMembers();
  }, [sortBy, sortOrder]);

  const filteredMembers = members.filter(member => 
    member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.firmName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.businessCategory?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={styles.dashboard}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>Member Directory</h1>
          <div className={styles.controls}>
            <div className={styles.viewToggle}>
              <button 
                onClick={() => setViewMode('grid')}
                className={`${styles.viewButton} ${viewMode === 'grid' ? styles.active : ''}`}
                aria-label="Switch to grid view"
              >
                <Grid size={20} />
              </button>
              <button 
                onClick={() => setViewMode('list')}
                className={`${styles.viewButton} ${viewMode === 'list' ? styles.active : ''}`}
                aria-label="Switch to list view"
              >
                <List size={20} />
              </button>
            </div>
            <div className={styles.sortDropdown}>
              <label htmlFor="sort-select">Sort by:</label>
              <select 
                id="sort-select"
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [by, order] = e.target.value.split('-');
                  setSortBy(by as 'name' | 'addedDate' | 'nextDue');
                  setSortOrder(order as 'asc' | 'desc');
                }}
              >
                <option value="name-asc">Name (A-Z)</option>
                <option value="name-desc">Name (Z-A)</option>
                <option value="addedDate-asc">Date Added (Oldest)</option>
                <option value="addedDate-desc">Date Added (Newest)</option>
                <option value="nextDue-asc">Due Date (Soonest)</option>
                <option value="nextDue-desc">Due Date (Latest)</option>
              </select>
            </div>
          </div>
        </div>
        <p className={styles.subtitle}>Browse and search all club members.</p>
      </header>

      <div style={{ marginBottom: '2rem', display: 'flex', gap: '1rem' }}>
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
            placeholder="Search members by name, firm, or category..." 
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
      </div>

      {loading ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          Loading members...
        </div>
      ) : filteredMembers.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          No members found. Add one from the Add Member page!
        </div>
      ) : (
        <div className={`${styles.membersContainer} ${viewMode === 'grid' ? styles.membersContainerGridView : styles.membersContainerListView}`}>
          {filteredMembers.map(member => (
            <div key={member.id} className={`${styles.memberCard} ${viewMode === 'list' ? styles.memberListItem : ''}`}>
              <div className={viewMode === 'list' ? styles.memberListContent : styles.memberHeader}>
                <div className={styles.avatar}>
                  {member.pictureUrl ? (
                    <img src={member.pictureUrl} alt={member.name} />
                  ) : (
                    member.name.charAt(0).toUpperCase()
                  )}
                </div>
<div className={styles.memberInfo}>
                   <h3>{member.name}</h3>
                   <span className={`${styles.statusBadge} ${styles[`status${getStatus(member.nextDue)}`]}`}>
                     {getStatus(member.nextDue)}
                   </span>
                 </div>
              </div>
              
              {viewMode === 'list' ? (
                <div className={styles.memberDetails}>
                  <div className={styles.detailRow}>
                    <Building2 size={16} />
                    <span>{member.firmName || 'No Firm'} ({member.businessCategory || 'Uncategorized'})</span>
                  </div>
                  <div className={styles.detailRow}>
                    <Phone size={16} />
                    <span>{member.contact}</span>
                  </div>
                  <div className={styles.detailRow}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>JSK ID: JSK-{member.jskId}</span>
                  </div>
                </div>
              ) : (
                <div className={styles.memberDetails}>
                  <div className={styles.detailRow}>
                    <Building2 size={16} />
                    <span>{member.firmName || 'No Firm'} ({member.businessCategory || 'Uncategorized'})</span>
                  </div>
                  <div className={styles.detailRow}>
                    <Phone size={16} />
                    <span>{member.contact}</span>
                  </div>
                  <div className={styles.detailRow}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>JSK ID: JSK-{member.jskId}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
