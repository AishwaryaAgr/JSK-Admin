'use client';

import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import layoutStyles from '@/app/layout.module.css';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className={layoutStyles.layout}>
      <Sidebar />
      <main className={layoutStyles.mainContent}>{children}</main>
    </div>
  );
}
