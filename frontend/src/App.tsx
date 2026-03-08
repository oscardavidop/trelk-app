import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { useTelegram } from './hooks/useTelegram';
import { useEffect } from 'react';
import AppLayout from './components/AppLayout';
import DashboardHome from './pages/DashboardHome';
import CommandsHub from './pages/CommandsHub';
import SettingsHub from './pages/SettingsHub';
import ProfilePage from './pages/ProfilePage';
import HomePage from './pages/HomePage';
import SettingsPage from './pages/SettingsPage';
import AccountPage from './pages/AccountPage';
import LangPage from './pages/LangPage';
import TimezonePage from './pages/TimezonePage';
import CommandsPage from './pages/CommandsPage';
import CommandDetailPage from './pages/CommandDetailPage';
import PremiumCommandsPage from './pages/PremiumCommandsPage';
import AuthExpiredPage from './pages/AuthExpiredPage';
import TrelkEntry from './pages/TrelkEntry';
import ThemePage from './pages/ThemePage';
import SubscriptionPage from './pages/SubscriptionPage';
import FavoritesPage from './pages/FavoritesPage';
import InspirationPage from './pages/InspirationPage';
import PaymentsPage from './pages/PaymentsPage';
import Toast from './components/Toast';
import { useThemeStore } from './stores/theme';
import CountryPage from './pages/CountryPage';
import ScrollToTop from './components/ScrollToTop';

function App() {
  const { isAuthenticated, isLoading, authError, authenticate } = useAuth();
  const { webApp } = useTelegram();
  const initTheme = useThemeStore((s) => s.init);

  useEffect(() => {
    initTheme();
  }, [initTheme]);

  useEffect(() => {
    if (webApp) {
      webApp.ready();
      webApp.MainButton.setParams({ color: '#248BDA' });
      webApp.disableVerticalSwipes();

      if (['android', 'ios'].includes(webApp.platform)) {
        document.body.classList.add('mobile', `platform-${webApp.platform}`);
        webApp.requestFullscreen();
      }

      authenticate();
    } else {
      // Not inside Telegram — try authenticate anyway (initData check will handle it)
      console.warn('[App] No Telegram WebApp object found');
      authenticate();
    }
  }, [webApp, authenticate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-tg-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }


  if (!isAuthenticated) {
    return <AuthExpiredPage />;
  }

  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/trelk" element={<TrelkEntry />} />
        <Route element={<AppLayout />}>
          {/* ── 4 Main Tabs (Bottom Nav) ── */}
          <Route path="/users/ui/:userId" element={<DashboardHome />} />
          <Route path="/users/ui/:userId/hub" element={<CommandsHub />} />
          <Route path="/users/ui/:userId/settings-hub" element={<SettingsHub />} />
          <Route path="/users/ui/:userId/profile-tab" element={<ProfilePage />} />

          {/* ── Sub-pages (existing, no bottom nav) ── */}
          <Route path="/users/ui/:userId/settings" element={<SettingsPage />} />
          <Route path="/users/ui/:userId/profile" element={<AccountPage />} />
          <Route path="/users/ui/:userId/set/lang" element={<LangPage />} />
          <Route path="/users/ui/:userId/set/timezone" element={<TimezonePage />} />
          <Route path="/users/ui/:userId/set/country" element={<CountryPage />} />
          <Route path="/users/ui/:userId/commands" element={<CommandsPage />} />
          <Route path="/users/ui/:userId/commands/:command" element={<CommandDetailPage />} />
          <Route path="/users/ui/:userId/premium" element={<PremiumCommandsPage />} />
          <Route path="/users/ui/:userId/set/theme" element={<ThemePage />} />
          <Route path="/users/ui/:userId/subscription" element={<SubscriptionPage />} />
          <Route path="/users/ui/:userId/favorites" element={<FavoritesPage />} />
          <Route path="/users/ui/:userId/payments" element={<PaymentsPage />} />
        </Route>
        <Route path="/users/ui/:userId/favorites/inspiration" element={<InspirationPage />} />
        <Route path="/auth" element={<AuthExpiredPage />} />
        <Route path="*" element={<Navigate to="/auth" replace />} />
      </Routes>
      <Toast />
    </>
  );
}

export default App;
