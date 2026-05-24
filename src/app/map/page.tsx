'use client';

import dynamic from 'next/dynamic';
import styles from './page.module.css';

const MapDirectory = dynamic(() => import('@/components/MapDirectory'), { ssr: false });

export default function MapPage() {
  return (
    <div className={styles.dashboard}>
      <header className={styles.header}>
        <h1 className={styles.title}>Map Directory</h1>
        <p className={styles.subtitle}>Geographic overview of all club members and their firm locations.</p>
      </header>

      <div className={styles.mapContainer}>
        <MapDirectory />
      </div>
    </div>
  );
}
