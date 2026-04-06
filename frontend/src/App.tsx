import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useAuth } from './hooks/useAuth';
import { useTelegram } from './hooks/useTelegram';
import AppLayout from './components/AppLayout';
import Toast from './components/Toast';
import UndoToast from './components/UndoToast';
import ErrorBoundary from './components/ErrorBoundary';
import OnboardingOverlay, { useOnboarding } from './components/onboarding/OnboardingOverlay';
import PinLockScreen from './components/security/PinLockScreen';
import OfflineBanner from './components/offline/OfflineBanner';
import { usePinGate } from './hooks/usePinGate';
import { useDeepLink } from './hooks/useDeepLink';
import { useAutoLock } from './hooks/useAutoLock';
import { initOfflineListeners } from './lib/offline';
import { useThemeStore } from './stores/theme';
import { useUserStore } from './stores';
import ScrollToTop from './components/ScrollToTop';

/* ── Lazy-loaded pages ── */
const DashboardHome = lazy(() => import('./pages/DashboardHome'));
const CommandsHub = lazy(() => import('./pages/CommandsHub'));
const SettingsHub = lazy(() => import('./pages/SettingsHub'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const AccountPage = lazy(() => import('./pages/AccountPage'));
const LangPage = lazy(() => import('./pages/LangPage'));
const TimezonePage = lazy(() => import('./pages/TimezonePage'));
const CountryPage = lazy(() => import('./pages/CountryPage'));
const CommandsPage = lazy(() => import('./pages/commands/CommandsPage'));
const CommandConfigPage = lazy(() => import('./pages/commands/CommandConfigPage'));
const PremiumCommandsPage = lazy(() => import('./pages/PremiumCommandsPage'));
const ThemePage = lazy(() => import('./pages/ThemePage'));
const SubscriptionPage = lazy(() => import('./pages/SubscriptionPage'));
const FavoritesPage = lazy(() => import('./pages/FavoritesPage'));
const InspirationPage = lazy(() => import('./pages/InspirationPage'));
const PaymentsPage = lazy(() => import('./pages/PaymentsPage'));
const BotCommandsPage = lazy(() => import('./pages/BotCommandsPage'));
const CommandListPage = lazy(() => import('./pages/CommandListPage'));
const BotCommandDetailPage = lazy(() => import('./pages/BotCommandDetailPage'));
const CommandReviewsPage = lazy(() => import('./pages/CommandReviewsPage'));
const AchievementsPage = lazy(() => import('./pages/AchievementsPage'));
const DiscoverPage = lazy(() => import('./pages/DiscoverPage'));
const ActivityPage = lazy(() => import('./pages/ActivityPage'));
const CommandFavoritesPage = lazy(() => import('./pages/CommandFavoritesPage'));
const LabsPage = lazy(() => import('./pages/SuggestionsPage'));
const SuggestionDetailPage = lazy(() => import('./pages/SuggestionDetailPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const MyReportsPage = lazy(() => import('./pages/MyReportsPage'));
const AuthExpiredPage = lazy(() => import('./pages/AuthExpiredPage'));
const TrelkEntry = lazy(() => import('./pages/TrelkEntry'));
const CommandChangelogPage = lazy(() => import('./pages/CommandChangelogPage'));
const AlertsPage = lazy(() => import('./pages/AlertsPage'));
const PinSettingsPage = lazy(() => import('./pages/PinSettingsPage'));
const SessionsPage = lazy(() => import('./pages/SessionsPage'));

// import DashboardHome from './pages/DashboardHome';
// import CommandsHub from './pages/CommandsHub';
// import SettingsHub from './pages/SettingsHub';
// import ProfilePage from './pages/ProfilePage';
// import SettingsPage from './pages/SettingsPage';
// import AccountPage from './pages/AccountPage';
// import LangPage from './pages/LangPage';
// import TimezonePage from './pages/TimezonePage';
// import CountryPage from './pages/CountryPage';
// import CommandsPage from './pages/commands/CommandsPage';
// import CommandConfigPage from './pages/commands/CommandConfigPage';
// import PremiumCommandsPage from './pages/PremiumCommandsPage';
// import ThemePage from './pages/ThemePage';
// import SubscriptionPage from './pages/SubscriptionPage';
// import FavoritesPage from './pages/FavoritesPage';
// import InspirationPage from './pages/InspirationPage';
// import PaymentsPage from './pages/PaymentsPage';
// import BotCommandsPage from './pages/BotCommandsPage';
// import CommandListPage from './pages/CommandListPage';
// import BotCommandDetailPage from './pages/BotCommandDetailPage';
// import CommandReviewsPage from './pages/CommandReviewsPage';
// import CommandChangelogPage from './pages/CommandChangelogPage';
// import AchievementsPage from './pages/AchievementsPage';
// import DiscoverPage from './pages/DiscoverPage';
// import ActivityPage from './pages/ActivityPage';
// import CommandFavoritesPage from './pages/CommandFavoritesPage';
// import LabsPage from './pages/SuggestionsPage';
// import SuggestionDetailPage from './pages/SuggestionDetailPage';
// import NotificationsPage from './pages/NotificationsPage';
// import MyReportsPage from './pages/MyReportsPage';
// import AlertsPage from './pages/AlertsPage';
// import PinSettingsPage from './pages/PinSettingsPage';
// import SessionsPage from './pages/SessionsPage';
// import AuthExpiredPage from './pages/AuthExpiredPage';
// import TrelkEntry from './pages/TrelkEntry';


function App() {
  const { isAuthenticated, isLoading, authError, authenticate } = useAuth();
  const { webApp } = useTelegram();
  const navigate = useNavigate();
  const initTheme = useThemeStore((s) => s.init);
  const user = useUserStore((s) => s.user);
  const { showOnboarding, completeOnboarding } = useOnboarding();
  const { needsPin, checking: pinChecking } = usePinGate(isAuthenticated);
  useDeepLink();
  useAutoLock();

  useEffect(() => {
    initTheme();
  }, [initTheme]);

  // Initialize offline detection and auto-sync
  useEffect(() => {
    const cleanup = initOfflineListeners();
    return cleanup;
  }, []);

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
      <div className="min-h-screen bg-tg-bg animate-pulse">
        {/* Hero skeleton */}
        <div className="px-4 pt-8 pb-3 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-tg-text/[0.06]" />
          <div className="flex-1 space-y-2">
            <div className="h-6 w-36 bg-tg-text/[0.06] rounded-lg" />
            <div className="h-4 w-24 bg-tg-text/[0.04] rounded" />
          </div>
        </div>
        {/* Stats card skeleton */}
        <div className="px-4 mt-3">
          <div className="h-20 rounded-[20px] bg-tg-text/[0.04]" />
        </div>
        {/* XP bar skeleton */}
        <div className="px-6 mt-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-[12px] bg-tg-text/[0.06]" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-20 bg-tg-text/[0.05] rounded" />
            <div className="h-1.5 w-full bg-tg-text/[0.04] rounded-full" />
          </div>
        </div>
        {/* Quick access grid skeleton */}
        <div className="px-4 mt-8 grid grid-cols-4 gap-2.5">
          {[1,2,3,4].map((i) => (
            <div key={i} className="flex flex-col items-center gap-2 py-3.5">
              <div className="w-11 h-11 rounded-[14px] bg-tg-text/[0.06]" />
              <div className="h-3 w-10 bg-tg-text/[0.04] rounded" />
            </div>
          ))}
        </div>
        {/* Content skeletons */}
        <div className="px-4 mt-6 space-y-3">
          <div className="h-4 w-24 bg-tg-text/[0.05] rounded" />
          <div className="flex gap-3 overflow-hidden">
            {[1,2,3].map((i) => (
              <div key={i} className="w-28 h-16 rounded-[14px] bg-tg-text/[0.04] shrink-0" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated && authError) {
    return (
      <Suspense fallback={null}>
        <AuthExpiredPage />
      </Suspense>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-tg-bg animate-pulse">
        <div className="px-4 pt-8 pb-3 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-tg-text/[0.06]" />
          <div className="flex-1 space-y-2">
            <div className="h-6 w-36 bg-tg-text/[0.06] rounded-lg" />
            <div className="h-4 w-24 bg-tg-text/[0.04] rounded" />
          </div>
        </div>
      </div>
    );
  }

  // PIN security gate — blocks all routes until PIN is verified
  if (needsPin) {
    return <PinLockScreen />;
  }

  return (
    <ErrorBoundary>
      <ScrollToTop />
      <OfflineBanner />

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
          <Route path="/users/ui/:userId/alerts" element={<AlertsPage />} />
          <Route path="/users/ui/:userId/pin-settings" element={<PinSettingsPage />} />
          <Route path="/users/ui/:userId/sessions" element={<SessionsPage />} />
        </Route>
        <Route path="/users/ui/:userId/favorites/inspiration" element={<InspirationPage />} />
        <Route path="/auth" element={<AuthExpiredPage />} />
        <Route path="*" element={
          user?.id
            ? <Navigate to={`/users/ui/${user.id}`} replace />
            : <Navigate to="/auth" replace />
        } />
      </Routes>

      <UndoToast />
      <Toast />
    </ErrorBoundary>
  );
}

export default App;
