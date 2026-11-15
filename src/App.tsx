import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { isConfigured } from './api/supabase';
import { AuthPage } from './features/auth/AuthPage';
import { AppShell } from './components/layout/AppShell';
import { ListSkeleton } from './components/ui/Skeleton';
import { SearchPage } from './features/search/SearchPage';
import { CreatePage } from './features/create/CreatePage';
import { RequestsPage } from './features/requests/RequestsPage';

function RequireAuth() {
  const { session, loading } = useAuth();
  const location = useLocation();
  if (loading) {
    return (
      <div className="mx-auto max-w-app p-6">
        <ListSkeleton />
      </div>
    );
  }
  if (!session) return <Navigate to="/auth" replace state={{ from: location.pathname + location.search }} />;
  return <Outlet />;
}

function NotConfigured() {
  return (
    <main className="mx-auto max-w-app p-6">
      <h1 className="text-h4 mb-4">Supabase не налаштовано</h1>
      <p className="text-p text-muted">
        Створіть файл <code>.env.local</code> за зразком <code>.env.example</code> (VITE_SUPABASE_URL і
        VITE_SUPABASE_ANON_KEY) і перезапустіть <code>npm run dev</code>.
      </p>
    </main>
  );
}

export default function App() {
  if (!isConfigured) return <NotConfigured />;
  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route index element={<SearchPage />} />
          <Route path="create" element={<CreatePage />} />
          <Route path="requests" element={<RequestsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
