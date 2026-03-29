import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useAuth } from './hooks/useAuth';
import { useTelegram } from './hooks/useTelegram';
import AppLayout from './components/AppLayout';
import Toast from './components/Toast';
import GlobalErrorToast from './components/GlobalErrorToast';
import ErrorBoundary from './components/ErrorBoundary';
import OnboardingOverlay, { useOnboarding } from './components/onboarding/OnboardingOverlay';
import { useThemeStore } from './stores/theme';
import ScrollToTop from './components/ScrollToTop';

/* ── Lazy-loaded pages ── */
// const DashboardHome = lazy(() => import('./pages/DashboardHome'));
// const CommandsHub = lazy(() => import('./pages/CommandsHub'));
// const SettingsHub = lazy(() => import('./pages/SettingsHub'));
// const ProfilePage = lazy(() => import('./pages/ProfilePage'));
// const SettingsPage = lazy(() => import('./pages/SettingsPage'));
// const AccountPage = lazy(() => import('./pages/AccountPage'));
// const LangPage = lazy(() => import('./pages/LangPage'));
// const TimezonePage = lazy(() => import('./pages/TimezonePage'));
// const CountryPage = lazy(() => import('./pages/CountryPage'));
// const CommandsPage = lazy(() => import('./pages/commands/CommandsPage'));
// const CommandConfigPage = lazy(() => import('./pages/commands/CommandConfigPage'));
// const PremiumCommandsPage = lazy(() => import('./pages/PremiumCommandsPage'));
// const ThemePage = lazy(() => import('./pages/ThemePage'));
// const SubscriptionPage = lazy(() => import('./pages/SubscriptionPage'));
// const FavoritesPage = lazy(() => import('./pages/FavoritesPage'));
// const InspirationPage = lazy(() => import('./pages/InspirationPage'));
// const PaymentsPage = lazy(() => import('./pages/PaymentsPage'));
// const BotCommandsPage = lazy(() => import('./pages/BotCommandsPage'));
// const CommandListPage = lazy(() => import('./pages/CommandListPage'));
// const BotCommandDetailPage = lazy(() => import('./pages/BotCommandDetailPage'));
// const CommandReviewsPage = lazy(() => import('./pages/CommandReviewsPage'));
// const AchievementsPage = lazy(() => import('./pages/AchievementsPage'));
// const DiscoverPage = lazy(() => import('./pages/DiscoverPage'));
// const ActivityPage = lazy(() => import('./pages/ActivityPage'));
// const CommandFavoritesPage = lazy(() => import('./pages/CommandFavoritesPage'));
// const LabsPage = lazy(() => import('./pages/SuggestionsPage'));
// const SuggestionDetailPage = lazy(() => import('./pages/SuggestionDetailPage'));
// const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
// const MyReportsPage = lazy(() => import('./pages/MyReportsPage'));
// const AuthExpiredPage = lazy(() => import('./pages/AuthExpiredPage'));
// const TrelkEntry = lazy(() => import('./pages/TrelkEntry'));
// const HomePage = lazy(() => import('./pages/HomePage'));

import DashboardHome from './pages/DashboardHome';
import CommandsHub from './pages/CommandsHub';
import SettingsHub from './pages/SettingsHub';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import AccountPage from './pages/AccountPage';
import LangPage from './pages/LangPage';
import TimezonePage from './pages/TimezonePage';
import CountryPage from './pages/CountryPage';
import CommandsPage from './pages/commands/CommandsPage';
import CommandConfigPage from './pages/commands/CommandConfigPage';
import PremiumCommandsPage from './pages/PremiumCommandsPage';
import ThemePage from './pages/ThemePage';
import SubscriptionPage from './pages/SubscriptionPage';
import FavoritesPage from './pages/FavoritesPage';
import InspirationPage from './pages/InspirationPage';
import PaymentsPage from './pages/PaymentsPage';
import BotCommandsPage from './pages/BotCommandsPage';
import CommandListPage from './pages/CommandListPage';
import BotCommandDetailPage from './pages/BotCommandDetailPage';
import CommandReviewsPage from './pages/CommandReviewsPage';
import CommandChangelogPage from './pages/CommandChangelogPage';
import AchievementsPage from './pages/AchievementsPage';
import DiscoverPage from './pages/DiscoverPage';
import ActivityPage from './pages/ActivityPage';
import CommandFavoritesPage from './pages/CommandFavoritesPage';
import LabsPage from './pages/SuggestionsPage';
import SuggestionDetailPage from './pages/SuggestionDetailPage';
import NotificationsPage from './pages/NotificationsPage';
import MyReportsPage from './pages/MyReportsPage';
import AuthExpiredPage from './pages/AuthExpiredPage';
import TrelkEntry from './pages/TrelkEntry';
import HomePage from './pages/HomePage';


function App() {
  const { isAuthenticated, isLoading, authError, authenticate } = useAuth();
  const { webApp } = useTelegram();
  const navigate = useNavigate();
  const initTheme = useThemeStore((s) => s.init);
  const { showOnboarding, completeOnboarding } = useOnboarding();

  useEffect(() => {
    initTheme();
  }, [initTheme]);

  const handleBack = () => navigate(-1);
  useEffect(() => {
    if (webApp) {
      webApp.ready();
      webApp.MainButton.setParams({ color: '#248BDA' });
      webApp.disableVerticalSwipes();
      webApp.expand();
      // NOTE: Back button handling is done in useBackButton hook (AppLayout).
      // Do NOT register a duplicate backButtonClicked handler here.
      try {
        webApp.setHeaderColor('bg_color');
        webApp.setBackgroundColor('bg_color');
      } catch { /* older clients */ }

      if (['android', 'ios'].includes(webApp.platform)) {
        document.body.classList.add('mobile', `platform-${webApp.platform}`);
        webApp.requestFullscreen();
      }

      authenticate();
    } else {
      console.warn('[App] No Telegram WebApp object found');
      authenticate();
    }
    return () => {
      // cleanup not needed — useBackButton handles it
    };
  }, [webApp, authenticate]);



  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="space-y-3 w-full max-w-[200px]">
          <div className="h-12 w-12 mx-auto rounded-full bg-tg-accent/20 animate-pulse" />
          <div className="h-3 w-full bg-tg-text/[0.05] rounded animate-pulse" />
          <div className="h-3 w-2/3 mx-auto bg-tg-text/[0.04] rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Suspense fallback={null}>
        <AuthExpiredPage />
      </Suspense>
    );
  }

  return (
    <ErrorBoundary>
      <ScrollToTop />

      <AnimatePresence>
        {showOnboarding && <OnboardingOverlay onComplete={completeOnboarding} />}
      </AnimatePresence>

      <Routes>
        <Route path="/trelk" element={<TrelkEntry />} />
        <Route element={<AppLayout />}>
          {/* ── 4 Main Tabs (Bottom Nav) ── */}
          <Route path="/users/ui/:userId" element={<DashboardHome />} />
          <Route path="/users/ui/:userId/hub" element={<CommandsHub />} />
          <Route path="/users/ui/:userId/settings-hub" element={<SettingsHub />} />
          <Route path="/users/ui/:userId/profile-tab" element={<ProfilePage />} />

          {/* ── Sub-pages ── */}
          <Route path="/users/ui/:userId/settings" element={<SettingsPage />} />
          <Route path="/users/ui/:userId/profile" element={<AccountPage />} />
          <Route path="/users/ui/:userId/set/lang" element={<LangPage />} />
          <Route path="/users/ui/:userId/set/timezone" element={<TimezonePage />} />
          <Route path="/users/ui/:userId/set/country" element={<CountryPage />} />
          <Route path="/users/ui/:userId/commands" element={<CommandsPage />} />
          <Route path="/users/ui/:userId/commands/:command" element={<CommandConfigPage />} />
          <Route path="/users/ui/:userId/premium" element={<PremiumCommandsPage />} />
          <Route path="/users/ui/:userId/set/theme" element={<ThemePage />} />
          <Route path="/users/ui/:userId/subscription" element={<SubscriptionPage />} />
          <Route path="/users/ui/:userId/favorites" element={<FavoritesPage />} />
          <Route path="/users/ui/:userId/payments" element={<PaymentsPage />} />
          <Route path="/users/ui/:userId/bot-commands" element={<BotCommandsPage />} />
          <Route path="/users/ui/:userId/bot-commands/list" element={<CommandListPage />} />
          <Route path="/users/ui/:userId/bot-commands/:command/reviews" element={<CommandReviewsPage />} />
          <Route path="/users/ui/:userId/bot-commands/:command/changelog" element={<CommandChangelogPage />} />
          <Route path="/users/ui/:userId/bot-commands/:command" element={<BotCommandDetailPage />} />
          <Route path="/users/ui/:userId/achievements" element={<AchievementsPage />} />
          <Route path="/users/ui/:userId/discover" element={<DiscoverPage />} />
          <Route path="/users/ui/:userId/activity" element={<ActivityPage />} />
          <Route path="/users/ui/:userId/command-favorites" element={<CommandFavoritesPage />} />
          <Route path="/users/ui/:userId/labs" element={<LabsPage />} />
          <Route path="/users/ui/:userId/labs/:id" element={<SuggestionDetailPage />} />
          <Route path="/users/ui/:userId/notifications" element={<NotificationsPage />} />
          <Route path="/users/ui/:userId/my-reports" element={<MyReportsPage />} />
        </Route>
        <Route path="/users/ui/:userId/favorites/inspiration" element={<InspirationPage />} />
        <Route path="/auth" element={<AuthExpiredPage />} />
        <Route path="*" element={<Navigate to="/auth" replace />} />
      </Routes>

      <Toast />
      <GlobalErrorToast />
    </ErrorBoundary>
  );
}

export default App;
