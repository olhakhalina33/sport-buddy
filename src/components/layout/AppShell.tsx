import { Outlet } from 'react-router-dom';
import { BottomNav } from '../ui/BottomNav';
import { ThemeToggle } from '../ui/ThemeToggle';
import { useAuth } from '../../hooks/useAuth';
import { signOut } from '../../api/auth';
import { Avatar } from '../ui/Avatar';

export function AppShell() {
  const { profile } = useAuth();
  return (
    <div className="mx-auto min-h-dvh max-w-app">
      <header className="flex items-center justify-between px-6 pt-4">
        <span className="text-p font-bold text-brand">Sport Buddy</span>
        <div className="flex items-center gap-2">
          {profile && <Avatar user={profile} size="sm" />}
          <ThemeToggle />
          <button
            type="button"
            onClick={() => signOut()}
            className="rounded-lg px-2 py-2 text-p text-muted hover:text-fg"
          >
            Вийти
          </button>
        </div>
      </header>
      <main className="px-6 pb-28 pt-4">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
