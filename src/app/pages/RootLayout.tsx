import { Outlet, useLocation } from "react-router";
import { useEffect, Suspense } from "react";
import { Toaster } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";
import { AppSidebar } from "../components/AppSidebar";
import { Loader2 } from "lucide-react";

function PageLoader() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <Loader2 size={20} className="animate-spin" style={{ color: "var(--accent)" }} />
    </div>
  );
}

export function RootLayout() {
  const location = useLocation();
  const isHub = location.pathname.startsWith("/hub");
  const isProfile = location.pathname.startsWith("/profile");
  const isAdmin = location.pathname.startsWith("/admin");
  const isSubscribe = location.pathname.startsWith("/subscribe");
  const isAppView = isHub || isProfile || isAdmin || isSubscribe;

  // Only scroll to top on actual page navigation (pathname change), not on search param changes
  // Skip scroll-to-top for /hub paths to avoid disrupting Campaign Lab and other stateful views
  useEffect(() => { if (!location.hash && !isHub) window.scrollTo(0, 0); }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Toaster
        position="bottom-center"
        toastOptions={{
          style: {
            background: "var(--card)",
            color: "var(--foreground)",
            border: "1px solid var(--border)",
            fontSize: "13px",
            fontFamily: "var(--font-family)",
            fontWeight: 500,
            borderRadius: "var(--radius)",
            boxShadow: "var(--shadow-lg)",
          },
        }}
      />

      {isAppView ? (
        /* -- App view: sidebar (desktop) + bottom tab bar (mobile) -- */
        <>
          <AppSidebar />
          {/* Desktop: margin-left for sidebar. Mobile: no margin, but padding-bottom for tab bar */}
          <main className="min-h-screen md:ml-[52px] pb-[64px] md:pb-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                className="min-h-screen"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                <Suspense fallback={<PageLoader />}>
                  <Outlet />
                </Suspense>
              </motion.div>
            </AnimatePresence>
          </main>
        </>
      ) : (
        /* -- Marketing view: top navbar + content + footer -- */
        <>
          <Navbar />
          <main className="pt-16">
            <Suspense fallback={<PageLoader />}>
              <Outlet />
            </Suspense>
          </main>
          <Footer />
        </>
      )}
    </div>
  );
}
