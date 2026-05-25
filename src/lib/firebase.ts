import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getFirestore(app);
export const storage = getStorage(app);

export type Member = {
  id: string;
  name: string;
  contact: string;
  addedBy: string;
  addedDate: string;
  nextDue: string;
  status: 'Active' | 'Pending' | 'Overdue' | 'Inactive';
  firmName: string;
  firmLat: number | null;
  firmLong: number | null;
  businessCategory: string;
  pictureUrl: string | null;
  jskId: string;
  introducerId: string | null;
};

export type Payment = {
  id: string;
  memberId: string;
  memberName: string;
  jskId: string;
  type: 'annual_dues' | 'special_offer';
  amount: number;
  date: string;
  duration?: number;
  notes?: string;
};