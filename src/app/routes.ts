import { createBrowserRouter, Navigate } from "react-router";
import { RootLayout } from "./pages/RootLayout";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { createElement, lazy } from "react";

/**
 * Retry wrapper for lazy imports — handles stale chunk hashes after deploy.
 * If a dynamic import fails (old hash), reload the page once to get fresh assets.
 *
 * Resolution order: named export `pick` first, then `default`. The fallback is
 * the safety net — without it, a page exported only as default (instead of
 * the named-export convention used here) resolves to undefined, and React
 * throws #306 from createFiberFromTypeAndProps (REACT_LAZY_TYPE) with an
 * impossible-to-decode args=[undefined, ""].
 */
function lazyRetry<T extends Record<string, any>>(
  factory: () => Promise<T>,
  pick: keyof T,
) {
  return lazy(() =>
    factory()
      .then((m) => {
        const Component = (m[pick] ?? (m as any).default) as React.ComponentType;
        if (!Component) {
          throw new Error(
            `lazyRetry: module has neither "${String(pick)}" nor default export`,
          );
        }
        return { default: Component };
      })
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
const PricingPage = lazyRetry(() => import("./pages/PricingPage"), "PricingPage");
const VaultPage = lazyRetry(() => import("./pages/VaultPage"), "VaultPage");
const ProfilePage = lazyRetry(() => import("./pages/ProfilePage"), "ProfilePage");
const AdminPage = lazyRetry(() => import("./pages/AdminPage"), "AdminPage");
const SubscribePage = lazyRetry(() => import("./pages/SubscribePage"), "SubscribePage");
const LibraryPage = lazyRetry(() => import("./pages/LibraryPage"), "LibraryPage");
const OnboardingPage = lazyRetry(() => import("./pages/OnboardingPage"), "OnboardingPage");
const TermsPage = lazyRetry(() => import("./pages/TermsPage"), "TermsPage");
const PrivacyPage = lazyRetry(() => import("./pages/PrivacyPage"), "PrivacyPage");
const LegalNoticesPage = lazyRetry(() => import("./pages/LegalNoticesPage"), "LegalNoticesPage");
const SubprocessorsPage = lazyRetry(() => import("./pages/SubprocessorsPage"), "SubprocessorsPage");
const AboutPage = lazyRetry(() => import("./pages/AboutPage"), "AboutPage");
const EditorPage = lazyRetry(() => import("./pages/EditorPage"), "EditorPage");
const SurprisePage = lazyRetry(() => import("./pages/SurprisePage"), "SurprisePage");


/*
  ROUTE ACCESS MATRIX
  ---------------------------------------------------
  Route                 | Public | Free | Pro | Business | Admin
  ---------------------------------------------------
  /                     |   x    |  x   |  x  |    x     |   x
  /pricing              |   x    |  x   |  x  |    x     |   x
  /about                |   x    |  x   |  x  |    x     |   x
  /terms                |   x    |  x   |  x  |    x     |   x
  /privacy              |   x    |  x   |  x  |    x     |   x
  /login                |   x    |  -   |  -  |    -     |   -
  /hub/surprise         |   -    |  x   |  x  |    x     |   x
  /hub/library          |   -    |  x   |  x  |    x     |   x
  /hub/vault            |   -    |  x   |  x  |    x     |   x
  /hub/editor           |   -    |  x   |  x  |    x     |   x
  /onboarding           |   -    |  x   |  x  |    x     |   x
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
      { path: "login", Component: LoginPage },
      { path: "terms", Component: TermsPage },
      { path: "privacy", Component: PrivacyPage },
      { path: "legal-notices", Component: LegalNoticesPage },
      { path: "subprocessors", Component: SubprocessorsPage },
      { path: "about", Component: AboutPage },

      // Authenticated routes (guard inside component)
      { path: "onboarding", Component: OnboardingPage },
      // /hub is just an alias for the home of the in-app experience: Surprise Me.
      {
        path: "hub",
        Component: () => createElement(Navigate, { to: "/hub/surprise", replace: true }),
      },
      { path: "hub/library", Component: LibraryPage },
      { path: "hub/vault", Component: VaultPage },
      { path: "hub/editor", Component: EditorPage },
      { path: "hub/surprise", Component: SurprisePage },
      { path: "profile", Component: ProfilePage },
      { path: "subscribe", Component: SubscribePage },

      // Admin only (guard inside component)
      { path: "admin", Component: AdminPage },

      // 404
      { path: "*", Component: NotFoundPage },
    ],
  },
]);
