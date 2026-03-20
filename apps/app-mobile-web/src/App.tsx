import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { AuthLandingPage } from './pages/AuthLandingPage';
import { GoogleAuthCallbackPage } from './pages/GoogleAuthCallbackPage';
import { LoginPage } from './pages/LoginPage';
import { MainPage } from './pages/MainPage';
import { RegisterPage } from './pages/RegisterPage';
import { useAuthStore } from './stores/auth';
import { useUiStore } from './stores/ui';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

function AuthGuard({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function GuestGuard({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  if (user) return <Navigate to="/app" replace />;
  return <>{children}</>;
}

function ThemeSync() {
  const theme = useUiStore((s) => s.theme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem('taska-theme', theme);
  }, [theme]);

  return null;
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeSync />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/auth" element={<AuthLandingPage />} />
          <Route path="/login" element={<GuestGuard><LoginPage /></GuestGuard>} />
          <Route path="/register" element={<GuestGuard><RegisterPage /></GuestGuard>} />
          <Route path="/oauth/google/callback" element={<GuestGuard><GoogleAuthCallbackPage /></GuestGuard>} />
          <Route path="/app" element={<AuthGuard><MainPage /></AuthGuard>} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
