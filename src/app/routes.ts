import { createBrowserRouter } from "react-router";
import { RootLayout } from "./pages/RootLayout";
import { HubPage } from "./pages/HubPage";
import { StudioPage } from "./pages/StudioPage";
import { LandingPage } from "./pages/LandingPage";
import { PricingPage } from "./pages/PricingPage";
import { AgentsPage } from "./pages/AgentsPage";
import { VaultPage } from "./pages/VaultPage";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { LoginPage } from "./pages/LoginPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { ProfilePage } from "./pages/ProfilePage";
import { AdminPage } from "./pages/AdminPage";
import { SubscribePage } from "./pages/SubscribePage";
import { LibraryPage } from "./pages/LibraryPage";
import { CalendarPage } from "./pages/CalendarPage";
import { MusicPage } from "./pages/MusicPage";
import { ProductsPage } from "./pages/ProductsPage";
import { VideoAssemblerPage } from "./pages/VideoAssemblerPage";
import { TermsPage } from "./pages/TermsPage";
import { PrivacyPage } from "./pages/PrivacyPage";
import { AboutPage } from "./pages/AboutPage";

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
