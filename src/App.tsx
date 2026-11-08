import { useEffect, type ReactNode } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { useAppState } from './state/AppProvider';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { VerifyEmailPage } from './pages/auth/VerifyEmailPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { DashboardPage } from './pages/DashboardPage';
import { PosPage } from './pages/PosPage';
import { OrdersPage } from './pages/OrdersPage';
import { OrderDetailPage } from './pages/OrderDetailPage';
import { KitchenPage } from './pages/KitchenPage';
import { ProductsPage } from './pages/ProductsPage';
import { TablesPage } from './pages/TablesPage';
import { StaffPage } from './pages/StaffPage';
import { ReportsPage } from './pages/ReportsPage';
import { BillingPage } from './pages/BillingPage';
import { SettingsPage } from './pages/SettingsPage';
import { QrOrderPage } from './pages/QrOrderPage';
import { NotFoundPage } from './pages/NotFoundPage';

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname]);

  return null;
}

function PublicOnly({ children }: { children: ReactNode }) {
  const state = useAppState();
  if (state.session?.businessId) {
    return <Navigate to="/" replace />;
  }
  if (state.session && !state.session.businessId) {
    return <Navigate to="/onboarding/bisnis" replace />;
  }
  return <>{children}</>;
}

function SessionOnly({ children }: { children: ReactNode }) {
  const state = useAppState();
  if (!state.session) {
    return <Navigate to="/masuk" replace />;
  }
  if (state.session.businessId) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

function ProtectedLayout() {
  const state = useAppState();

  if (!state.session) {
    return <Navigate to="/masuk" replace />;
  }
  if (!state.session.businessId) {
    return <Navigate to="/onboarding/bisnis" replace />;
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

export function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route
          path="/masuk"
          element={
            <PublicOnly>
              <LoginPage />
            </PublicOnly>
          }
        />
        <Route
          path="/daftar"
          element={
            <PublicOnly>
              <RegisterPage />
            </PublicOnly>
          }
        />
        <Route
          path="/verifikasi-email"
          element={
            <PublicOnly>
              <VerifyEmailPage />
            </PublicOnly>
          }
        />
        <Route
          path="/onboarding/bisnis"
          element={
            <SessionOnly>
              <OnboardingPage />
            </SessionOnly>
          }
        />
        <Route path="/qr/:branchId/:tableId" element={<QrOrderPage />} />

        <Route element={<ProtectedLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/kasir" element={<PosPage />} />
          <Route path="/pesanan" element={<OrdersPage />} />
          <Route path="/pesanan/:orderId" element={<OrderDetailPage />} />
          <Route path="/dapur" element={<KitchenPage />} />
          <Route path="/menu" element={<ProductsPage />} />
          <Route path="/meja" element={<TablesPage />} />
          <Route path="/staf" element={<StaffPage />} />
          <Route path="/laporan" element={<ReportsPage />} />
          <Route path="/langganan" element={<BillingPage />} />
          <Route path="/pengaturan" element={<SettingsPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}
