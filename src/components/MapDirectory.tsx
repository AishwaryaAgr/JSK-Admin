'use client';

import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { db, Member } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import styles from '../app/map/page.module.css';

const getStatus = (nextDue: string): 'Active' | 'Pending' | 'Overdue' | 'Inactive' => {
  if (!nextDue) return 'Pending';
  const dueDate = new Date(nextDue);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (dueDate < today) return 'Overdue';
  return 'Active';
};

const icon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

export default function MapDirectory() {
  const [members, setMembers] = useState<Member[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    
    async function fetchMembers() {
      try {
        const querySnapshot = await getDocs(collection(db, 'members'));
        const fetchedMembers: Member[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.firmLat && data.firmLong) {
            fetchedMembers.push({ id: doc.id, ...data } as Member);
          }
        });
        setMembers(fetchedMembers);
      } catch (error) {
        console.error("Error fetching map members: ", error);
      }
    }
    fetchMembers();
  }, []);

  if (!isMounted) {
    return <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading Map Engine...</div>;
  }

  return (
    <MapContainer center={[20.5937, 78.9629]} zoom={5} style={{ height: '100%', width: '100%' }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      {members.map((member) => (
        <Marker key={member.id} position={[member.firmLat!, member.firmLong!]} icon={icon}>
          <Popup>
            <div className={styles.popupContainer}>
              <div className={styles.popupHeader}>
                <div className={styles.popupAvatar}>
                  {member.pictureUrl ? (
                    <img src={member.pictureUrl} alt={member.name} />
                  ) : (
                    member.name.charAt(0).toUpperCase()
                  )}
                </div>
                <div className={styles.popupInfo}>
                  <h3>{member.name}</h3>
                  <p>{member.firmName || 'No Firm'}</p>
                </div>
              </div>
              <div className={styles.popupContact}>
                {member.businessCategory && <p><strong>Category:</strong> {member.businessCategory}</p>}
                <p><strong>Contact:</strong> {member.contact}</p>
                <p><strong>JSK ID:</strong> JSK-{member.jskId}</p>
                <p><strong>Status:</strong> {getStatus(member.nextDue)}</p>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}