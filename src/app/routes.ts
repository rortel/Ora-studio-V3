import { createBrowserRouter } from "react-router";
import { RootLayout } from "./pages/RootLayout";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { lazy } from "react";

// Lazy-loaded pages (code-splitting)
const HubPage = lazy(() => import("./pages/HubPage").then(m => ({ default: m.HubPage })));
const StudioPage = lazy(() => import("./pages/StudioPage").then(m => ({ default: m.StudioPage })));
const PricingPage = lazy(() => import("./pages/PricingPage").then(m => ({ default: m.PricingPage })));
const AgentsPage = lazy(() => import("./pages/AgentsPage").then(m => ({ default: m.AgentsPage })));
const VaultPage = lazy(() => import("./pages/VaultPage").then(m => ({ default: m.VaultPage })));
const AnalyticsPage = lazy(() => import("./pages/AnalyticsPage").then(m => ({ default: m.AnalyticsPage })));
const ProfilePage = lazy(() => import("./pages/ProfilePage").then(m => ({ default: m.ProfilePage })));
const AdminPage = lazy(() => import("./pages/AdminPage").then(m => ({ default: m.AdminPage })));
const SubscribePage = lazy(() => import("./pages/SubscribePage").then(m => ({ default: m.SubscribePage })));
const LibraryPage = lazy(() => import("./pages/LibraryPage").then(m => ({ default: m.LibraryPage })));
const CalendarPage = lazy(() => import("./pages/CalendarPage").then(m => ({ default: m.CalendarPage })));
const MusicPage = lazy(() => import("./pages/MusicPage").then(m => ({ default: m.MusicPage })));
const ProductsPage = lazy(() => import("./pages/ProductsPage").then(m => ({ default: m.ProductsPage })));
const VideoAssemblerPage = lazy(() => import("./pages/VideoAssemblerPage").then(m => ({ default: m.VideoAssemblerPage })));
const OnboardingPage = lazy(() => import("./pages/OnboardingPage").then(m => ({ default: m.OnboardingPage })));
const TermsPage = lazy(() => import("./pages/TermsPage").then(m => ({ default: m.TermsPage })));
const PrivacyPage = lazy(() => import("./pages/PrivacyPage").then(m => ({ default: m.PrivacyPage })));
const AboutPage = lazy(() => import("./pages/AboutPage").then(m => ({ default: m.AboutPage })));

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
      { path: "profile", Component: ProfilePage },
      { path: "subscribe", Component: SubscribePage },

      // Admin only (guard inside component)
      { path: "admin", Component: AdminPage },

      // 404
      { path: "*", Component: NotFoundPage },
    ],
  },
]);
