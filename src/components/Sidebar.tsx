'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Users, LayoutDashboard, Settings, Map as MapIcon, PlusSquare, CreditCard, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
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
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <div className={styles.logoIcon}>
          <Users size={28} />
        </div>
        <span className="text-gradient">JSK Admin</span>
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
        <button type="button" className={styles.logoutBtn} onClick={handleLogout}>
          <LogOut size={18} />
          Sign out
        </button>
        <p>&copy; {new Date().getFullYear()} JSK Admin</p>
      </div>
    </aside>
  );
}
