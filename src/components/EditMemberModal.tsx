'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Save } from 'lucide-react';
import dynamic from 'next/dynamic';
import { db, storage, Member } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getMemberStatus } from '@/lib/memberStatus';
import { toDateInputValue } from '@/lib/memberForm';
import formStyles from '@/app/add/page.module.css';

const MapPicker = dynamic(() => import('@/components/MapPicker'), { ssr: false });

type IntroducerOption = {
  id: string;
  jskId: number;
  name: string;
};

type EditMemberModalProps = {
  member: Member;
  allMembers: Member[];
  onClose: () => void;
  onSaved: () => void;
};

export default function EditMemberModal({
  member,
  allMembers,
  onClose,
  onSaved,
}: EditMemberModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contact, setContact] = useState(member.contact);
  const [firmName, setFirmName] = useState(member.firmName ?? '');
  const [businessCategory, setBusinessCategory] = useState(member.businessCategory ?? '');
  const [nextDue, setNextDue] = useState(toDateInputValue(member.nextDue));
  const [pictureUrl, setPictureUrl] = useState(member.pictureUrl ?? '');
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(
    member.firmLat != null && member.firmLong != null
      ? { lat: member.firmLat, lng: member.firmLong }
      : null
  );
  const [introducerSearch, setIntroducerSearch] = useState('');
  const [showIntroducerDropdown, setShowIntroducerDropdown] = useState(false);
  const [selectedIntroducer, setSelectedIntroducer] = useState<IntroducerOption | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const introducerOptions = allMembers.filter((m) => m.id !== member.id);

  useEffect(() => {
    if (!member.introducerId) {
      setSelectedIntroducer(null);
      setIntroducerSearch('');
      return;
    }
    const match = allMembers.find(
      (m) => m.id !== member.id && `JSK-${m.jskId}` === member.introducerId
    );
    if (match) {
      setSelectedIntroducer({ id: match.id, jskId: match.jskId, name: match.name });
      setIntroducerSearch(`JSK-${match.jskId} - ${match.name}`);
    }
  }, [member.introducerId, member.id, allMembers]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowIntroducerDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredIntroducers = introducerOptions.filter(
    (m) =>
      m.name.toLowerCase().includes(introducerSearch.toLowerCase()) ||
      `JSK-${m.jskId}`.toLowerCase().includes(introducerSearch.toLowerCase())
  );

  const handleSelectIntroducer = (option: IntroducerOption) => {
    setSelectedIntroducer(option);
    setIntroducerSearch(`JSK-${option.jskId} - ${option.name}`);
    setShowIntroducerDropdown(false);
  };

  const clearIntroducer = () => {
    setSelectedIntroducer(null);
    setIntroducerSearch('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let updatedPictureUrl = pictureUrl || null;
      const fileInput = (e.target as HTMLFormElement).elements.namedItem('picture') as HTMLInputElement;
      const file = fileInput?.files?.[0];
      if (file && file.size > 0) {
        const fileRef = ref(storage, `members/${Date.now()}_${file.name}`);
        const snapshot = await uploadBytes(fileRef, file);
        updatedPictureUrl = await getDownloadURL(snapshot.ref);
      }

      const dueIso = nextDue ? new Date(nextDue).toISOString() : '';
      await updateDoc(doc(db, 'members', member.id), {
        contact: contact.trim(),
        firmName: firmName.trim(),
        businessCategory: businessCategory.trim(),
        nextDue: dueIso,
        status: getMemberStatus(dueIso),
        pictureUrl: updatedPictureUrl,
        firmLat: selectedLocation?.lat ?? null,
        firmLong: selectedLocation?.lng ?? null,
        introducerId: selectedIntroducer ? `JSK-${selectedIntroducer.jskId}` : null,
      });

      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to update member.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={formStyles.modalOverlay} onClick={onClose}>
      <div
        className={`${formStyles.modal} ${formStyles.editModal}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="edit-member-title"
      >
        <div className={formStyles.editModalHeader}>
          <div>
            <h2 id="edit-member-title" className={formStyles.modalTitle} style={{ textAlign: 'left' }}>
              Edit Member
            </h2>
            <p className={formStyles.modalText} style={{ textAlign: 'left', marginBottom: 0 }}>
              {member.name} · JSK-{member.jskId}
            </p>
          </div>
          <button type="button" className={formStyles.iconBtn} onClick={onClose} aria-label="Close">
            <X size={22} />
          </button>
        </div>

        {error && <div className={formStyles.error}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className={formStyles.formGrid}>
            <div className={`${formStyles.formGroup} ${formStyles.fullWidth}`}>
              <label className={formStyles.label}>Name</label>
              <input type="text" className={formStyles.input} value={member.name} disabled />
            </div>

            <div className={`${formStyles.formGroup} ${formStyles.fullWidth}`}>
              <label className={formStyles.label}>JSK ID</label>
              <input type="text" className={formStyles.input} value={`JSK-${member.jskId}`} disabled />
            </div>

            <div className={formStyles.formGroup} ref={dropdownRef}>
              <label className={formStyles.label}>Introducer (Optional)</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={introducerSearch}
                  onChange={(e) => {
                    setIntroducerSearch(e.target.value);
                    if (e.target.value.trim().length >= 1) setShowIntroducerDropdown(true);
                  }}
                  onFocus={() => {
                    if (introducerSearch.trim().length >= 1) setShowIntroducerDropdown(true);
                  }}
                  className={formStyles.input}
                  placeholder="Search by name or JSK ID"
                />
                {showIntroducerDropdown && introducerSearch.trim().length >= 1 && (
                  <div className={formStyles.dropdown}>
                    {filteredIntroducers.length > 0 ? (
                      filteredIntroducers.map((m) => (
                        <div
                          key={m.id}
                          className={formStyles.dropdownItem}
                          onClick={() =>
                            handleSelectIntroducer({ id: m.id, jskId: m.jskId, name: m.name })
                          }
                        >
                          JSK-{m.jskId} - {m.name}
                        </div>
                      ))
                    ) : (
                      <div className={formStyles.dropdownItem}>No members found</div>
                    )}
                  </div>
                )}
              </div>
              {selectedIntroducer && (
                <button type="button" className={formStyles.linkBtn} onClick={clearIntroducer}>
                  Clear introducer
                </button>
              )}
            </div>

            <div className={formStyles.formGroup}>
              <label className={formStyles.label}>Contact *</label>
              <input
                required
                type="text"
                className={formStyles.input}
                value={contact}
                onChange={(e) => setContact(e.target.value)}
              />
            </div>

            <div className={formStyles.formGroup}>
              <label className={formStyles.label}>Added On</label>
              <input
                type="text"
                className={formStyles.input}
                value={
                  member.addedDate
                    ? new Date(member.addedDate).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })
                    : '—'
                }
                disabled
              />
            </div>

            <div className={formStyles.formGroup}>
              <label className={formStyles.label}>Firm Name</label>
              <input
                type="text"
                className={formStyles.input}
                value={firmName}
                onChange={(e) => setFirmName(e.target.value)}
              />
            </div>

            <div className={formStyles.formGroup}>
              <label className={formStyles.label}>Business Category</label>
              <input
                type="text"
                className={formStyles.input}
                value={businessCategory}
                onChange={(e) => setBusinessCategory(e.target.value)}
              />
            </div>

            <div className={formStyles.formGroup}>
              <label className={formStyles.label}>Next Due Date</label>
              <input
                type="date"
                className={formStyles.input}
                value={nextDue}
                onChange={(e) => setNextDue(e.target.value)}
              />
            </div>

            <div className={`${formStyles.formGroup} ${formStyles.fullWidth}`}>
              <label className={formStyles.label}>Profile Picture</label>
              {pictureUrl && (
                <div className={formStyles.currentPhoto}>
                  <img src={pictureUrl} alt={member.name} />
                </div>
              )}
              <input type="file" name="picture" accept="image/*" className={formStyles.fileInput} />
            </div>

            <div className={`${formStyles.formGroup} ${formStyles.fullWidth}`}>
              <label className={formStyles.label}>Firm Location</label>
              <MapPicker
                defaultLat={selectedLocation?.lat}
                defaultLng={selectedLocation?.lng}
                onLocationSelect={(lat, lng) => setSelectedLocation({ lat, lng })}
              />
              {selectedLocation && (
                <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  Selected: {selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)}
                </span>
              )}
              {selectedLocation && (
                <button
                  type="button"
                  className={formStyles.linkBtn}
                  onClick={() => setSelectedLocation(null)}
                >
                  Clear location
                </button>
              )}
            </div>
          </div>

          <div className={formStyles.editModalFooter}>
            <button type="button" className={formStyles.secondaryBtn} onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className={formStyles.submitBtn} disabled={loading} style={{ marginTop: 0, width: 'auto' }}>
              {loading ? 'Saving…' : (
                <>
                  <Save size={20} style={{ marginRight: '0.5rem' }} /> Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
