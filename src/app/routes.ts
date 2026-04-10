import { createBrowserRouter } from "react-router";
import { RootLayout } from "./pages/RootLayout";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { lazy } from "react";

/**
 * Retry wrapper for lazy imports — handles stale chunk hashes after deploy.
 * If a dynamic import fails (old hash), reload the page once to get fresh assets.
 */
function lazyRetry<T extends Record<string, any>>(
  factory: () => Promise<T>,
  pick: keyof T,
) {
  return lazy(() =>
    factory()
      .then((m) => ({ default: m[pick] as React.ComponentType }))
      .catch((err: Error) => {
        // Only auto-reload once to avoid infinite loops
        const key = "chunk-reload";
        const lastReload = sessionStorage.getItem(key);
        const now = Date.now();
        if (!lastReload || now - Number(lastReload) > 10_000) {
          sessionStorage.setItem(key, String(now));
          window.location.reload();
        }
        throw err;
      }),
  );
}

// Lazy-loaded pages (code-splitting with auto-retry on stale chunks)
const HubPage = lazyRetry(() => import("./pages/HubPage"), "HubPage");
const StudioPage = lazyRetry(() => import("./pages/StudioPage"), "StudioPage");
const PricingPage = lazyRetry(() => import("./pages/PricingPage"), "PricingPage");
const AgentsPage = lazyRetry(() => import("./pages/AgentsPage"), "AgentsPage");
const VaultPage = lazyRetry(() => import("./pages/VaultPage"), "VaultPage");
const AnalyticsPage = lazyRetry(() => import("./pages/AnalyticsPage"), "AnalyticsPage");
const ProfilePage = lazyRetry(() => import("./pages/ProfilePage"), "ProfilePage");
const AdminPage = lazyRetry(() => import("./pages/AdminPage"), "AdminPage");
const SubscribePage = lazyRetry(() => import("./pages/SubscribePage"), "SubscribePage");
const LibraryPage = lazyRetry(() => import("./pages/LibraryPage"), "LibraryPage");
const CalendarPage = lazyRetry(() => import("./pages/CalendarPage"), "CalendarPage");
const MusicPage = lazyRetry(() => import("./pages/MusicPage"), "MusicPage");
const ProductsPage = lazyRetry(() => import("./pages/ProductsPage"), "ProductsPage");
const VideoAssemblerPage = lazyRetry(() => import("./pages/VideoAssemblerPage"), "VideoAssemblerPage");
const ComparePage = lazyRetry(() => import("./pages/ComparePage"), "ComparePage");
const OnboardingPage = lazyRetry(() => import("./pages/OnboardingPage"), "OnboardingPage");
const TermsPage = lazyRetry(() => import("./pages/TermsPage"), "TermsPage");
const PrivacyPage = lazyRetry(() => import("./pages/PrivacyPage"), "PrivacyPage");
const AboutPage = lazyRetry(() => import("./pages/AboutPage"), "AboutPage");


/*
  ROUTE ACCESS MATRIX
  ---------------------------------------------------
  Route                 | Public | Free | Pro | Business | Admin
  ---------------------------------------------------
  /                     |   x    |  x   |  x  |    x     |   x
  /pricing              |   x    |  x   |  x  |    x     |   x
  /models               |   x    |  x   |  x  |    x     |   x
  /login                |   x    |  -   |  -  |    -     |   -
  /hub                  |   -    |  x   |  x  |    x     |   x
  /hub/library          |   -    |  x   |  x  |    x     |   x
  /hub/vault            |   -    |  x   |  x  |    x     |   x
  /hub/analytics        |   -    |  -   |  -  |    x     |   x
  /hub/calendar         |   -    |  -   |  -  |    x     |   x
  /hub/music            |   -    |  -   |  -  |    x     |   x
  /profile              |   -    |  x   |  x  |    x     |   x
  /subscribe            |   -    |  x   |  x  |    x     |   x
  /admin                |   -    |  -   |  -  |    -     |   x
  ---------------------------------------------------
  
  Route guards are applied INSIDE each page component
  using <RouteGuard> wrapper -- not at router level.
  This keeps the router config simple and lets guards
  show upgrade prompts instead of redirecting.
*/

export const router = createBrowserRouter([
  {
    path: "/",
    Component: RootLayout,
    children: [
      // Public routes
      { index: true, Component: LandingPage },
      { path: "pricing", Component: PricingPage },
      { path: "models", Component: AgentsPage },
      { path: "agents", Component: AgentsPage },
      { path: "login", Component: LoginPage },
      { path: "terms", Component: TermsPage },
      { path: "privacy", Component: PrivacyPage },
      { path: "about", Component: AboutPage },

      // Authenticated routes (guard inside component)
      { path: "onboarding", Component: OnboardingPage },
      { path: "hub", Component: StudioPage },
      { path: "hub/classic", Component: HubPage },
      { path: "hub/library", Component: LibraryPage },
      { path: "hub/vault", Component: VaultPage },
      { path: "hub/vault/products", Component: ProductsPage },
      { path: "hub/analytics", Component: AnalyticsPage },
      { path: "hub/calendar", Component: CalendarPage },
      { path: "hub/music", Component: MusicPage },
      { path: "hub/video-editor", Component: VideoAssemblerPage },
      { path: "hub/compare", Component: ComparePage },
      { path: "profile", Component: ProfilePage },
      { path: "subscribe", Component: SubscribePage },

      // Admin only (guard inside component)
      { path: "admin", Component: AdminPage },

      // 404
      { path: "*", Component: NotFoundPage },
    ],
  },
]);
