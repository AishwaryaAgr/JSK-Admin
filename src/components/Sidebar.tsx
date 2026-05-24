'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Users, LayoutDashboard, Settings, Map as MapIcon, PlusSquare, CreditCard } from 'lucide-react';
import styles from './Sidebar.module.css';

const navItems = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Directory', href: '/directory', icon: Users },
  { name: 'Add Member', href: '/add', icon: PlusSquare },
  { name: 'Payments', href: '/payments', icon: CreditCard },
  { name: 'Map View', href: '/map', icon: MapIcon },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <div className={styles.logoIcon}>
          <Users size={28} />
        </div>
        <span className="text-gradient">ClubHub</span>
      </div>

      <nav className={styles.nav}>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`${styles.navItem} ${isActive ? styles.active : ''}`}
            >
              <Icon size={20} className={styles.icon} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className={styles.footer}>
        <p>&copy; {new Date().getFullYear()} ClubHub</p>
      </div>
    </aside>
  );
}
