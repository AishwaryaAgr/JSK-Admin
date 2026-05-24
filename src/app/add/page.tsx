'use client';

import { useState, useEffect, useRef } from 'react';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Save } from 'lucide-react';
import dynamic from 'next/dynamic';
import styles from './page.module.css';

const MapPicker = dynamic(() => import('@/components/MapPicker'), { ssr: false });

const getNextJskId = async () => {
  const querySnapshot = await getDocs(collection(db, 'members'));
  return querySnapshot.size + 1;
};

const calculateStatus = (nextDue: string): 'Active' | 'Pending' | 'Overdue' | 'Inactive' => {
  if (!nextDue) return 'Pending';
  const dueDate = new Date(nextDue);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (dueDate < today) return 'Overdue';
  return 'Active';
};

type MemberOption = {
  id: string;
  jskId: number;
  name: string;
};

export default function AddMember() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedJskId, setSelectedJskId] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<{lat: number, lng: number} | null>(null);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIntroducer, setSelectedIntroducer] = useState<MemberOption | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMembers();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchMembers = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'members'));
      const fetchedMembers: MemberOption[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        fetchedMembers.push({
          id: doc.id,
          jskId: data.jskId,
          name: data.name,
        });
      });
      setMembers(fetchedMembers);
    } catch (err) {
      console.error('Error fetching members:', err);
    }
  };

  const filteredMembers = members.filter(member =>
    member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    `JSK-${member.jskId}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const shouldShowDropdown = showDropdown && searchTerm.trim().length >= 1;

  const handleSelectIntroducer = (member: MemberOption) => {
    setSelectedIntroducer(member);
    setSearchTerm(`JSK-${member.jskId} - ${member.name}`);
    setShowDropdown(false);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const form = e.currentTarget;
    const formData = new FormData(form);

    try {
      let pictureUrl = null;
      const file = formData.get('picture') as File;

      if (file && file.size > 0) {
        const fileRef = ref(storage, `members/${Date.now()}_${file.name}`);
        const snapshot = await uploadBytes(fileRef, file);
        pictureUrl = await getDownloadURL(snapshot.ref);
      }

      const jskId = await getNextJskId();
      const nextDue = formData.get('nextDue') as string;
      const status = calculateStatus(nextDue);

      const memberData = {
        name: formData.get('name') as string,
        contact: formData.get('contact') as string,
        businessCategory: formData.get('businessCategory') as string,
        firmName: formData.get('firmName') as string,
        firmLat: parseFloat(formData.get('firmLat') as string) || null,
        firmLong: parseFloat(formData.get('firmLong') as string) || null,
        status,
        nextDue,
        addedBy: 'Admin',
        addedDate: new Date().toISOString(),
        pictureUrl,
        jskId,
        introducerId: selectedIntroducer ? `JSK-${selectedIntroducer.jskId}` : null,
      };

      await addDoc(collection(db, 'members'), memberData);

      setSelectedJskId(`JSK-${jskId}`);
      setSuccess('Member added successfully!');
      setSelectedLocation(null);
      setSelectedIntroducer(null);
      setSearchTerm('');
      form.reset();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to add member.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Add New Member</h1>
        <p className={styles.subtitle}>Enter the details to register a new club member.</p>
      </header>

      {error && <div className={styles.error}>{error}</div>}
      {success && <div className={styles.success}>{success}</div>}

      <form className={styles.formCard} onSubmit={handleSubmit}>
        <div className={styles.formGrid}>
          <div className={styles.formGroup} ref={dropdownRef}>
            <label className={styles.label}>Introducer (Optional)</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={searchTerm}
onChange={(e) => {
                   setSearchTerm(e.target.value);
                   if (e.target.value.trim().length >= 1) setShowDropdown(true);
                 }}
                 onFocus={() => { if (searchTerm.trim().length >= 1) setShowDropdown(true); }}
                className={styles.input}
                placeholder="Search by name or JSK ID"
              />
              {shouldShowDropdown && (
                <div className={styles.dropdown}>
                  {filteredMembers.length > 0 ? (
                    filteredMembers.map((member) => (
                      <div
                        key={member.id}
                        className={styles.dropdownItem}
                        onClick={() => handleSelectIntroducer(member)}
                      >
                        JSK-{member.jskId} - {member.name}
                      </div>
                    ))
                  ) : (
                    <div className={styles.dropdownItem}>No members found</div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Name *</label>
            <input required type="text" name="name" className={styles.input} placeholder="Jane Doe" />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Contact (Email/Phone) *</label>
            <input required type="text" name="contact" className={styles.input} placeholder="jane@example.com" />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Firm Name</label>
            <input type="text" name="firmName" className={styles.input} placeholder="Acme Corp" />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Business Category</label>
            <input type="text" name="businessCategory" className={styles.input} placeholder="Technology" />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Next Due Date</label>
            <input type="date" name="nextDue" className={styles.input} />
          </div>

          <div className={`${styles.formGroup} ${styles.fullWidth}`}>
            <label className={styles.label}>Profile Picture</label>
            <input type="file" name="picture" accept="image/*" className={styles.fileInput} />
          </div>

          <div className={`${styles.formGroup} ${styles.fullWidth}`}>
            <label className={styles.label}>Firm Location (Click map to drop pin)</label>
            <MapPicker onLocationSelect={(lat, lng) => setSelectedLocation({ lat, lng })} />
            <input type="hidden" name="firmLat" value={selectedLocation?.lat || ''} />
            <input type="hidden" name="firmLong" value={selectedLocation?.lng || ''} />
            {selectedLocation && (
              <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                Selected: {selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)}
              </span>
            )}
          </div>
        </div>

        <button type="submit" className={styles.submitBtn} disabled={loading}>
          {loading ? 'Saving...' : <><Save size={20} style={{ marginRight: '0.5rem' }} /> Save Member</>}
        </button>
      </form>

      {selectedJskId && (
        <div className={styles.modalOverlay} onClick={() => setSelectedJskId(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Member Added Successfully!</h2>
            <p className={styles.modalText}>Your JSK ID is:</p>
            <p className={styles.jskIdDisplay}>{selectedJskId}</p>
            <button className={styles.modalBtn} onClick={() => setSelectedJskId(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}