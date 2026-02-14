'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data, error }) => {
      if (error || !data?.user) {
        router.push('/login');
      } else {
        setUser(data.user);
      }
      setLoading(false);
    });
  }, [router]);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <div className="text-gray-400 text-sm">Loading...</div>
      </div>
    );
  }

  if (!user) return null;

  const navItems = [
    { href: '/dashboard', label: 'Overview', icon: '📊' },
    { href: '/dashboard/new', label: 'New Reconciliation', icon: '🔍' },
    { href: '/dashboard/history', label: 'Past Reports', icon: '📁' },
  ];

  const userName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';

  return (
    <div className="min-h-screen bg-[var(--bg)] flex">
      {/* Sidebar */}
      <aside className="w-60 border-r border-gray-800 flex flex-col">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-gray-800">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-blue-500 flex items-center justify-center text-white font-black text-xs">R</div>
            <span className="text-base font-extrabold text-white tracking-tight">Reconcile<span className="text-blue-400">OS</span></span>
          </Link>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  isActive ? 'bg-blue-500/15 text-blue-400' : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                }`}>
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="px-4 py-4 border-t border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-white truncate max-w-[120px]">{userName}</div>
              <div className="text-xs text-gray-500 truncate max-w-[120px]">{user.email}</div>
            </div>
            <button onClick={handleLogout} className="text-xs text-gray-500 hover:text-red-400 transition" title="Log out">
              ↪ Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
